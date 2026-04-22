// src/components/player/GlobalPlayer.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/lib/store/player.store';
import { useCartStore } from '@/lib/store/cart.store';
import { useDownload } from '@/lib/hooks/useDownload';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { getPreviewStreamUrl } from '@/lib/api/sounds';
import { formatDuration } from '@/lib/utils';

export default function GlobalPlayer() {
  const {
    currentTrack, isPlaying, progress, volume,
    pause, resume, stop, setProgress, setDuration, setVolume, playNext,
  } = usePlayerStore();
  const { addItem, hasItem } = useCartStore();
  const { download, downloading } = useDownload();
  const { toggle: toggleWishlist, loadingId } = useWishlist();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync liked state ketika track berubah
  useEffect(() => {
    setLiked(currentTrack?.isLiked ?? false);
    setAudioError(null);
  }, [currentTrack?.id]);

  // Ganti src saat currentTrack berubah — gunakan endpoint stream backend
  useEffect(() => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Gunakan endpoint /api/v1/sounds/:id/preview agar selalu bisa di-serve
    // (fallback lokal maupun redirect ke CDN)
    audio.src = getPreviewStreamUrl(currentTrack.id);
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => {});
    }
    // Increment play count (fire-and-forget)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    fetch(`${API_URL}/sounds/${currentTrack.id}/play`, { method: 'POST' }).catch(() => {});
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!currentTrack) return null;

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || seeking) return;
    setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    setDuration(audio.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const pct = Number(e.target.value);
    audio.currentTime = (pct / 100) * (audio.duration || 0);
    setProgress(pct);
  };

  const handleWishlist = async () => {
    await toggleWishlist(currentTrack.id, liked, (newLiked) => setLiked(newLiked));
  };

  const inCart = hasItem(currentTrack.id);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-3">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNext}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onError={() => setAudioError('Gagal memuat audio')}
      />

      <div className="max-w-7xl mx-auto flex items-center gap-4">

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={isPlaying ? pause : resume}
            className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="1" width="4" height="10" rx="1"/>
                <rect x="7" y="1" width="4" height="10" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <polygon points="2,1 11,6 2,11"/>
              </svg>
            )}
          </button>

          <button
            onClick={stop}
            className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>

        {/* Track info */}
        <div className="flex-shrink-0 min-w-0 w-44">
          <p className="text-sm font-medium text-gray-900 truncate">{currentTrack.title}</p>
          <p className="text-xs text-gray-400">
            {currentTrack.category.name}
            {audioError && <span className="text-rose-400 ml-1">· {audioError}</span>}
            {!audioError && ' · Preview 30s'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
            {formatDuration(((progress / 100) * (audioRef.current?.duration || 0)) * 1000)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(progress)}
            onChange={handleSeek}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            className="flex-1 h-1 accent-violet-600 cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-8 tabular-nums">
            {formatDuration((audioRef.current?.duration || 0) * 1000)}
          </span>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400">
            <path d="M2 5h2l3-3v10l-3-3H2V5z" fill="currentColor"/>
            <path d="M9 4.5c1 .8 1.5 1.5 1.5 2.5s-.5 1.7-1.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-20 h-1 accent-violet-600 cursor-pointer"
          />
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          disabled={loadingId === currentTrack.id}
          title={liked ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            liked ? 'text-rose-500 hover:text-rose-400' : 'text-gray-300 hover:text-rose-400'
          }`}
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

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentTrack.accessLevel !== 'PURCHASE' ? (
            <button
              onClick={async () => {
                try {
                  await download(currentTrack.id, currentTrack.slug, currentTrack.format);
                } catch (err: any) {
                  setAudioError(err.message || 'Download gagal');
                }
              }}
              disabled={downloading === currentTrack.id}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
              {downloading === currentTrack.id ? 'Mengunduh...' : currentTrack.accessLevel === 'FREE' ? 'Download Gratis' : `Download ${currentTrack.accessLevel}`}
            </button>
          ) : (
            <button
              onClick={() => !inCart && addItem(currentTrack, 'personal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                inCart
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {inCart ? 'Di Keranjang' : `Rp ${(currentTrack.price / 1000).toFixed(0)}rb`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
