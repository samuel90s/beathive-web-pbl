// src/common/license/license.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { StorageService } from '../storage/storage.service';

interface LicenseData {
  buyerName: string;
  buyerEmail: string;
  soundTitle: string;
  soundId: string;
  licenseType: string;
  orderId: string;
  invoiceNumber: string;
  purchaseDate: Date;
}

@Injectable()
export class LicenseService {
  constructor(private storage: StorageService) {}

  async generateLicensePdf(data: LicenseData): Promise<string> {
    const pdfBuffer = await this.buildPdf(data);

    // Upload ke S3 private
    const key = await this.storage.uploadAudioFile(
      pdfBuffer,
      `license-${data.invoiceNumber}.pdf`,
      'application/pdf',
    );

    return key;
  }

  private buildPdf(data: LicenseData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Header ─────────────────────────────────────────
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('BeatHive', 60, 60)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#888')
        .text('Platform Sound Effect Premium', 60, 90)
        .fillColor('#000');

      doc.moveTo(60, 115).lineTo(535, 115).stroke('#eee');

      // ─── Judul dokumen ───────────────────────────────────
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Sertifikat Lisensi', 60, 135)
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#444')
        .text(
          data.licenseType === 'commercial'
            ? 'Lisensi Komersial — Boleh digunakan untuk proyek berbayar'
            : 'Lisensi Personal — Hanya untuk penggunaan non-komersial',
          60,
          160,
        )
        .fillColor('#000');

      // ─── Detail lisensi ──────────────────────────────────
      const tableTop = 210;
      const rows = [
        ['Sound Effect', data.soundTitle],
        ['ID Sound', data.soundId],
        ['Pemegang Lisensi', data.buyerName],
        ['Email', data.buyerEmail],
        ['Jenis Lisensi', data.licenseType === 'commercial' ? 'Komersial' : 'Personal'],
        ['No. Invoice', data.invoiceNumber],
        ['Tanggal Pembelian', data.purchaseDate.toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })],
      ];

      rows.forEach(([label, value], i) => {
        const y = tableTop + i * 36;
        doc
          .fillColor('#888')
          .fontSize(10)
          .text(label, 60, y)
          .fillColor('#000')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(value, 60, y + 14)
          .font('Helvetica');

        if (i < rows.length - 1) {
          doc.moveTo(60, y + 32).lineTo(535, y + 32).stroke('#f0f0f0');
        }
      });

      // ─── Syarat penggunaan ───────────────────────────────
      const termsTop = tableTop + rows.length * 36 + 30;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Syarat Penggunaan', 60, termsTop)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555');

      const terms =
        data.licenseType === 'commercial'
          ? [
              '✓ Boleh digunakan dalam proyek komersial (iklan, film, konten berbayar)',
              '✓ Boleh dimodifikasi dan disesuaikan dengan kebutuhan proyek',
              '✓ Lisensi berlaku seumur hidup untuk satu proyek',
              '✗ Tidak boleh dijual kembali atau didistribusikan ulang sebagai sound effect',
              '✗ Tidak boleh diklaim sebagai karya sendiri',
            ]
          : [
              '✓ Boleh digunakan untuk proyek personal non-komersial',
              '✓ Boleh digunakan dalam video YouTube/media sosial tanpa monetisasi',
              '✗ Tidak boleh digunakan dalam proyek komersial atau berbayar',
              '✗ Tidak boleh dijual kembali atau didistribusikan ulang',
            ];

      terms.forEach((term, i) => {
        doc.text(term, 60, termsTop + 20 + i * 18);
      });

      // ─── Footer ──────────────────────────────────────────
      doc
        .fillColor('#aaa')
        .fontSize(9)
        .text(
          `Dokumen ini dibuat secara otomatis oleh sistem BeatHive. ID Verifikasi: ${data.orderId}`,
          60,
          750,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
