// src/components/sounds/SoundRow.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/player.store';
import { useCartStore } from '@/lib/store/cart.store';
import { useDownload } from '@/lib/hooks/useDownload';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { formatDuration } from '@/lib/utils';
import type { SoundEffect } from '@/types';
import WaveformBar from './WaveformBar';
import clsx from 'clsx';

interface Props {
  sound: SoundEffect;
}

export default function SoundRow({ sound }: Props) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { addItem, removeItem, hasItem } = useCartStore();
  const { download, downloading } = useDownload();
  const { toggle: toggleWishlist, loadingId } = useWishlist();

  const [liked, setLiked] = useState<boolean>(sound.isLiked ?? false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isActive = currentTrack?.id === sound.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const inCart = hasItem(sound.id);
  const wishlistLoading = loadingId === sound.id;

  const togglePlay = () => {
    if (isActive) {
      isPlaying ? pause() : usePlayerStore.getState().resume();
    } else {
      play(sound);
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) removeItem(sound.id);
    else addItem(sound, 'personal');
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadError(null);
    try {
      await download(sound.id, sound.slug, sound.format);
    } catch (err: any) {
      setDownloadError(err.message || 'Gagal download');
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleWishlist(sound.id, liked, (newLiked) => setLiked(newLiked));
  };

  const accessBadge = {
    FREE: null,
    PRO: { label: 'Pro', cls: 'bg-amber-50 text-amber-700' },
    BUSINESS: { label: 'Business', cls: 'bg-purple-50 text-purple-700' },
    PURCHASE: null,
  }[sound.accessLevel];

  return (
    <div
      onClick={togglePlay}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer group transition-all',
        isActive
          ? 'border-violet-200 bg-violet-50'
          : 'border-gray-100 bg-white hover:border-violet-100 hover:bg-gray-50',
      )}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
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
      <div className="min-w-0 w-52 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/sounds/${sound.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-gray-900 truncate hover:text-violet-600 transition-colors"
          >
            {sound.title}
          </Link>
          {accessBadge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${accessBadge.cls}`}>
              {accessBadge.label}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {sound.category.name}
          {sound.tags.slice(0, 2).map((t) => ` · ${t.name}`)}
        </p>
        {downloadError && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{downloadError}</p>
        )}
      </div>

      {/* Waveform */}
      <div className="flex-1 hidden sm:block">
        <WaveformBar
          data={sound.waveformData}
          isActive={isActive}
          progress={isActive ? usePlayerStore.getState().progress : 0}
        />
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0 tabular-nums">
        {formatDuration(sound.durationMs)}
      </span>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        disabled={wishlistLoading}
        title={liked ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
        className={clsx(
          'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors',
          liked
            ? 'text-rose-500 hover:text-rose-400'
            : 'text-gray-300 hover:text-rose-400',
          wishlistLoading && 'opacity-50 cursor-not-allowed',
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      {/* Price / Action */}
      <div className="flex items-center gap-2 flex-shrink-0 w-28 justify-end">
        {sound.isFree ? (
          <>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">Free</span>
            <button
              onClick={handleDownload}
              disabled={downloading === sound.id}
              title="Download"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              {downloading === sound.id ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500 font-medium">
              Rp {(sound.price / 1000).toFixed(0)}k
            </span>
            <button
              onClick={handleBuy}
              title={inCart ? 'Remove from cart' : 'Add to cart'}
              className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                inCart
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-violet-600 text-white hover:bg-violet-700',
              )}
            >
              {inCart ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
