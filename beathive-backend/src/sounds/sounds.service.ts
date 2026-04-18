// src/sounds/sounds.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { AudioService } from '../common/audio/audio.service';
import { EarningsService } from '../earnings/earnings.service';
import { v4 as uuidv4 } from 'uuid';

// ─── DTOs ─────────────────────────────────────────────────

export class SoundFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  /** Filter hanya sound gratis (price = 0) */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isFree?: boolean;

  /** Filter berdasarkan level akses: FREE | PRO | BUSINESS | PURCHASE */
  @IsOptional()
  @IsEnum(['FREE', 'PRO', 'BUSINESS', 'PURCHASE'])
  accessLevel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDuration?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UploadSoundDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

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
    private earnings: EarningsService,
  ) {}

  // ─── List sounds ─────────────────────────────────────────

  async findAll(filters: SoundFilterDto, userId?: string) {
    const {
      search,
      categorySlug,
      isFree,
      accessLevel,
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
      where.price = String(isFree) === 'true' || isFree === true ? 0 : { gt: 0 };
    }

    if (accessLevel) where.accessLevel = accessLevel;

    if (filters.minDuration !== undefined) {
      where.durationMs = { ...(where.durationMs ?? {}), gte: filters.minDuration };
    }
    if (filters.maxDuration !== undefined) {
      where.durationMs = { ...(where.durationMs ?? {}), lte: filters.maxDuration };
    }

    const orderBy: any =
      {
        newest: { createdAt: 'desc' },
        oldest: { createdAt: 'asc' },
        popular: { downloadCount: 'desc' },
        mostplayed: { playCount: 'desc' },
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
          author: { select: { id: true, name: true, avatarUrl: true } },
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
        author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
        wishlists: userId ? { where: { userId } } : false,
      },
    });
    if (!sound) throw new NotFoundException('Sound effect tidak ditemukan');

    // Cek apakah user sudah membeli sound ini (untuk PURCHASE access level)
    let isPurchased = false;
    if (userId && sound.accessLevel === 'PURCHASE') {
      const purchase = await this.prisma.orderItem.findFirst({
        where: {
          soundEffectId: sound.id,
          order: { userId, status: 'PAID' },
        },
      });
      isPurchased = !!purchase;
    }

    return { ...this.formatSound(sound, userId), isPurchased };
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

  // ─── Increment play count ────────────────────────────────

  async incrementPlayCount(id: string) {
    await this.prisma.soundEffect.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });
  }

  // ─── Request download ─────────────────────────────────────

  async requestDownload(soundId: string, userId: string) {
    const sound = await this.prisma.soundEffect.findUnique({
      where: { id: soundId },
    });
    if (!sound || !sound.isPublished) {
      throw new NotFoundException('Sound effect tidak ditemukan');
    }

    // ── Cek akses ───────────────────────────────────────────

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

      const planHierarchy = ['free', 'pro', 'business'];
      const accessReq: Record<string, number> = {
        FREE: 0,
        PRO: 1,
        BUSINESS: 2,
        PURCHASE: 999,
      };
      const required = accessReq[sound.accessLevel] ?? 999;

      if (required === 999) {
        throw new ForbiddenException('Sound ini harus dibeli satuan terlebih dahulu');
      }

      // FREE sounds: izinkan jika user login, bahkan tanpa subscription aktif
      if (required > 0) {
        if (!subscription || subscription.status !== 'ACTIVE') {
          throw new ForbiddenException(
            'Butuh subscription aktif untuk download sound ini. Upgrade plan kamu.',
          );
        }

        const userLevel = planHierarchy.indexOf(subscription.plan.slug);
        if (userLevel < required) {
          throw new ForbiddenException(
            `Sound ini butuh plan ${planHierarchy[required]} ke atas`,
          );
        }

        // Cek kuota bulanan
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
            throw new ForbiddenException(
              `Kuota download bulan ini sudah habis (${subscription.plan.downloadLimit}x). Tunggu bulan depan atau upgrade plan.`,
            );
          }
        }
      }
    }

    // ── Tentukan download URL ────────────────────────────────

    let downloadUrl: string;
    let requiresAuth = false;

    // Always use the ZIP stream endpoint so download includes license.txt
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    downloadUrl = `${appUrl}/api/v1/sounds/${soundId}/download-stream`;
    requiresAuth = true;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [downloadRecord] = await this.prisma.$transaction([
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

    // Fire-and-forget: catat earning untuk creator (hanya PRO sound)
    this.earnings.recordEarning(soundId, downloadRecord.id).catch(() => {});

    return {
      downloadUrl,
      requiresAuth,
      expiresAt,
      fileName: `${sound.slug}-beathive.zip`,
    };
  }

  // ─── Get local download file path ─────────────────────────

  getLocalDownloadPath(fileUrl: string): string | null {
    return this.storage.getLocalFilePath(fileUrl);
  }

  // ─── Recalculate duration for sounds with durationMs = 0 ──

  async recalculateDuration(soundId: string): Promise<{ durationMs: number }> {
    const sound = await this.prisma.soundEffect.findUnique({ where: { id: soundId } });
    if (!sound) throw new NotFoundException('Sound tidak ditemukan');

    // Baca file dari local storage
    const filePath = this.storage.getLocalFilePath(sound.fileUrl);
    if (!filePath) throw new BadRequestException('File tidak tersedia di lokal');

    const fs = await import('fs');
    const buffer = fs.readFileSync(filePath);
    const ext = (sound.format || 'wav').toLowerCase();

    const durationMs = await this.audio.getDuration(buffer, ext);

    if (durationMs > 0) {
      await this.prisma.soundEffect.update({
        where: { id: soundId },
        data: { durationMs },
      });
    }

    return { durationMs };
  }

  // ─── Upload SFX baru (author / admin) ────────────────────

  async uploadSound(
    file: Express.Multer.File,
    dto: UploadSoundDto,
    uploaderId: string,
  ) {
    const uploader = await this.prisma.user.findUnique({
      where: { id: uploaderId },
    });
    if (!uploader) throw new ForbiddenException('User tidak ditemukan');

    // Validasi format
    const ext = (file.originalname.split('.').pop() ?? 'wav').toLowerCase();
    const validFormats = ['wav', 'mp3', 'ogg', 'flac'];
    if (!validFormats.includes(ext)) {
      throw new BadRequestException(
        `Format tidak didukung: ${ext}. Gunakan WAV, MP3, OGG, atau FLAC.`,
      );
    }

    // Resolve categoryId dari slug jika diperlukan
    let categoryId = dto.categoryId;
    if (!categoryId && dto.categorySlug) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: dto.categorySlug },
      });
      if (!cat) throw new BadRequestException(`Kategori '${dto.categorySlug}' tidak ditemukan`);
      categoryId = cat.id;
    }
    if (!categoryId) throw new BadRequestException('categoryId atau categorySlug harus diisi');

    // Generate slug unik
    const slug = dto.slug
      ? await this.ensureUniqueSlug(this.toSlug(dto.slug))
      : await this.ensureUniqueSlug(this.toSlug(dto.title));

    const soundId = uuidv4();

    // Proses audio
    let previewBuffer: Buffer = file.buffer;
    let waveformData: number[] = this.generateDefaultWaveform();
    let durationMs = 0;

    // ── 1. Durasi: selalu dari header parser (tidak butuh FFmpeg) ─
    // Dijalankan TERPISAH dari FFmpeg agar tidak ikut gagal jika FFmpeg error
    try {
      durationMs = await this.audio.getDuration(file.buffer, ext);
    } catch {
      durationMs = 0;
    }

    // ── 2. Preview + Waveform: pakai FFmpeg (opsional) ─────────
    try {
      const [preview, waveform] = await Promise.all([
        this.audio.generatePreview(file.buffer, ext),
        this.audio.generateWaveform(file.buffer, ext),
      ]);
      previewBuffer = preview;
      waveformData = waveform;
    } catch (err: any) {
      this.logger.warn(
        `FFmpeg tidak tersedia — preview pakai file asli, waveform pakai fallback. Error: ${err?.message}`,
      );
    }

    // Simpan file
    const fileUrl = await this.storage.uploadAudioFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    const previewUrl = await this.storage.uploadPreviewFile(
      previewBuffer,
      soundId,
    );

    // Simpan ke database
    const sound = await this.prisma.soundEffect.create({
      data: {
        id: soundId,
        categoryId: categoryId!,
        authorId: uploader.role !== 'ADMIN' ? uploaderId : null,
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
        isPublished: false,
        reviewStatus: 'PENDING',
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Tags
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
          where: {
            soundEffectId_tagId: { soundEffectId: soundId, tagId: tag.id },
          },
          update: {},
          create: { soundEffectId: soundId, tagId: tag.id },
        });
      }
    }

    return this.formatSound(sound, uploaderId);
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
              author: { select: { id: true, name: true, avatarUrl: true } },
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

  // ─── Author's sounds ──────────────────────────────────────

  async getAuthorSounds(authorId: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const [total, items] = await Promise.all([
      this.prisma.soundEffect.count({ where: { authorId } }),
      this.prisma.soundEffect.findMany({
        where: { authorId },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);
    return {
      items: items.map((s) => this.formatSound(s)),
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
      fileSize: sound.fileSize,
      price: sound.price,
      isFree: sound.price === 0,
      accessLevel: sound.accessLevel,
      licenseType: sound.licenseType,
      isLiked,
      isPublished: sound.isPublished,
      reviewStatus: sound.reviewStatus,
      reviewNote: sound.reviewNote,
      playCount: sound.playCount,
      downloadCount: sound.downloadCount,
      category: sound.category,
      tags: sound.tags?.map((t: any) => t.tag) ?? [],
      author: sound.author ?? null,
      publishedAt: sound.publishedAt,
      createdAt: sound.createdAt,
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
