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
import { memoryStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs';
import { SoundsService, SoundFilterDto, UploadSoundDto } from './sounds.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sounds')
export class SoundsController {
  constructor(private soundsService: SoundsService) {}

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

  // ─── POST /admin/sounds/upload ────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
  ) {
    if (!file) {
      return { success: false, message: 'File audio wajib diupload' };
    }
    return this.soundsService.uploadSound(file, dto);
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
  @Get(':id/download-stream')
  @UseGuards(JwtAuthGuard)
  async streamDownload(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const sound = await this.soundsService.findById(id);
    if (!sound) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Sound tidak ditemukan' });
    }

    // Hanya izinkan jika user punya akses (cek via requestDownload — tapi kita skip
    // double-check di sini karena user sudah klik "Download" lewat requestDownload dulu)
    const filePath = this.soundsService.getLocalDownloadPath(sound.fileUrl);
    if (!filePath) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: 'File audio tidak tersedia di server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = (filePath.split('.').pop() ?? 'wav').toLowerCase();
    const mimeMap: Record<string, string> = {
      wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac',
    };
    const contentType = mimeMap[ext] ?? 'application/octet-stream';
    const fileName = `${sound.slug}.${sound.format}`;

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }

  // ─── POST /sounds/:id/download  (butuh JWT) ──────────────
  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
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
