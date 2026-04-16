// src/components/sounds/SoundRow.tsx
'use client';
import { useState } from 'react';
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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    download(sound.id, sound.slug, sound.format);
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
          <p className="text-sm font-medium text-gray-900 truncate">{sound.title}</p>
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
      <div className="flex items-center gap-2 flex-shrink-0 w-32 justify-end">
        {sound.isFree ? (
          <>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">Gratis</span>
            <button
              onClick={handleDownload}
              disabled={downloading === sound.id}
              className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              {downloading === sound.id ? '...' : 'Download'}
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500 font-medium">
              Rp {(sound.price / 1000).toFixed(0)}rb
            </span>
            <button
              onClick={handleBuy}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg transition-colors',
                inCart
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-violet-600 text-white hover:bg-violet-700',
              )}
            >
              {inCart ? 'Hapus' : 'Beli'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
