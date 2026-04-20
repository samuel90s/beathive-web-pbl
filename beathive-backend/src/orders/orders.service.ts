// src/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EarningsService } from '../earnings/earnings.service';

// Midtrans tidak punya tipe resmi, pakai require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

export interface CreateOrderDto {
  items: {
    soundEffectId: string;
    licenseType: 'personal' | 'commercial';
  }[];
}

@Injectable()
export class OrdersService {
  private snap: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private earnings: EarningsService,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: config.get('MIDTRANS_SERVER_KEY'),
      clientKey: config.get('MIDTRANS_CLIENT_KEY'),
    });
  }

  // ─── Buat order baru + Midtrans Snap token ──────────────

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Ambil data semua sound yang dipesan
    const sounds = await this.prisma.soundEffect.findMany({
      where: {
        id: { in: dto.items.map((i) => i.soundEffectId) },
        isPublished: true,
      },
    });

    if (sounds.length !== dto.items.length) {
      throw new NotFoundException('Satu atau lebih sound effect tidak ditemukan');
    }

    // 2. Cek apakah user sudah pernah beli item yang sama
    const existingPurchases = await this.prisma.orderItem.findMany({
      where: {
        soundEffectId: { in: dto.items.map((i) => i.soundEffectId) },
        order: { userId, status: 'PAID' },
      },
    });

    if (existingPurchases.length > 0) {
      throw new BadRequestException(
        'Kamu sudah pernah membeli beberapa sound effect ini',
      );
    }

    // 3. Hitung total (harga lisensi commercial = 2x personal)
    const itemsWithPrice = dto.items.map((item) => {
      const sound = sounds.find((s) => s.id === item.soundEffectId)!;
      const price =
        item.licenseType === 'commercial'
          ? sound.price * 2
          : sound.price;
      return { ...item, sound, price };
    });

    const totalAmount = itemsWithPrice.reduce((sum, i) => sum + i.price, 0);

    if (totalAmount === 0) {
      throw new BadRequestException('Semua item gratis — tidak perlu checkout');
    }

    // 4. Ambil data user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // 5. Buat order di database
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PENDING',
          items: {
            create: itemsWithPrice.map((item) => ({
              soundEffectId: item.soundEffectId,
              priceSnapshot: item.price,
              licenseType: item.licenseType,
            })),
          },
        },
        include: { items: true },
      });
      return newOrder;
    });

    // 6. Buat Midtrans Snap token
    const snapToken = await this.createMidtransToken(order, user!, itemsWithPrice);

    // Simpan gateway order ID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { gatewayOrderId: order.id }, // Midtrans pakai order_id kita
    });

    return {
      orderId: order.id,
      totalAmount,
      snapToken,    // kirim ke frontend untuk buka Midtrans popup
      items: itemsWithPrice.map((i) => ({
        title: i.sound.title,
        price: i.price,
        licenseType: i.licenseType,
      })),
    };
  }

  // ─── Ambil riwayat order user ───────────────────────────

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { soundEffect: true },
        },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Verify payment & aktifkan order ────────────────────
  // Dipanggil frontend di onSuccess sebagai backup dari webhook

  async verifyAndActivateOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { gatewayOrderId: orderId, userId },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.status === 'PAID') return { activated: true, alreadyActive: true };

    // Cek status ke Midtrans
    const coreApi = new midtransClient.CoreApi({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.get('MIDTRANS_SERVER_KEY'),
    });

    let midtransStatus: string;
    try {
      const result = await coreApi.transaction.status(orderId);
      midtransStatus = result.transaction_status;
    } catch {
      throw new BadRequestException('Gagal verifikasi status ke Midtrans');
    }

    const isPaid = midtransStatus === 'settlement' || midtransStatus === 'capture';
    if (!isPaid) {
      throw new BadRequestException(`Pembayaran belum selesai (status: ${midtransStatus})`);
    }

    // Aktifkan via webhook service logic — update order jadi PAID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // Record purchase earnings (idempotent — safe to call even if webhook already fired)
    this.earnings.recordOrderEarnings(order.id).catch(() => {});

    return { activated: true };
  }

  // ─── Buat Midtrans Snap token ───────────────────────────

  private async createMidtransToken(order: any, user: any, items: any[]) {
    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalAmount,
      },
      item_details: items.map((item) => ({
        id: item.soundEffectId,
        price: item.price,
        quantity: 1,
        name: `${item.sound.title} (${item.licenseType})`.slice(0, 50),
      })),
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      callbacks: {
        finish: `${this.config.get('FRONTEND_URL')}/orders/${order.id}/success`,
      },
    };

    const transaction = await this.snap.createTransaction(parameter);
    return transaction.token;
  }
}
