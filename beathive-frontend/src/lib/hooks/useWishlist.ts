// src/lib/hooks/useWishlist.ts
'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { soundsApi } from '@/lib/api/sounds';
import { useAuthStore } from '@/lib/store/auth.store';

export function useWishlist() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  /** Toggle like/unlike sebuah sound. Kembalikan state terbaru `liked`. */
  const toggle = useCallback(
    async (
      soundId: string,
      currentIsLiked: boolean,
      onSuccess?: (liked: boolean) => void,
    ) => {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return currentIsLiked;
      }

      setLoadingId(soundId);
      try {
        const result = await soundsApi.toggleWishlist(soundId);
        onSuccess?.(result.liked);
        return result.liked;
      } catch {
        return currentIsLiked;
      } finally {
        setLoadingId(null);
      }
    },
    [isAuthenticated, router],
  );

  /** Hapus dari wishlist secara eksplisit (untuk halaman wishlist). */
  const remove = useCallback(
    async (soundId: string, onSuccess?: () => void) => {
      if (!isAuthenticated) return;
      setLoadingId(soundId);
      try {
        await soundsApi.removeWishlist(soundId);
        onSuccess?.();
      } finally {
        setLoadingId(null);
      }
    },
    [isAuthenticated],
  );

  return { toggle, remove, loadingId };
}
