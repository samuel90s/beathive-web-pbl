// src/sounds/sounds.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');
import { SoundsService, SoundFilterDto, UploadSoundDto } from './sounds.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sounds')
export class SoundsController {
  constructor(
    private soundsService: SoundsService,
    private prisma: PrismaService,
  ) {}

  // ─── GET /sounds ──────────────────────────────────────────
  @Get()
  async findAll(
    @Query() filters: SoundFilterDto,
    @Req() req: any,
  ) {
    // userId opsional untuk menampilkan isLiked
    const userId = req?.user?.sub ?? req?.user?.userId ?? undefined;
    return this.soundsService.findAll(filters, userId);
  }

  // ─── GET /sounds/categories  (public, for homepage/browse) ─
  @Get('categories')
  async getCategories() {
    return this.soundsService.getCategories();
  }

  // ─── GET /sounds/wishlist  (HARUS sebelum :slug) ──────────
  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  async getWishlist(
    @CurrentUser() userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.soundsService.getUserWishlist(userId, page, limit);
  }

  // ─── GET /sounds/mine  (author's own uploads) ────────────
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMySounds(
    @CurrentUser() userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.soundsService.getAuthorSounds(userId, page, limit);
  }

  // ─── POST /admin/sounds/upload ────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, os.tmpdir()),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'audio/wav', 'audio/x-wav', 'audio/wave',
          'audio/mpeg', 'audio/mp3',
          'audio/ogg', 'audio/vorbis',
          'audio/flac', 'audio/x-flac',
          'application/octet-stream', // browser kadang kirim ini
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(wav|mp3|ogg|flac)$/i)) {
          cb(null, true);
        } else {
          cb(new Error(`MIME type tidak didukung: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadSound(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSoundDto,
    @CurrentUser() uploaderId: string,
  ) {
    if (!file) {
      return { success: false, message: 'File audio wajib diupload' };
    }
    return this.soundsService.uploadSound(file, dto, uploaderId);
  }

  // ─── GET /sounds/:slug ────────────────────────────────────
  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Req() req: any) {
    const userId = req?.user?.sub ?? req?.user?.userId ?? undefined;
    return this.soundsService.findOne(slug, userId);
  }

  // ─── GET /sounds/:id/preview  (stream audio 30 detik) ────
  @Get(':id/preview')
  async streamPreview(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const info = await this.soundsService.getPreviewInfo(id);

    if (!info) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Sound tidak ditemukan' });
    }

    // Jika previewUrl adalah URL eksternal (CDN/S3 public) → redirect
    if (info.previewUrl && info.previewUrl.startsWith('http')) {
      return res.redirect(302, info.previewUrl);
    }

    // Local file
    const filePath = this.soundsService.getLocalPreviewPath(info.previewUrl ?? '');
    if (!filePath) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'File preview tidak tersedia' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = (filePath.split('.').pop() ?? 'mp3').toLowerCase();
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };
    const contentType = mimeMap[ext] ?? 'audio/mpeg';

    // Dukung Range Request agar audio bisa di-seek
    const range: string | undefined = req.headers?.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunk = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  // ─── GET /sounds/:id/download-stream  (butuh JWT) ────────
  // Returns ZIP: audio file + license.txt
  @Get(':id/download-stream')
  @UseGuards(JwtAuthGuard)
  async streamDownload(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    const sound = await this.soundsService.findById(id);
    if (!sound) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Sound not found' });
    }

    const filePath = this.soundsService.getLocalDownloadPath(sound.fileUrl);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Audio file not available' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const lastDownload = await this.prisma.download.findFirst({
      where: { userId, soundEffectId: id },
      orderBy: { downloadedAt: 'desc' },
    });

    let licenseType = 'free';
    let invoiceNumber = `DL-${Date.now()}`;

    if (lastDownload?.source === 'purchase') {
      const orderItem = await this.prisma.orderItem.findFirst({
        where: { soundEffectId: id, order: { userId, status: 'PAID' } },
        include: { order: { include: { invoice: true } } },
        orderBy: { order: { paidAt: 'desc' } },
      });
      licenseType = orderItem?.licenseType ?? 'personal';
      invoiceNumber = orderItem?.order?.invoice?.invoiceNumber ?? invoiceNumber;
    } else if (lastDownload?.source === 'subscription') {
      licenseType = sound.accessLevel === 'FREE' ? 'free' : 'subscription';
    }

    const licenseText = this.buildLicenseText({
      buyerName: user?.name ?? 'User',
      buyerEmail: user?.email ?? '',
      soundTitle: sound.title,
      soundId: sound.id,
      licenseType,
      invoiceNumber,
    });

    const zipName = `${sound.slug}-beathive.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    archive.file(filePath, { name: `${sound.slug}.${sound.format}` });
    archive.append(Buffer.from(licenseText, 'utf8'), { name: 'license.txt' });
    await archive.finalize();
  }

  private buildLicenseText(data: {
    buyerName: string;
    buyerEmail: string;
    soundTitle: string;
    soundId: string;
    licenseType: string;
    invoiceNumber: string;
  }): string {
    const date = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const sep = '='.repeat(50);

    const header = [
      'BEATHIVE — LICENSE CERTIFICATE',
      sep,
      `Sound       : ${data.soundTitle}`,
      `Sound ID    : ${data.soundId}`,
      `Licensee    : ${data.buyerName} <${data.buyerEmail}>`,
      `Invoice     : ${data.invoiceNumber}`,
      `Date        : ${date}`,
      sep,
      '',
    ].join('\n');

    const bodies: Record<string, string> = {
      free: [
        'LICENSE TYPE: FREE',
        '',
        'YOU MAY:',
        '  + Use in personal, non-commercial projects',
        '  + Use in YouTube / social media (non-monetized)',
        '',
        'YOU MAY NOT:',
        '  - Use in commercial or paid projects',
        '  - Resell or redistribute this file',
        '  - Claim as your own original work',
        '',
        'Attribution to BeatHive is appreciated.',
      ].join('\n'),

      subscription: [
        'LICENSE TYPE: SUBSCRIPTION',
        '',
        'YOU MAY:',
        '  + Use in commercial projects',
        '  + Use in ads, films, podcasts, and games',
        '  + Modify and adapt as needed',
        '',
        'YOU MAY NOT:',
        '  - Resell or redistribute this file',
        '  - Claim as your own original work',
        '',
        'This license is valid while your BeatHive subscription is active.',
      ].join('\n'),

      commercial: [
        'LICENSE TYPE: COMMERCIAL (SINGLE PURCHASE)',
        '',
        'YOU MAY:',
        '  + Use in commercial projects with no time limit',
        '  + Use in ads, films, and paid products',
        '  + Modify and adapt as needed',
        '',
        'YOU MAY NOT:',
        '  - Resell or redistribute this file',
        '  - Claim as your own original work',
        '',
        'This license is perpetual (lifetime).',
      ].join('\n'),

      personal: [
        'LICENSE TYPE: PERSONAL (SINGLE PURCHASE)',
        '',
        'YOU MAY:',
        '  + Use in personal, non-commercial projects',
        '  + Use in YouTube / social media (non-monetized)',
        '',
        'YOU MAY NOT:',
        '  - Use in commercial or paid projects',
        '  - Resell or redistribute this file',
        '  - Claim as your own original work',
        '',
        'This license is perpetual (lifetime).',
      ].join('\n'),
    };

    const body = bodies[data.licenseType] ?? bodies.personal;
    return header + body + '\n\n' + sep + '\nGenerated by BeatHive. beathive.com\n';
  }

  // ─── POST /sounds/:id/recalculate-duration  (admin/author only) ──
  @Post(':id/recalculate-duration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  async recalculateDuration(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.soundsService.recalculateDuration(id, userId);
  }

  // ─── POST /sounds/:id/play  (increment play count, no auth) ─
  @Post(':id/play')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async incrementPlay(@Param('id') id: string) {
    await this.soundsService.incrementPlayCount(id);
    return { ok: true };
  }

  // ─── POST /sounds/:id/download  (butuh JWT) ──────────────
  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async requestDownload(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.soundsService.requestDownload(id, userId);
  }

  // ─── POST /sounds/:id/wishlist  (toggle) ─────────────────
  @Post(':id/wishlist')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async toggleWishlist(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.soundsService.toggleWishlist(id, userId);
  }

  // ─── DELETE /sounds/:id/wishlist ──────────────────────────
  @Delete(':id/wishlist')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeWishlist(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    // Panggil toggle — jika sudah di wishlist, akan dihapus
    const result = await this.soundsService.toggleWishlist(id, userId);
    // Jika baru saja ditambah (harusnya tidak terjadi via DELETE), hapus lagi
    if (result.liked) {
      return this.soundsService.toggleWishlist(id, userId);
    }
    return result;
  }
}
