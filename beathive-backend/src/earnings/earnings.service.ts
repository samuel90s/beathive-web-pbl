// src/earnings/earnings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CREATOR_POOL_PERCENT = 25;
const MIN_WITHDRAWAL_RP = 50_000;

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Hitung & simpan earning setelah PRO download ────────
  // Dipanggil fire-and-forget dari requestDownload

  async recordEarning(soundId: string, downloadId: string) {
    try {
      const sound = await this.prisma.soundEffect.findUnique({
        where: { id: soundId },
        select: { authorId: true, accessLevel: true },
      });

      // Hanya PRO sound yang generate earning, dan hanya kalau ada authorId
      if (!sound?.authorId || sound.accessLevel !== 'PRO') return;

      // Hitung total subscription revenue bulan ini
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const revenueAgg = await this.prisma.subscription.aggregate({
        where: {
          status: 'ACTIVE',
          plan: { slug: { not: 'free' } },
        },
        _count: true,
      });

      // Estimasi revenue: hitung dari jumlah subscriber × harga rata-rata
      // Untuk simplicity, kita ambil dari orders subscription bulan ini
      const subRevenue = await this.prisma.order.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: startOfMonth },
          // order yang berkaitan subscription (tidak ada item soundEffect)
          items: { none: {} },
        },
        _sum: { totalAmount: true },
      });

      // Fallback: kalau tidak ada order subscription bulan ini,
      // gunakan jumlah subscriber aktif × rata-rata harga pro
      let monthlyRevenue = subRevenue._sum.totalAmount ?? 0;
      if (monthlyRevenue === 0) {
        const activeSubs = await this.prisma.subscription.count({
          where: { status: 'ACTIVE', plan: { slug: { not: 'free' } } },
        });
        monthlyRevenue = activeSubs * 99_000; // rata-rata harga pro
      }

      // Hitung total PRO downloads bulan ini
      const totalDownloads = await this.prisma.download.count({
        where: {
          downloadedAt: { gte: startOfMonth },
          soundEffect: { accessLevel: 'PRO' },
        },
      });

      if (totalDownloads === 0) return;

      const pool = Math.round(monthlyRevenue * (CREATOR_POOL_PERCENT / 100));
      const ratePerDownload = Math.round(pool / totalDownloads);

      if (ratePerDownload <= 0) return;

      // Pastikan wallet ada
      const wallet = await this.prisma.creatorWallet.upsert({
        where: { userId: sound.authorId },
        update: {},
        create: { userId: sound.authorId, balance: 0, totalEarned: 0 },
      });

      // Simpan earning + update saldo
      await this.prisma.$transaction([
        this.prisma.creatorEarning.create({
          data: {
            walletId: wallet.id,
            soundId,
            downloadId,
            amountRp: ratePerDownload,
            poolPercent: CREATOR_POOL_PERCENT,
          },
        }),
        this.prisma.creatorWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: ratePerDownload },
            totalEarned: { increment: ratePerDownload },
          },
        }),
      ]);

      this.logger.debug(
        `Earning recorded: creator=${sound.authorId} sound=${soundId} amount=Rp${ratePerDownload}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to record earning: ${err.message}`);
    }
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

  async requestWithdrawal(
    userId: string,
    amountRp: number,
    bankName: string,
    accountNo: string,
  ) {
    const wallet = await this.prisma.creatorWallet.findUnique({ where: { userId } });

    if (!wallet || wallet.balance < MIN_WITHDRAWAL_RP) {
      throw new Error(`Saldo minimum untuk withdraw adalah Rp ${MIN_WITHDRAWAL_RP.toLocaleString('id-ID')}`);
    }

    if (amountRp > wallet.balance) {
      throw new Error('Jumlah melebihi saldo');
    }

    if (amountRp < MIN_WITHDRAWAL_RP) {
      throw new Error(`Minimum withdrawal Rp ${MIN_WITHDRAWAL_RP.toLocaleString('id-ID')}`);
    }

    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amountRp,
          bankName,
          accountNo,
          status: 'PENDING',
        },
      }),
      this.prisma.creatorWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountRp } },
      }),
    ]);

    return withdrawal;
  }
}
