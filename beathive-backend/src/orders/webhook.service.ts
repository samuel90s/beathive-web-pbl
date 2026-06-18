// src/orders/webhook.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from '../common/license/license.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EarningsService } from '../earnings/earnings.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

// Midtrans does not publish complete TypeScript types for its Node client.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private licenseService: LicenseService,
    private subscriptionsService: SubscriptionsService,
    private earnings: EarningsService,
    private email: EmailService,
    private notifications: NotificationsService,
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
      throw new BadRequestException('Invalid webhook signature');
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

  async syncOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== 'PENDING') {
      return { status: order.status, changed: false };
    }

    const gatewayOrderId = order.gatewayOrderId || order.id;
    const coreApi = new midtransClient.CoreApi({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.get('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.get('MIDTRANS_CLIENT_KEY'),
    });

    let result: any;
    try {
      result = await coreApi.transaction.status(gatewayOrderId);
    } catch (error: any) {
      const statusCode = String(error?.ApiResponse?.status_code || '');
      const ageMs = Date.now() - order.createdAt.getTime();
      if (statusCode === '404' && ageMs >= 24 * 60 * 60 * 1000) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
        return {
          status: 'CANCELLED',
          gatewayStatus: 'not_found',
          changed: true,
          message: 'Payment was never started and the 24-hour payment window has expired',
        };
      }
      throw new BadRequestException(
        statusCode === '404'
          ? 'Payment has not been started in Midtrans'
          : 'Unable to retrieve payment status from Midtrans',
      );
    }

    const transactionStatus = result.transaction_status;
    const isSuccess = transactionStatus === 'capture' || transactionStatus === 'settlement';
    const isFailed = ['deny', 'cancel', 'expire'].includes(transactionStatus);

    if (isSuccess && result.fraud_status !== 'challenge') {
      await this.handlePaymentSuccess(gatewayOrderId);
    } else if (isFailed) {
      await this.handlePaymentFailed(gatewayOrderId);
    }

    const updated = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true, paidAt: true },
    });
    return {
      status: updated?.status || order.status,
      paidAt: updated?.paidAt,
      gatewayStatus: transactionStatus,
      expiryTime: result.expiry_time || null,
      changed: updated?.status !== order.status,
    };
  }

  // ─── Subscription berhasil dibayar ──────────────────────

  private async handleSubscriptionSuccess(orderId: string) {
    const intent = await this.prisma.subscriptionIntent.findUnique({
      where: { orderId },
    });

    if (!intent) {
      this.logger.warn(`Subscription intent not found: ${orderId}`);
      return;
    }

    await this.subscriptionsService.activateSubscription(
      intent.userId,
      intent.planSlug,
      intent.billingCycle as 'monthly' | 'yearly',
      orderId,
    );

    // Hapus intent — activation sudah berhasil (idempotent).
    // Jika delete gagal, webhook retry akan menjalankan activation lagi (upsert, no-op) lalu delete.
    try {
      await this.prisma.subscriptionIntent.delete({ where: { orderId } });
    } catch (err: any) {
      if (err?.code !== 'P2025') {
        this.logger.error(`Failed to delete subscription intent ${orderId}: ${err?.message}`);
      }
    }

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
        items: { include: { audioAsset: { include: { author: { select: { id: true, name: true, email: true } } } } } },
        user: true,
      },
    });

    if (!order) return;
    if (order.status === 'PAID') return; // already processed

    await this.prisma.$transaction(async (tx) => {
      // Atomic gate: only one concurrent webhook request will transition PENDING → PAID
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (count === 0) return; // concurrent request already processed

      // Generate invoice number — derived from orderId (unique by construction, no race condition)
      const year = new Date().getFullYear();
      const shortId = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
      const invoiceNumber = `INV-${year}-${shortId}`;

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
          soundTitle: item.audioAsset.title,
          soundId: item.audioAssetId,
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

    // Record purchase earnings — await agar tidak hilang; idempotent via dedup key
    await this.earnings.recordOrderEarnings(order.id);

    await this.notifications.create({
      userId: order.userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Pembayaran berhasil',
      message: `Order #${order.id.slice(0, 8).toUpperCase()} sudah berhasil. Sound siap didownload.`,
      actionUrl: `/orders/${order.id}/success`,
    }).catch(() => null);

    // Notify creators (fire-and-forget)
    this.notifyCreatorsOnSale(order).catch(() => {});
  }

  // ─── Notify creators when their sound is sold ────────────

  private async notifyCreatorsOnSale(order: any) {
    for (const item of order.items ?? []) {
      const author = item.audioAsset?.author;
      if (!author?.email) continue;
      const creatorEarning = Math.round(item.priceSnapshot * 0.7);
      await this.email.sendSoundSold(
        author.email,
        author.name,
        item.audioAsset.title,
        creatorEarning,
        item.licenseType,
      ).catch(() => {});
    }
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
    await this.notifications.create({
      userId: order.userId,
      type: 'PAYMENT_FAILED',
      title: 'Pembayaran gagal',
      message: `Order #${order.id.slice(0, 8).toUpperCase()} gagal atau kedaluwarsa.`,
      actionUrl: '/dashboard/orders',
    }).catch(() => null);
  }
}
