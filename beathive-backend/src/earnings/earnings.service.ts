// src/earnings/earnings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const CREATOR_POOL_PERCENT = 25;
const MIN_WITHDRAWAL_RP = 50_000;

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── Hitung & simpan earning setelah PRO download ────────
  // Dipanggil fire-and-forget dari requestDownload

  async recordEarning(soundId: string, downloadId: string) {
    try {
      const sound = await this.prisma.soundEffect.findUnique({
        where: { id: soundId },
        select: { authorId: true, accessLevel: true, title: true },
      });

      if (!sound?.authorId) return;

      let amountRp = 0;

      if (sound.accessLevel === 'PURCHASE') {
        // Per-item purchase: creator gets 70% of the sale price
        const download = await this.prisma.download.findUnique({
          where: { id: downloadId },
          select: { source: true, userId: true },
        });

        if (download?.source !== 'purchase') return;

        const orderItem = await this.prisma.orderItem.findFirst({
          where: {
            soundEffectId: soundId,
            order: { userId: download.userId, status: 'PAID' },
          },
          orderBy: { order: { paidAt: 'desc' } },
          select: { priceSnapshot: true },
        });

        if (!orderItem) return;
        amountRp = Math.round(orderItem.priceSnapshot * 0.7);

      } else if (sound.accessLevel === 'PRO') {
        // PRO subscription download: pool-based
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const subRevenue = await this.prisma.order.aggregate({
          where: {
            status: 'PAID',
            createdAt: { gte: startOfMonth },
            items: { none: {} },
          },
          _sum: { totalAmount: true },
        });

        let monthlyRevenue = subRevenue._sum.totalAmount ?? 0;
        if (monthlyRevenue === 0) {
          const activeSubs = await this.prisma.subscription.count({
            where: { status: 'ACTIVE', plan: { slug: { not: 'free' } } },
          });
          monthlyRevenue = activeSubs * 99_000;
        }

        const totalDownloads = await this.prisma.download.count({
          where: {
            downloadedAt: { gte: startOfMonth },
            soundEffect: { accessLevel: 'PRO' },
          },
        });

        if (totalDownloads === 0) return;

        const pool = Math.round(monthlyRevenue * (CREATOR_POOL_PERCENT / 100));
        amountRp = Math.round(pool / totalDownloads);
      } else {
        return; // FREE sounds don't generate earnings
      }

      if (amountRp <= 0) return;

      const wallet = await this.prisma.creatorWallet.upsert({
        where: { userId: sound.authorId },
        update: {},
        create: { userId: sound.authorId, balance: 0, totalEarned: 0 },
      });

      await this.prisma.$transaction([
        this.prisma.creatorEarning.create({
          data: {
            walletId: wallet.id,
            soundId,
            downloadId,
            amountRp,
            poolPercent: sound.accessLevel === 'PURCHASE' ? 70 : CREATOR_POOL_PERCENT,
          },
        }),
        this.prisma.creatorWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: amountRp },
            totalEarned: { increment: amountRp },
          },
        }),
      ]);

      this.logger.log(
        `Earning recorded: creator=${sound.authorId} sound="${sound.title}" amount=Rp${amountRp.toLocaleString()} type=${sound.accessLevel}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to record earning: ${err.message}`);
    }
  }

  // ─── Record earnings when a PURCHASE order is paid ───────
  // Uses downloadId = 'order:<itemId>' as dedup key — safe to call multiple times

  async recordOrderEarnings(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              soundEffect: { select: { id: true, authorId: true, accessLevel: true, title: true } },
            },
          },
        },
      });

      if (!order || order.status !== 'PAID') return;

      for (const item of order.items) {
        if (item.soundEffect.accessLevel !== 'PURCHASE') continue;
        if (!item.soundEffect.authorId) continue;

        const dedupKey = `order:${item.id}`;

        // Idempotent — skip if already recorded
        const existing = await this.prisma.creatorEarning.findFirst({
          where: { downloadId: dedupKey },
        });
        if (existing) continue;

        const amountRp = Math.round(item.priceSnapshot * 0.7);
        if (amountRp <= 0) continue;

        const wallet = await this.prisma.creatorWallet.upsert({
          where: { userId: item.soundEffect.authorId },
          update: {},
          create: { userId: item.soundEffect.authorId, balance: 0, totalEarned: 0 },
        });

        await this.prisma.$transaction([
          this.prisma.creatorEarning.create({
            data: {
              walletId: wallet.id,
              soundId: item.soundEffectId,
              downloadId: dedupKey,
              amountRp,
              poolPercent: 70,
            },
          }),
          this.prisma.creatorWallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: amountRp },
              totalEarned: { increment: amountRp },
            },
          }),
        ]);

        this.logger.log(
          `Purchase earning recorded: creator=${item.soundEffect.authorId} sound="${item.soundEffect.title}" amount=Rp${amountRp.toLocaleString()}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to record order earnings: ${err.message}`);
    }
  }

  // ─── Creator analytics ───────────────────────────────────

  async getAnalytics(userId: string, monthsBack = 12) {
    const wallet = await this.prisma.creatorWallet.findUnique({ where: { userId } });
    if (!wallet) return { monthlyEarnings: [], topSounds: [], totalThisMonth: 0, totalLastMonth: 0, trend: 'flat' };

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    const earnings = await this.prisma.creatorEarning.findMany({
      where: { walletId: wallet.id, earnedAt: { gte: since } },
      select: { amountRp: true, soundId: true, earnedAt: true },
      orderBy: { earnedAt: 'asc' },
    });

    // Group by YYYY-MM
    const monthMap: Record<string, { totalRp: number; count: number }> = {};
    for (const e of earnings) {
      const key = `${e.earnedAt.getFullYear()}-${String(e.earnedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { totalRp: 0, count: 0 };
      monthMap[key].totalRp += e.amountRp;
      monthMap[key].count += 1;
    }

    // Fill in empty months
    const monthlyEarnings = [];
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyEarnings.push({ month: key, totalRp: monthMap[key]?.totalRp ?? 0, downloadCount: monthMap[key]?.count ?? 0 });
    }

    // Top sounds by earnings
    const soundTotals: Record<string, number> = {};
    for (const e of earnings) soundTotals[e.soundId] = (soundTotals[e.soundId] ?? 0) + e.amountRp;
    const topSoundIds = Object.entries(soundTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    const topSoundData = await this.prisma.soundEffect.findMany({
      where: { id: { in: topSoundIds } },
      select: { id: true, title: true, downloadCount: true, slug: true },
    });
    const topSounds = topSoundIds.map(id => {
      const s = topSoundData.find(x => x.id === id);
      return { soundId: id, title: s?.title ?? '—', slug: s?.slug ?? '', earnings: soundTotals[id], downloads: s?.downloadCount ?? 0 };
    });

    // Trend: compare this month vs last month
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const totalThisMonth = monthMap[thisMonthKey]?.totalRp ?? 0;
    const totalLastMonth = monthMap[lastMonthKey]?.totalRp ?? 0;
    const trend = totalThisMonth > totalLastMonth ? 'up' : totalThisMonth < totalLastMonth ? 'down' : 'flat';

    return { monthlyEarnings, topSounds, totalThisMonth, totalLastMonth, trend };
  }

  // ─── Get wallet + earning history ────────────────────────

  async getWallet(userId: string) {
    const wallet = await this.prisma.creatorWallet.findUnique({
      where: { userId },
      include: {
        earnings: {
          orderBy: { earnedAt: 'desc' },
          take: 20,
          include: {
            wallet: { select: { userId: true } },
          },
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      return { balance: 0, totalEarned: 0, earnings: [], withdrawals: [] };
    }

    // Enrich earnings dengan sound title
    const soundIds = [...new Set(wallet.earnings.map(e => e.soundId))];
    const sounds = await this.prisma.soundEffect.findMany({
      where: { id: { in: soundIds } },
      select: { id: true, title: true },
    });
    const soundMap = Object.fromEntries(sounds.map(s => [s.id, s.title]));

    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      earnings: wallet.earnings.map(e => ({
        id: e.id,
        soundTitle: soundMap[e.soundId] ?? 'Sound tidak diketahui',
        amountRp: e.amountRp,
        earnedAt: e.earnedAt,
      })),
      withdrawals: wallet.withdrawals,
    };
  }

  // ─── Request withdrawal ───────────────────────────────────

  async requestWithdrawal(userId: string, amountRp: number) {
    const [wallet, user] = await Promise.all([
      this.prisma.creatorWallet.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { bankName: true, bankAccount: true, bankAccountName: true } }),
    ]);

    if (!user?.bankName || !user?.bankAccount || !user?.bankAccountName) {
      throw new Error('Please complete your bank account details (bank, account number, and account holder name) in Profile Settings first.');
    }

    if (!wallet || wallet.balance < MIN_WITHDRAWAL_RP) {
      throw new Error(`Minimum balance to withdraw is Rp ${MIN_WITHDRAWAL_RP.toLocaleString('id-ID')}`);
    }

    if (amountRp > wallet.balance) {
      throw new Error('Amount exceeds available balance');
    }

    if (amountRp < MIN_WITHDRAWAL_RP) {
      throw new Error(`Minimum withdrawal is Rp ${MIN_WITHDRAWAL_RP.toLocaleString('id-ID')}`);
    }

    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amountRp,
          bankName: user.bankName,
          accountNo: user.bankAccount,
          note: `Account holder: ${user.bankAccountName}`,
          status: 'PENDING',
        },
      }),
      this.prisma.creatorWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountRp } },
      }),
    ]);

    // Notify creator via email (fire-and-forget)
    this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      .then(u => {
        if (u) this.email.sendWithdrawalRequested(u.email, amountRp, user.bankName!, user.bankAccount!, u.name ?? undefined).catch(() => {});
      }).catch(() => {});

    return withdrawal;
  }
}
