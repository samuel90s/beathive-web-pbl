import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  // Satu testimoni per user — submit ulang akan meng-update isi dan
  // mereset status approval (perlu di-review ulang oleh admin).
  async submit(userId: string, message: string, rating: number) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');
    const trimmed = message.trim();
    if (!trimmed) throw new BadRequestException('Message is required');

    return this.prisma.testimonial.upsert({
      where: { userId },
      update: { message: trimmed, rating, isApproved: false },
      create: { userId, message: trimmed, rating, isApproved: false },
    });
  }

  async getMine(userId: string) {
    return this.prisma.testimonial.findUnique({ where: { userId } });
  }

  // Daftar publik — hanya yang sudah di-approve admin
  async getApproved(limit = 20) {
    return this.prisma.testimonial.findMany({
      where: { isApproved: true },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }
}
