// src/lib/hooks/useDownload.ts
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { soundsApi } from '@/lib/api/sounds';
import { useAuthStore } from '@/lib/store/auth.store';

/** Extract readable message from axios/fetch errors */
function extractMessage(err: any): string {
  // Axios: error.response.data.message (dari backend NestJS)
  if (err?.response?.data?.message) {
    const msg = err.response.data.message;
    return Array.isArray(msg) ? msg.join(', ') : String(msg);
  }
  // Regular Error
  if (err?.message) return String(err.message);
  return 'Download failed';
}

export function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();

  /**
   * Download file SFX.
   * @throws Error dengan pesan yang bisa ditampilkan ke user
   */
  const download = async (soundId: string, slug: string, format: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setDownloading(soundId);

    try {
      // 1. Minta izin download & dapatkan URL (bisa throw 403, 401, dll)
      let result;
      try {
        result = await soundsApi.requestDownload(soundId);
      } catch (err: any) {
        throw new Error(extractMessage(err));
      }

      const fileName = result.fileName || `${slug}.${format}`;

      if (result.requiresAuth) {
        // Stream via backend dengan Authorization header
        // Construct URL langsung dari API base agar tidak double-prefix
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
        const streamUrl = `${apiBase}/sounds/${soundId}/download-stream`;

        let token = accessToken;
        if (!token) {
          token = sessionStorage.getItem('accessToken');
          if (!token) {
            try {
              const raw = sessionStorage.getItem('beathive-auth');
              if (raw) token = JSON.parse(raw)?.state?.accessToken ?? null;
            } catch { /* ignore */ }
          }
        }

        let response: Response;
        try {
          response = await fetch(streamUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch {
          throw new Error('Failed to connect to server');
        }

        if (!response.ok) {
          let msg = `Download gagal (${response.status})`;
          try {
            const body = await response.json();
            if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
          } catch { /* ignore */ }
          throw new Error(msg);
        }

        const blob = await response.blob();
        triggerBlobDownload(blob, fileName);
      } else {
        // Production: S3 signed URL
        try {
          const response = await fetch(result.downloadUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          triggerBlobDownload(blob, fileName);
        } catch (err: any) {
          throw new Error(extractMessage(err));
        }
      }
    } finally {
      setDownloading(null);
    }
  };

  return { download, downloading };
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
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
