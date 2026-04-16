// src/app/wishlist/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { soundsApi } from '@/lib/api/sounds';
import { useAuthStore } from '@/lib/store/auth.store';
import { usePlayerStore } from '@/lib/store/player.store';
import { useDownload } from '@/lib/hooks/useDownload';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { formatDuration } from '@/lib/utils';
import type { SoundEffect, SoundsResponse } from '@/types';
import clsx from 'clsx';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { download, downloading } = useDownload();
  const { remove: removeWishlist, loadingId } = useWishlist();

  const [data, setData] = useState<SoundsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Redirect kalau belum login
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  const fetchWishlist = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const result = await soundsApi.getWishlist(p, 20);
      setData(result);
      setPage(p);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchWishlist(1);
  }, [isAuthenticated, fetchWishlist]);

  const handleRemove = async (sound: SoundEffect) => {
    await removeWishlist(sound.id, () => {
      // Hapus dari daftar lokal
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((s) => s.id !== sound.id),
              pagination: {
                ...prev.pagination,
                total: prev.pagination.total - 1,
              },
            }
          : prev,
      );
    });
  };

  const togglePlay = (sound: SoundEffect) => {
    const isActive = currentTrack?.id === sound.id;
    if (isActive) {
      isPlaying ? pause() : usePlayerStore.getState().resume();
    } else {
      play(sound);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wishlist Saya</h1>
        <p className="text-sm text-gray-400 mt-1">
          Sound effect yang kamu sukai
          {data && ` · ${data.pagination.total} sound`}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.items.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Belum ada sound di wishlist</p>
          <p className="text-sm text-gray-400 mt-1">
            Tekan ikon ♡ pada sound manapun untuk menyimpannya di sini
          </p>
          <button
            onClick={() => router.push('/browse')}
            className="mt-4 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            Browse Sound Effects
          </button>
        </div>
      )}

      {/* Sound list */}
      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((sound) => {
              const isActive = currentTrack?.id === sound.id;
              const isCurrentlyPlaying = isActive && isPlaying;
              const removing = loadingId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() => togglePlay(sound)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer group transition-all',
                    isActive
                      ? 'border-violet-200 bg-violet-50'
                      : 'border-gray-100 bg-white hover:border-violet-100 hover:bg-gray-50',
                  )}
                >
                  {/* Play button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(sound); }}
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                      isActive ? 'bg-violet-600' : 'bg-gray-100 group-hover:bg-violet-100',
                    )}
                  >
                    {isCurrentlyPlaying ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill={isActive ? 'white' : '#7c3aed'}>
                        <rect x="1" y="0" width="3" height="10" rx="1"/>
                        <rect x="6" y="0" width="3" height="10" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="10" height="12" viewBox="0 0 10 12" fill={isActive ? 'white' : '#9ca3af'}>
                        <polygon points="0,0 10,6 0,12"/>
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{sound.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {sound.category.name}
                      {sound.tags.slice(0, 2).map((t) => ` · ${t.name}`)}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums hidden sm:block">
                    {formatDuration(sound.durationMs)}
                  </span>

                  {/* Format badge */}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono flex-shrink-0 uppercase">
                    {sound.format}
                  </span>

                  {/* Price */}
                  <span className={clsx(
                    'text-xs font-medium flex-shrink-0',
                    sound.isFree ? 'text-teal-600' : 'text-gray-600',
                  )}>
                    {sound.isFree ? 'Gratis' : `Rp ${(sound.price / 1000).toFixed(0)}rb`}
                  </span>

                  {/* Download */}
                  {sound.isFree && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        download(sound.id, sound.slug, sound.format);
                      }}
                      disabled={downloading === sound.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {downloading === sound.id ? '...' : 'Download'}
                    </button>
                  )}

                  {/* Remove from wishlist */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(sound); }}
                    disabled={removing}
                    title="Hapus dari wishlist"
                    className={clsx(
                      'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors text-rose-400 hover:text-rose-600 hover:bg-rose-50',
                      removing && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => fetchWishlist(page - 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                disabled={page === data.pagination.totalPages}
                onClick={() => fetchWishlist(page + 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
