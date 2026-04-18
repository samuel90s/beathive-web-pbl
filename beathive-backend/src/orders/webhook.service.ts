// src/orders/webhook.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from '../common/license/license.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private licenseService: LicenseService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // ─── Verifikasi signature dari Midtrans ─────────────────

  verifyMidtransSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signature: string,
  ): boolean {
    const serverKey = this.config.get('MIDTRANS_SERVER_KEY');
    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');
    return expected === signature;
  }

  // ─── Handle webhook dari Midtrans ──────────────────────

  async handleMidtransWebhook(payload: any) {
    const {
      order_id,
      transaction_status,
      fraud_status,
      status_code,
      gross_amount,
      signature_key,
    } = payload;

    // 1. Verifikasi signature
    const isValid = this.verifyMidtransSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key,
    );

    if (!isValid) {
      this.logger.warn(`Webhook signature tidak valid untuk order ${order_id}`);
      throw new BadRequestException('Signature tidak valid');
    }

    // 2. Cek status transaksi
    const isSuccess =
      transaction_status === 'capture' ||
      transaction_status === 'settlement';

    const isFailed =
      transaction_status === 'deny' ||
      transaction_status === 'cancel' ||
      transaction_status === 'expire';

    const isFraud = fraud_status === 'challenge';

    // 3. Route berdasarkan tipe order
    const isSubscriptionOrder = order_id.startsWith('SUB-');

    if (isSubscriptionOrder) {
      if (isSuccess && !isFraud) {
        await this.handleSubscriptionSuccess(order_id);
      } else if (isFailed) {
        await this.handleSubscriptionFailed(order_id);
      }
    } else {
      if (isSuccess && !isFraud) {
        await this.handlePaymentSuccess(order_id);
      } else if (isFailed) {
        await this.handlePaymentFailed(order_id);
      }
    }

    this.logger.log(`Webhook processed: ${order_id} → ${transaction_status}`);
    return { received: true };
  }

  // ─── Subscription berhasil dibayar ──────────────────────

  private async handleSubscriptionSuccess(orderId: string) {
    const intent = await this.prisma.subscriptionIntent.findUnique({
      where: { orderId },
    });

    if (!intent) {
      this.logger.warn(`Subscription intent tidak ditemukan: ${orderId}`);
      return;
    }

    await this.subscriptionsService.activateSubscription(
      intent.userId,
      intent.planSlug,
      intent.billingCycle as 'monthly' | 'yearly',
      orderId,
    );

    // Hapus intent setelah berhasil diproses
    await this.prisma.subscriptionIntent.delete({ where: { orderId } });

    this.logger.log(
      `Subscription aktif: userId=${intent.userId} plan=${intent.planSlug} cycle=${intent.billingCycle}`,
    );
  }

  // ─── Subscription gagal ──────────────────────────────────

  private async handleSubscriptionFailed(orderId: string) {
    // Hapus intent agar bisa coba lagi
    await this.prisma.subscriptionIntent.deleteMany({ where: { orderId } });
    this.logger.log(`Subscription payment gagal: ${orderId}`);
  }

  // ─── Pembayaran order (per-item purchase) berhasil ──────

  private async handlePaymentSuccess(gatewayOrderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { gatewayOrderId },
      include: {
        items: { include: { soundEffect: true } },
        user: true,
      },
    });

    if (!order || order.status === 'PAID') return; // idempotent

    await this.prisma.$transaction(async (tx) => {
      // Update status order
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      // Generate invoice number
      const count = await tx.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      await tx.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
        },
      });

      // Generate lisensi PDF untuk tiap item
      for (const item of order.items) {
        const pdfUrl = await this.licenseService.generateLicensePdf({
          buyerName: order.user.name,
          buyerEmail: order.user.email,
          soundTitle: item.soundEffect.title,
          soundId: item.soundEffectId,
          licenseType: item.licenseType,
          orderId: order.id,
          invoiceNumber,
          purchaseDate: new Date(),
        });

        await tx.orderItem.update({
          where: { id: item.id },
          data: { licensePdfUrl: pdfUrl },
        });
      }
    });

    this.logger.log(`Order ${order.id} berhasil dibayar`);
    // TODO: kirim email konfirmasi + lisensi ke user
  }

  // ─── DEV ONLY: Simulate payment berhasil (bypass signature) ─

  async devSimulatePayment(orderId: string) {
    if (orderId.startsWith('SUB-')) {
      await this.handleSubscriptionSuccess(orderId);
      return { ok: true, type: 'subscription', orderId };
    } else {
      await this.handlePaymentSuccess(orderId);
      return { ok: true, type: 'order', orderId };
    }
  }

  // ─── Pembayaran gagal ────────────────────────────────────

  private async handlePaymentFailed(gatewayOrderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { gatewayOrderId },
    });

    if (!order || order.status !== 'PENDING') return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED' },
    });

    this.logger.log(`Order ${order.id} gagal dibayar`);
    // TODO: kirim email notif gagal ke user
  }
}
