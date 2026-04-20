import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(userId: string, soundId: string, score: number, reviewText?: string) {
    if (score < 1 || score > 5) throw new BadRequestException('Score must be between 1 and 5');

    const sound = await this.prisma.soundEffect.findUnique({ where: { id: soundId } });
    if (!sound || !sound.isPublished) throw new NotFoundException('Sound not found');

    return this.prisma.rating.upsert({
      where: { userId_soundId: { userId, soundId } },
      update: { score, reviewText: reviewText ?? null },
      create: { userId, soundId, score, reviewText: reviewText ?? null },
    });
  }

  async getSoundRatings(soundId: string) {
    const [ratings, agg] = await Promise.all([
      this.prisma.rating.findMany({
        where: { soundId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.rating.aggregate({
        where: { soundId },
        _avg: { score: true },
        _count: { score: true },
      }),
    ]);

    const distribution = [5, 4, 3, 2, 1].map(s => ({
      score: s,
      count: ratings.filter(r => r.score === s).length,
    }));

    return {
      avgScore: agg._avg.score ? Math.round(agg._avg.score * 10) / 10 : 0,
      totalCount: agg._count.score,
      distribution,
      reviews: ratings,
    };
  }

  async getUserRating(userId: string, soundId: string) {
    return this.prisma.rating.findUnique({
      where: { userId_soundId: { userId, soundId } },
    });
  }

  async deleteRating(userId: string, soundId: string) {
    const existing = await this.prisma.rating.findUnique({
      where: { userId_soundId: { userId, soundId } },
    });
    if (!existing) throw new NotFoundException('Rating not found');
    await this.prisma.rating.delete({ where: { userId_soundId: { userId, soundId } } });
    return { ok: true };
  }
}
