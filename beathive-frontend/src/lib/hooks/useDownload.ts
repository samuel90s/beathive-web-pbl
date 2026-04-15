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

  const download = async (soundId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setDownloading(soundId);
    setError(null);

    try {
      const result = await soundsApi.requestDownload(soundId);
      // Trigger download di browser
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = result.fileName;
      a.click();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendownload';
      setError(msg);
    } finally {
      setDownloading(null);
    }
  };

  return { download, downloading, error };
}
