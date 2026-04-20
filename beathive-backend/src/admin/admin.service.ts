// src/admin/admin.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── Dashboard stats ─────────────────────────────────────

  async getStats() {
    const [users, sounds, pendingSounds, orders, activeSubscriptions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.soundEffect.count(),
        this.prisma.soundEffect.count({ where: { reviewStatus: 'PENDING' } }),
        this.prisma.order.count({ where: { status: 'PAID' } }),
        this.prisma.subscription.count({
          where: { status: 'ACTIVE', plan: { slug: { not: 'free' } } },
        }),
      ]);

    const revenueAgg = await this.prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });

    return {
      users,
      sounds,
      pendingSounds,
      orders,
      activeSubscriptions,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    };
  }

  // ─── List sounds (semua, dengan filter status) ───────────

  async getSounds(status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (status) where.reviewStatus = status;

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.soundEffect.count({ where }),
      this.prisma.soundEffect.findMany({
        where,
        include: {
          category: true,
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Approve sound ───────────────────────────────────────

  async approveSound(soundId: string, adminId: string) {
    const sound = await this.prisma.soundEffect.findUnique({ where: { id: soundId } });
    if (!sound) throw new NotFoundException('Sound tidak ditemukan');

    const updated = await this.prisma.soundEffect.update({
      where: { id: soundId },
      data: {
        reviewStatus: 'APPROVED',
        reviewNote: null,
        reviewedAt: new Date(),
        reviewedById: adminId,
        isPublished: true,
        publishedAt: sound.publishedAt ?? new Date(),
      },
    });

    // Notify creator via email (fire-and-forget)
    if (sound.authorId) {
      this.prisma.user.findUnique({ where: { id: sound.authorId }, select: { email: true, name: true } })
        .then(author => {
          if (author) this.email.sendSoundReviewNotification(author.email, sound.title, 'APPROVED', undefined, author.name).catch(() => {});
        }).catch(() => {});
    }

    return updated;
  }

  // ─── Reject sound ────────────────────────────────────────

  async rejectSound(soundId: string, adminId: string, reason: string) {
    const sound = await this.prisma.soundEffect.findUnique({ where: { id: soundId } });
    if (!sound) throw new NotFoundException('Sound tidak ditemukan');

    const updated = await this.prisma.soundEffect.update({
      where: { id: soundId },
      data: {
        reviewStatus: 'REJECTED',
        reviewNote: reason,
        reviewedAt: new Date(),
        reviewedById: adminId,
        isPublished: false,
      },
    });

    // Notify creator via email (fire-and-forget)
    if (sound.authorId) {
      this.prisma.user.findUnique({ where: { id: sound.authorId }, select: { email: true, name: true } })
        .then(author => {
          if (author) this.email.sendSoundReviewNotification(author.email, sound.title, 'REJECTED', reason, author.name).catch(() => {});
        }).catch(() => {});
    }

    return updated;
  }

  // ─── List users ──────────────────────────────────────────

  async getUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: { include: { plan: true } },
          _count: { select: { uploadedSounds: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── List withdrawal requests ─────────────────────────────

  async getWithdrawals(status?: string, page = 1, limit = 20) {
    const where: any = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where }),
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          wallet: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateWithdrawalStatus(id: string, status: 'PAID' | 'REJECTED', note?: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Withdrawal request not found');

    if (req.status !== 'PENDING') {
      throw new ForbiddenException('Only PENDING withdrawals can be updated');
    }

    if (status === 'REJECTED') {
      // Refund the balance
      await this.prisma.$transaction([
        this.prisma.withdrawalRequest.update({
          where: { id },
          data: { status, note: note ?? null },
        }),
        this.prisma.creatorWallet.update({
          where: { id: req.walletId },
          data: { balance: { increment: req.amountRp } },
        }),
      ]);
    } else {
      await this.prisma.withdrawalRequest.update({
        where: { id },
        data: { status, note: note ?? null },
      });
    }

    // Notify creator via email (fire-and-forget)
    this.prisma.creatorWallet.findUnique({
      where: { id: req.walletId },
      include: { user: { select: { email: true, name: true } } },
    }).then(wallet => {
      if (!wallet?.user) return;
      const { email, name } = wallet.user;
      if (status === 'PAID') {
        this.email.sendWithdrawalApproved(email, req.amountRp, { bankName: req.bankName, accountNo: req.accountNo }, name ?? undefined).catch(() => {});
      } else {
        this.email.sendWithdrawalRejected(email, req.amountRp, note ?? 'No reason provided', name ?? undefined).catch(() => {});
      }
    }).catch(() => {});

    return { ok: true };
  }

  // ─── List orders ─────────────────────────────────────────

  async getOrders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { soundEffect: { select: { title: true } } } },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
