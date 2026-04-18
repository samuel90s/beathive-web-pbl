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
    // Selalu coba header parser dulu — tidak butuh FFmpeg, tidak tulis file sementara
    const fromHeader = this.getDurationFromHeader(inputBuffer, inputFormat);
    if (fromHeader > 0) {
      this.logger.debug(`Duration via header parser: ${fromHeader}ms`);
      return fromHeader;
    }

    // Fallback ke FFmpeg (bisa gagal jika tidak terinstall)
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${uuidv4()}.${inputFormat}`);

    try {
      fs.writeFileSync(inputPath, inputBuffer);

      return await new Promise((resolve) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) {
            this.logger.debug(`FFprobe tidak tersedia: ${err.message}`);
            resolve(0);
            return;
          }
          const durationSec = metadata.format.duration || 0;
          resolve(Math.round(durationSec * 1000));
        });
      });
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  }

  // ─── Parse durasi dari audio header (tanpa FFmpeg) ──────

  private getDurationFromHeader(buffer: Buffer, format: string): number {
    try {
      const fmt = format.toLowerCase();

      if (fmt === 'wav' || fmt === 'wave') {
        return this.getWavDuration(buffer);
      }

      if (fmt === 'mp3') {
        return this.getMp3DurationEstimate(buffer);
      }

      if (fmt === 'ogg') {
        return this.getOggDuration(buffer);
      }
    } catch {
      // ignore — fallback ke FFmpeg
    }
    return 0;
  }

  private getWavDuration(buffer: Buffer): number {
    if (buffer.length < 44) return 0;
    // Cek "RIFF" dan "WAVE" signature
    if (buffer.toString('ascii', 0, 4) !== 'RIFF') return 0;
    if (buffer.toString('ascii', 8, 12) !== 'WAVE') return 0;

    // Scan chunks untuk fmt dan data
    // WAV fmt chunk layout (offsets from chunk header start):
    //  +0  : "fmt " (4 bytes)
    //  +4  : chunk size (4 bytes)
    //  +8  : audio format (2 bytes, PCM=1)
    //  +10 : num channels (2 bytes)
    //  +12 : sample rate (4 bytes)   ← bukan byte rate!
    //  +16 : byte rate (4 bytes)     ← ini yang kita butuhkan
    //  +20 : block align (2 bytes)
    //  +22 : bits per sample (2 bytes)
    let byteRate = 0;
    let i = 12;
    while (i + 8 <= buffer.length) {
      const chunkId = buffer.toString('ascii', i, i + 4);
      const chunkSize = buffer.readUInt32LE(i + 4);

      if (chunkId === 'fmt ' && chunkSize >= 16) {
        byteRate = buffer.readUInt32LE(i + 16); // byte rate, bukan sample rate
      }

      if (chunkId === 'data' && byteRate > 0) {
        const dataBytes = buffer.readUInt32LE(i + 4);
        return Math.round((dataBytes / byteRate) * 1000);
      }

      i += 8 + chunkSize;
      if (chunkSize % 2 !== 0) i++; // WAV chunks are word-aligned
    }
    return 0;
  }

  private getMp3DurationEstimate(buffer: Buffer): number {
    // Cari frame sync (0xFF 0xE0) dan baca bitrate + sample rate dari header frame pertama
    const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const sampleRates = [44100, 48000, 32000];

    for (let i = 0; i < Math.min(buffer.length - 4, 512 * 1024); i++) {
      if (buffer[i] !== 0xFF) continue;
      const b1 = buffer[i + 1];
      if ((b1 & 0xE0) !== 0xE0) continue; // frame sync

      const bitrateIdx = (buffer[i + 2] >> 4) & 0x0F;
      const srIdx = (buffer[i + 2] >> 2) & 0x03;

      if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) continue;

      const bitrate = bitrates[bitrateIdx] * 1000; // bps
      const sampleRate = sampleRates[srIdx];
      if (!bitrate || !sampleRate) continue;

      // Estimasi berdasarkan file size dan bitrate
      const dataSizeBytes = buffer.length - i;
      const durationMs = Math.round((dataSizeBytes * 8 * 1000) / bitrate);
      if (durationMs > 100 && durationMs < 3600000) return durationMs; // 0.1s - 1jam
    }
    return 0;
  }

  private getOggDuration(buffer: Buffer): number {
    // Cari granule position di Ogg page header untuk estimasi durasi
    // Ogg page header: OggS magic (4), version (1), type (1), granule (8 LE), ...
    for (let i = 0; i < buffer.length - 27; i++) {
      if (buffer.toString('ascii', i, i + 4) !== 'OggS') continue;
      // Read granule position (int64 LE at offset 6 from page start)
      // Use only lower 32 bits for reasonable durations
      const granuleLo = buffer.readUInt32LE(i + 6);
      if (granuleLo > 0) {
        // Vorbis default sample rate is 44100, but we don't know exactly
        // Use 44100 as estimate
        return Math.round((granuleLo / 44100) * 1000);
      }
    }
    return 0;
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
