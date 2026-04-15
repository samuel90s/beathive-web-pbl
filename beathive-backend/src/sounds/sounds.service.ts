// src/sounds/sounds.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { AudioService } from '../common/audio/audio.service';
import { v4 as uuidv4 } from 'uuid';

// ─── DTOs ─────────────────────────────────────────────────

export class SoundFilterDto {
  search?: string;
  categorySlug?: string;
  isFree?: boolean;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export class UploadSoundDto {
  @IsString()
  title: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['FREE', 'PRO', 'BUSINESS', 'PURCHASE'])
  accessLevel?: string;

  @IsOptional()
  @IsString()
  licenseType?: string;

  @IsOptional()
  @IsString()
  tags?: string; // comma-separated tag names
}

// ─── Service ──────────────────────────────────────────────

@Injectable()
export class SoundsService {
  private readonly logger = new Logger(SoundsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audio: AudioService,
    private config: ConfigService,
  ) {}

  // ─── List sounds ─────────────────────────────────────────

  async findAll(filters: SoundFilterDto, userId?: string) {
    const {
      search,
      categorySlug,
      isFree,
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = filters;

    const where: any = { isPublished: true };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) where.category = { slug: categorySlug };

    if (isFree !== undefined) {
      where.price = String(isFree) === 'true' ? 0 : { gt: 0 };
    }

    const orderBy: any =
      {
        newest: { createdAt: 'desc' },
        popular: { downloadCount: 'desc' },
        price_asc: { price: 'asc' },
        price_desc: { price: 'desc' },
      }[sortBy] ?? { createdAt: 'desc' };

    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      this.prisma.soundEffect.count({ where }),
      this.prisma.soundEffect.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
          wishlists: userId ? { where: { userId } } : false,
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      items: items.map((s) => this.formatSound(s, userId)),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // ─── Single sound ─────────────────────────────────────────

  async findOne(slug: string, userId?: string) {
    const sound = await this.prisma.soundEffect.findUnique({
      where: { slug, isPublished: true },
      include: {
        category: true,
        tags: { include: { tag: true } },
        wishlists: userId ? { where: { userId } } : false,
      },
    });
    if (!sound) throw new NotFoundException('Sound effect tidak ditemukan');
    return this.formatSound(sound, userId);
  }

  // ─── Find by ID (internal) ────────────────────────────────

  async findById(id: string) {
    return this.prisma.soundEffect.findUnique({ where: { id } });
  }

  // ─── Get preview info for streaming ──────────────────────

  async getPreviewInfo(id: string) {
    return this.prisma.soundEffect.findUnique({
      where: { id },
      select: { id: true, previewUrl: true, format: true },
    });
  }

  getLocalPreviewPath(previewUrl: string): string | null {
    return this.storage.getLocalFilePath(previewUrl);
  }

  // ─── Request download ─────────────────────────────────────

  async requestDownload(soundId: string, userId: string) {
    const sound = await this.prisma.soundEffect.findUnique({
      where: { id: soundId },
    });
    if (!sound || !sound.isPublished) {
      throw new NotFoundException('Sound effect tidak ditemukan');
    }

    // Cek apakah sudah dibeli
    const alreadyPurchased = await this.prisma.orderItem.findFirst({
      where: {
        soundEffectId: soundId,
        order: { userId, status: 'PAID' },
      },
    });

    if (!alreadyPurchased) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        throw new ForbiddenException('Butuh subscription aktif');
      }

      const planHierarchy = ['free', 'pro', 'business'];
      const userLevel = planHierarchy.indexOf(subscription.plan.slug);
      const accessReq: Record<string, number> = {
        FREE: 0,
        PRO: 1,
        BUSINESS: 2,
        PURCHASE: 999,
      };
      const required = accessReq[sound.accessLevel] ?? 999;

      if (required === 999) {
        throw new ForbiddenException('Sound ini harus dibeli satuan');
      }
      if (userLevel < required) {
        throw new ForbiddenException('Upgrade plan untuk download ini');
      }

      if (!subscription.plan.unlimited) {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const downloadsThisMonth = await this.prisma.download.count({
          where: {
            userId,
            source: 'subscription',
            downloadedAt: { gte: thisMonth },
          },
        });
        if (downloadsThisMonth >= subscription.plan.downloadLimit) {
          throw new ForbiddenException('Kuota download bulan ini habis');
        }
      }
    }

    // Tentukan download URL
    let downloadUrl: string;
    let requiresAuth = false;

    if (this.storage.isLocal) {
      // Local dev: stream melalui backend dengan auth
      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
      downloadUrl = `${appUrl}/api/v1/sounds/${soundId}/download-stream`;
      requiresAuth = true;
    } else {
      // Production: signed URL S3 (24 jam)
      const signed = await this.storage.generateSignedUrl(sound.fileUrl, 86400);
      downloadUrl = signed ?? sound.previewUrl;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.download.create({
        data: {
          userId,
          soundEffectId: soundId,
          source: alreadyPurchased ? 'purchase' : 'subscription',
          signedUrl: downloadUrl,
          expiresAt,
        },
      }),
      this.prisma.soundEffect.update({
        where: { id: soundId },
        data: { downloadCount: { increment: 1 } },
      }),
    ]);

    return {
      downloadUrl,
      requiresAuth,
      expiresAt,
      fileName: `${sound.slug}.${sound.format}`,
    };
  }

  // ─── Get local download file path ─────────────────────────

  getLocalDownloadPath(fileUrl: string): string | null {
    return this.storage.getLocalFilePath(fileUrl);
  }

  // ─── Upload SFX baru (admin) ──────────────────────────────

  async uploadSound(
    file: Express.Multer.File,
    dto: UploadSoundDto,
  ) {
    // Validasi format
    const ext = (file.originalname.split('.').pop() ?? 'wav').toLowerCase();
    const validFormats = ['wav', 'mp3', 'ogg', 'flac'];
    if (!validFormats.includes(ext)) {
      throw new BadRequestException(
        `Format tidak didukung: ${ext}. Gunakan WAV, MP3, OGG, atau FLAC.`,
      );
    }

    // Validasi MIME type
    const validMimes = [
      'audio/wav', 'audio/x-wav', 'audio/wave',
      'audio/mpeg', 'audio/mp3',
      'audio/ogg', 'audio/vorbis',
      'audio/flac', 'audio/x-flac',
    ];
    if (!validMimes.includes(file.mimetype)) {
      this.logger.warn(`MIME type tidak dikenal: ${file.mimetype}, tetap diproses`);
    }

    // Generate slug unik
    const slug = dto.slug
      ? await this.ensureUniqueSlug(this.toSlug(dto.slug))
      : await this.ensureUniqueSlug(this.toSlug(dto.title));

    // Pre-generate UUID agar bisa dipakai untuk nama file preview
    const soundId = uuidv4();

    // Proses audio dengan FFmpeg (opsional)
    let previewBuffer: Buffer = file.buffer;
    let waveformData: number[] = this.generateDefaultWaveform();
    let durationMs = 0;

    try {
      const [preview, waveform, duration] = await Promise.all([
        this.audio.generatePreview(file.buffer, ext),
        this.audio.generateWaveform(file.buffer, ext),
        this.audio.getDuration(file.buffer, ext),
      ]);
      previewBuffer = preview;
      waveformData  = waveform;
      durationMs    = duration;
    } catch (err) {
      this.logger.warn(
        `Audio processing (FFmpeg) gagal — pakai fallback. Error: ${err?.message}`,
      );
    }

    // Simpan file audio full-res
    const fileUrl = await this.storage.uploadAudioFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // Simpan preview (gunakan soundId sebagai nama)
    const previewUrl = await this.storage.uploadPreviewFile(
      previewBuffer,
      soundId,
    );

    // Simpan ke database
    const sound = await this.prisma.soundEffect.create({
      data: {
        id: soundId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        description: dto.description ?? null,
        fileUrl,
        previewUrl,
        waveformData,
        durationMs,
        fileSize: file.size,
        format: ext,
        price: dto.price ?? 0,
        accessLevel: (dto.accessLevel ?? 'FREE') as any,
        licenseType: dto.licenseType ?? 'personal',
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    // Tambahkan tags jika ada
    if (dto.tags) {
      const tagNames = dto.tags.split(',').map((t) => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        const tagSlug = this.toSlug(name);
        const tag = await this.prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name, slug: tagSlug },
        });
        await this.prisma.soundEffectOnTag.upsert({
          where: { soundEffectId_tagId: { soundEffectId: soundId, tagId: tag.id } },
          update: {},
          create: { soundEffectId: soundId, tagId: tag.id },
        });
      }
    }

    return this.formatSound(sound);
  }

  // ─── Wishlist ─────────────────────────────────────────────

  async toggleWishlist(soundId: string, userId: string) {
    const sound = await this.prisma.soundEffect.findUnique({
      where: { id: soundId },
    });
    if (!sound) throw new NotFoundException('Sound effect tidak ditemukan');

    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_soundEffectId: { userId, soundEffectId: soundId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { userId_soundEffectId: { userId, soundEffectId: soundId } },
      });
      return { liked: false, message: 'Dihapus dari wishlist' };
    }

    await this.prisma.wishlist.create({
      data: { userId, soundEffectId: soundId },
    });
    return { liked: true, message: 'Ditambahkan ke wishlist' };
  }

  async getUserWishlist(userId: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      this.prisma.wishlist.count({ where: { userId } }),
      this.prisma.wishlist.findMany({
        where: { userId },
        include: {
          soundEffect: {
            include: {
              category: true,
              tags: { include: { tag: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      items: items.map((w) => this.formatSound(w.soundEffect, userId, true)),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // ─── Format response ──────────────────────────────────────

  private formatSound(sound: any, userId?: string, forceIsLiked?: boolean) {
    const isLiked =
      forceIsLiked ??
      (userId && sound.wishlists ? sound.wishlists.length > 0 : false);

    return {
      id: sound.id,
      title: sound.title,
      slug: sound.slug,
      description: sound.description,
      previewUrl: sound.previewUrl,
      waveformData: sound.waveformData,
      durationMs: sound.durationMs,
      format: sound.format,
      price: sound.price,
      isFree: sound.price === 0,
      accessLevel: sound.accessLevel,
      licenseType: sound.licenseType,
      isLiked,
      playCount: sound.playCount,
      downloadCount: sound.downloadCount,
      category: sound.category,
      tags: sound.tags?.map((t: any) => t.tag) ?? [],
      publishedAt: sound.publishedAt,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-');
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.prisma.soundEffect.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private generateDefaultWaveform(bars = 100): number[] {
    return Array.from({ length: bars }, () =>
      Math.floor(Math.random() * 20) + 4,
    );
  }
}
