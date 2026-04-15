// src/common/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private privateBucket: string;
  private publicBucket: string;
  private cdnDomain: string;

  /** true = simpan file di local uploads/, false = pakai AWS S3 */
  readonly isLocal: boolean;
  readonly uploadsDir: string;

  constructor(private config: ConfigService) {
    const accessKey = config.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretKey = config.get<string>('AWS_SECRET_ACCESS_KEY', '');
    const bucket    = config.get<string>('AWS_S3_BUCKET_PRIVATE', '');
    const forceLocal = config.get<string>('USE_LOCAL_STORAGE', '') === 'true';

    // Anggap local jika konfigurasi S3 tidak valid / belum diisi
    const hasRealS3 =
      accessKey &&
      secretKey &&
      bucket &&
      accessKey !== 'your_access_key' &&
      secretKey !== 'your_secret_key';

    this.isLocal = forceLocal || !hasRealS3;
    this.uploadsDir = path.join(process.cwd(), 'uploads');

    if (this.isLocal) {
      this.logger.log('StorageService: mode LOCAL (./uploads/)');
      fs.mkdirSync(path.join(this.uploadsDir, 'sounds'), { recursive: true });
      fs.mkdirSync(path.join(this.uploadsDir, 'previews'), { recursive: true });
    } else {
      this.logger.log('StorageService: mode AWS S3');
      this.s3 = new S3Client({
        region: config.get<string>('AWS_REGION', 'ap-southeast-1'),
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      });
      this.privateBucket = bucket;
      this.publicBucket  = config.get<string>('AWS_S3_BUCKET_PUBLIC', '');
      this.cdnDomain     = config.get<string>('AWS_CLOUDFRONT_DOMAIN', '');
    }
  }

  // ─── Upload file audio full-res ───────────────────────────

  async uploadAudioFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    const ext      = (originalName.split('.').pop() ?? 'wav').toLowerCase();
    const filename = `${uuidv4()}.${ext}`;

    if (this.isLocal) {
      const filePath = path.join(this.uploadsDir, 'sounds', filename);
      fs.writeFileSync(filePath, buffer);
      return `sounds/${filename}`;
    }

    const key = `sounds/${filename}`;
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  // ─── Upload preview 30 detik ──────────────────────────────

  async uploadPreviewFile(buffer: Buffer, soundId: string): Promise<string> {
    const filename = `${soundId}-preview.mp3`;

    if (this.isLocal) {
      const filePath = path.join(this.uploadsDir, 'previews', filename);
      fs.writeFileSync(filePath, buffer);
      return `previews/${filename}`;
    }

    const key = `previews/${filename}`;
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.publicBucket,
        Key: key,
        Body: buffer,
        ContentType: 'audio/mpeg',
      }),
    );
    return `${this.cdnDomain}/${key}`;
  }

  // ─── Generate signed URL (S3 private) ────────────────────

  async generateSignedUrl(
    fileKey: string,
    expiresInSeconds: number,
  ): Promise<string | null> {
    if (this.isLocal) return null;

    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: fileKey,
    });
    return getSignedUrl(this.s3!, command, { expiresIn: expiresInSeconds });
  }

  // ─── Ambil path absolut file lokal ───────────────────────

  getLocalFilePath(relativeKey: string): string | null {
    if (!this.isLocal) return null;
    // relativeKey bisa 'sounds/uuid.wav' atau 'previews/uuid-preview.mp3'
    const clean = relativeKey.replace(/^local:/, '');
    const abs   = path.join(this.uploadsDir, clean);
    return fs.existsSync(abs) ? abs : null;
  }

  // ─── Hapus file ───────────────────────────────────────────

  async deleteFile(key: string, isPrivate = true): Promise<void> {
    if (this.isLocal) {
      const filePath = path.join(this.uploadsDir, key.replace(/^local:/, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    await this.s3!.send(
      new DeleteObjectCommand({
        Bucket: isPrivate ? this.privateBucket : this.publicBucket,
        Key: key,
      }),
    );
  }
}
