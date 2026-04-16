// src/lib/hooks/useDownload.ts
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { soundsApi } from '@/lib/api/sounds';
import { useAuthStore } from '@/lib/store/auth.store';

export function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  /**
   * Download file SFX.
   * @param soundId  - ID sound dari DB
   * @param slug     - slug untuk nama file
   * @param format   - ekstensi file (wav, mp3, dll)
   */
  const download = async (soundId: string, slug: string, format: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setDownloading(soundId);
    setError(null);

    try {
      // 1. Minta izin download & dapatkan URL
      const result = await soundsApi.requestDownload(soundId);
      const fileName = result.fileName || `${slug}.${format}`;

      if (result.requiresAuth) {
        // Local dev: stream melalui backend dengan header Authorization
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

        const response = await fetch(result.downloadUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Download gagal: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        triggerBlobDownload(blob, fileName);
      } else {
        // Production: S3 signed URL — langsung download (no auth needed)
        await fetchAndDownload(result.downloadUrl, fileName);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Gagal mendownload file';
      setError(msg);
      console.error('[useDownload]', msg);
    } finally {
      setDownloading(null);
    }
  };

  return { download, downloading, error };
}

// ─── Helpers ───────────────────────────────────────────────

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke agar browser sempat mulai download
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function fetchAndDownload(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    triggerBlobDownload(blob, fileName);
  } catch {
    // Fallback: buka URL di tab baru / anchor biasa
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
