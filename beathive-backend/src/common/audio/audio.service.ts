// src/common/audio/audio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  // ─── Generate preview 30 detik ──────────────────────────

  async generatePreview(
    inputBuffer: Buffer,
    inputFormat: string,
  ): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${uuidv4()}.${inputFormat}`);
    const outputPath = path.join(tmpDir, `${uuidv4()}-preview.mp3`);

    try {
      // Tulis input ke file sementara
      fs.writeFileSync(inputPath, inputBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .duration(30)          // Potong jadi max 30 detik
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioFrequency(44100)
          .audioChannels(2)
          .on('end', resolve)
          .on('error', reject)
          .save(outputPath);
      });

      return fs.readFileSync(outputPath);
    } finally {
      // Bersihkan file sementara
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }

  // ─── Generate waveform data untuk visualizer ────────────

  async generateWaveform(
    inputBuffer: Buffer,
    inputFormat: string,
    bars = 100, // jumlah bar yang dirender di frontend
  ): Promise<number[]> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${uuidv4()}.${inputFormat}`);
    const rawPath = path.join(tmpDir, `${uuidv4()}.raw`);

    try {
      fs.writeFileSync(inputPath, inputBuffer);

      // Konversi ke raw PCM 8-bit mono
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioFrequency(8000)   // sample rate rendah — cukup untuk waveform
          .audioChannels(1)
          .audioCodec('pcm_u8')
          .format('u8')
          .on('end', resolve)
          .on('error', reject)
          .save(rawPath);
      });

      const raw = fs.readFileSync(rawPath);
      return this.rawToWaveform(raw, bars);
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    }
  }

  // ─── Get durasi audio dalam milidetik ───────────────────

  async getDuration(inputBuffer: Buffer, inputFormat: string): Promise<number> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${uuidv4()}.${inputFormat}`);

    try {
      fs.writeFileSync(inputPath, inputBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) return reject(err);
          const durationSec = metadata.format.duration || 0;
          resolve(Math.round(durationSec * 1000));
        });
      });
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  }

  // ─── Helper: raw PCM → array bar heights ────────────────

  private rawToWaveform(raw: Buffer, bars: number): number[] {
    const samplesPerBar = Math.floor(raw.length / bars);
    const result: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, raw.length);

      for (let j = start; j < end; j++) {
        // PCM u8: 128 = silence, 0/255 = peak
        sum += Math.abs(raw[j] - 128);
      }

      const avg = sum / (end - start);
      // Normalkan ke range 4–28 (cocok untuk tampilan di frontend)
      const normalized = Math.round(4 + (avg / 128) * 24);
      result.push(Math.min(28, Math.max(4, normalized)));
    }

    return result;
  }
}
