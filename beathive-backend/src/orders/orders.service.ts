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

    const nonPurchaseSounds = sounds.filter(s => s.accessLevel !== 'PURCHASE');
    if (nonPurchaseSounds.length > 0) {
      throw new BadRequestException('Hanya sound effect berlabel "Purchase" yang dapat dibeli');
    }

    // 2. Hitung total (harga lisensi commercial = 2x personal)
    const itemsWithPrice = dto.items.map((item) => {
      const sound = sounds.find((s) => s.id === item.soundEffectId)!;
      const price =
        item.licenseType === 'commercial'
          ? sound.price * 2
          : sound.price;
      return { ...item, sound, price };
    });

    const subtotal = itemsWithPrice.reduce((sum, i) => sum + i.price, 0);
    const SERVICE_FEE_PERCENT = 5;
    const TAX_PERCENT = 11;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT / 100);
    const tax = Math.round((subtotal + serviceFee) * TAX_PERCENT / 100);
    const totalAmount = subtotal + serviceFee + tax;

    if (subtotal === 0) {
      throw new BadRequestException('Semua item gratis — tidak perlu checkout');
    }
    if (totalAmount > 1_000_000_000) {
      throw new BadRequestException('Total order melebihi batas maksimum');
    }

    // 3. Ambil data user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // 4. Buat order di database (cek duplikat di dalam transaction agar atomic)
    const order = await this.prisma.$transaction(async (tx) => {
      // Atomic duplicate check — cek per soundId + licenseType agar upgrade personal→commercial diizinkan
      for (const item of dto.items) {
        const existing = await tx.orderItem.findFirst({
          where: {
            soundEffectId: item.soundEffectId,
            licenseType: item.licenseType,
            order: { userId, status: 'PAID' },
          },
        });
        if (existing) {
          throw new BadRequestException(
            `Kamu sudah memiliki lisensi ${item.licenseType} untuk sound effect ini`,
          );
        }
      }

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

    // 6. Buat Midtrans Snap token — cancel order jika gagal agar tidak jadi orphan
    let snapToken: string;
    try {
      snapToken = await this.createMidtransToken(order, user!, itemsWithPrice);
    } catch (err: any) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      const detail = err?.ApiResponse ? JSON.stringify(err.ApiResponse) : (err?.message ?? String(err));
      throw new BadRequestException(`Gagal membuat sesi pembayaran: ${detail}`);
    }

    // Simpan gateway order ID + snapToken untuk re-open popup
    await this.prisma.order.update({
      where: { id: order.id },
      data: { gatewayOrderId: order.id, snapToken },
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

  // ─── Get invoice detail ─────────────────────────────────

  async getInvoice(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { soundEffect: { select: { title: true, format: true } } } },
        invoice: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (!order.invoice) throw new NotFoundException('Invoice belum tersedia. Selesaikan pembayaran terlebih dahulu.');
    return {
      invoiceNumber: order.invoice.invoiceNumber,
      issuedAt: order.invoice.issuedAt,
      orderId: order.id,
      status: order.status,
      paidAt: order.paidAt,
      customer: { name: order.user.name, email: order.user.email },
      items: order.items.map((i) => ({
        title: i.soundEffect.title,
        licenseType: i.licenseType,
        price: i.priceSnapshot,
      })),
      subtotal: order.items.reduce((s, i) => s + i.priceSnapshot, 0),
    };
  }

  // ─── Download invoice sebagai PDF ───────────────────────

  async downloadInvoicePdf(userId: string, orderId: string): Promise<Buffer> {
    const inv = await this.getInvoice(userId, orderId);
    const PDFDocument = (await import('pdfkit')).default;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const SERVICE_FEE_PERCENT = 5;
      const TAX_PERCENT = 11;
      const serviceFee = Math.round(inv.subtotal * SERVICE_FEE_PERCENT / 100);
      const tax = Math.round((inv.subtotal + serviceFee) * TAX_PERCENT / 100);

      const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('BeatHive', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#666').text('Sound Effect Marketplace', 50, 78);
      doc.fillColor('#000');

      doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(inv.invoiceNumber, 400, 75, { align: 'right' });
      doc.text(`Tanggal: ${new Date(inv.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 400, 90, { align: 'right' });

      // Divider
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e7eb').stroke();

      // Customer
      doc.fontSize(10).font('Helvetica-Bold').text('Kepada:', 50, 125);
      doc.font('Helvetica').text(inv.customer.name, 50, 140);
      doc.text(inv.customer.email, 50, 155);

      // Table header
      const tableTop = 195;
      doc.rect(50, tableTop, 495, 24).fill('#7c3aed');
      doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
      doc.text('Sound Effect', 60, tableTop + 7);
      doc.text('Lisensi', 320, tableTop + 7);
      doc.text('Harga', 450, tableTop + 7, { width: 85, align: 'right' });
      doc.fillColor('#000');

      // Table rows
      let y = tableTop + 24;
      inv.items.forEach((item, i) => {
        if (i % 2 === 0) doc.rect(50, y, 495, 22).fill('#f9fafb');
        doc.fillColor('#000').font('Helvetica').fontSize(10);
        doc.text(item.title, 60, y + 6, { width: 250 });
        doc.text(item.licenseType === 'commercial' ? 'Commercial' : 'Personal', 320, y + 6);
        doc.text(fmtRp(item.price), 450, y + 6, { width: 85, align: 'right' });
        y += 22;
      });

      // Totals
      y += 15;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      y += 10;

      const drawRow = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
        doc.text(label, 350, y);
        doc.text(value, 450, y, { width: 85, align: 'right' });
        y += 18;
      };

      drawRow('Subtotal', fmtRp(inv.subtotal));
      drawRow(`Biaya Layanan (${SERVICE_FEE_PERCENT}%)`, fmtRp(serviceFee));
      drawRow(`PPN (${TAX_PERCENT}%)`, fmtRp(tax));
      y += 4;
      doc.moveTo(350, y).lineTo(545, y).strokeColor('#7c3aed').stroke();
      y += 8;
      const grandTotal = inv.subtotal + serviceFee + tax;
      drawRow('TOTAL', fmtRp(grandTotal), true);

      // Footer
      doc.fontSize(9).fillColor('#999').font('Helvetica')
        .text('Terima kasih telah menggunakan BeatHive.', 50, 720, { align: 'center', width: 495 });

      doc.end();
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
      throw new BadRequestException('Pembayaran belum selesai. Coba lagi setelah pembayaran dikonfirmasi.');
    }

    // Aktifkan via webhook service logic — update order jadi PAID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // Buat invoice jika belum ada (idempotent — webhook mungkin belum fire)
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { orderId: order.id },
    });
    if (!existingInvoice) {
      const count = await this.prisma.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
      await this.prisma.invoice.create({
        data: { orderId: order.id, invoiceNumber },
      });
    }

    // Record purchase earnings (idempotent — safe to call even if webhook already fired)
    this.earnings.recordOrderEarnings(order.id).catch(() => {});

    return { activated: true };
  }

  // ─── Cancel order PENDING ───────────────────────────────

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Hanya order dengan status PENDING yang bisa dibatalkan');
    }
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: true };
  }

  // ─── Get snap token untuk re-open Midtrans popup ────────

  async getSnapToken(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { soundEffect: true } } },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order sudah tidak bisa dibayar');
    }

    // Kembalikan token lama jika masih ada, atau buat baru
    if (order.snapToken) return { snapToken: order.snapToken };

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const itemsWithPrice = order.items.map((i) => ({
      soundEffectId: i.soundEffectId,
      price: i.priceSnapshot,
      licenseType: i.licenseType,
      sound: i.soundEffect,
    }));
    const snapToken = await this.createMidtransToken(order, user, itemsWithPrice);
    await this.prisma.order.update({ where: { id: orderId }, data: { snapToken } });
    return { snapToken };
  }

  // ─── Buat Midtrans Snap token ───────────────────────────

  private async createMidtransToken(order: any, user: any, items: any[]) {
    const SERVICE_FEE_PERCENT = 5;
    const TAX_PERCENT = 11;
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT / 100);
    const tax = Math.round((subtotal + serviceFee) * TAX_PERCENT / 100);
    // Recalculate gross_amount from items to guarantee it matches item_details sum
    const grossAmount = subtotal + serviceFee + tax;

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: grossAmount,
      },
      item_details: [
        ...items.map((item) => ({
          id: item.soundEffectId,
          price: item.price,
          quantity: 1,
          name: `${item.sound.title} (${item.licenseType})`.slice(0, 50),
        })),
        { id: 'service-fee', price: serviceFee, quantity: 1, name: `Biaya Layanan (${SERVICE_FEE_PERCENT}%)` },
        { id: 'ppn', price: tax, quantity: 1, name: `PPN (${TAX_PERCENT}%)` },
      ],
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
