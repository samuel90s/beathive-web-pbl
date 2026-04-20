// src/app/sounds/[slug]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { soundsApi, getPreviewStreamUrl } from '@/lib/api/sounds';
import { usePlayerStore } from '@/lib/store/player.store';
import { useCartStore } from '@/lib/store/cart.store';
import { useDownload } from '@/lib/hooks/useDownload';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatDuration, mediaUrl } from '@/lib/utils';
import WaveformBar from '@/components/sounds/WaveformBar';
import RatingSection from '@/components/sounds/RatingSection';
import type { SoundEffect } from '@/types';

export default function SoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [sound, setSound] = useState<SoundEffect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { addItem, removeItem, hasItem } = useCartStore();
  const { download, downloading } = useDownload();
  const { toggle: toggleWishlist, loadingId } = useWishlist();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    soundsApi.getOne(slug)
      .then((s) => {
        if (controller.signal.aborted) return;
        setSound(s);
        setLiked(s.isLiked ?? false);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Sound not found'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-12 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !sound) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-12 text-center">
        <p className="text-gray-500">{error || 'Sound not found'}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => { setError(null); setLoading(true); soundsApi.getOne(slug).then(s => { setSound(s); setLiked(s.isLiked ?? false); }).catch(() => setError('Sound not found')).finally(() => setLoading(false)); }}
            className="text-violet-600 text-sm hover:underline"
          >
            Try again
          </button>
          <span className="text-gray-300">·</span>
          <Link href="/browse" className="text-gray-500 text-sm hover:underline">Back to Browse</Link>
        </div>
      </div>
    );
  }

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

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await download(sound.id, sound.slug, sound.format);
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed');
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    await toggleWishlist(sound.id, liked, (newLiked) => setLiked(newLiked));
  };

  const accessLabels = {
    FREE: { label: 'Free', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    PRO: { label: 'Pro', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    BUSINESS: { label: 'Business', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    PURCHASE: { label: 'Buy', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
  };
  const badge = accessLabels[sound.accessLevel];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/browse" className="hover:text-violet-600 transition-colors">Browse</Link>
        <span>/</span>
        <Link href={`/browse?categorySlug=${sound.category.slug}`} className="hover:text-violet-600 transition-colors">
          {sound.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{sound.title}</span>
      </nav>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {/* Title + wishlist */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{sound.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            {sound.author && (
              <p className="text-sm text-gray-400">
                by <span className="text-gray-600 font-medium">{sound.author.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            title={liked ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
              liked ? 'border-rose-200 text-rose-500 bg-rose-50' : 'border-gray-200 text-gray-300 hover:text-rose-400 hover:border-rose-200'
            } ${wishlistLoading ? 'opacity-50' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Player */}
        <div
          onClick={togglePlay}
          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer mb-5 transition-colors ${
            isActive ? 'bg-violet-50 border border-violet-200' : 'bg-gray-50 border border-gray-100 hover:border-violet-100'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              isActive ? 'bg-violet-600' : 'bg-gray-200 hover:bg-violet-100'
            }`}
          >
            {isCurrentlyPlaying ? (
              <svg width="12" height="12" viewBox="0 0 10 10" fill={isActive ? 'white' : '#7c3aed'}>
                <rect x="1" y="0" width="3" height="10" rx="1"/>
                <rect x="6" y="0" width="3" height="10" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 10 12" fill={isActive ? 'white' : '#9ca3af'}>
                <polygon points="0,0 10,6 0,12"/>
              </svg>
            )}
          </button>
          <div className="flex-1">
            <WaveformBar
              data={sound.waveformData}
              isActive={isActive}
              progress={isActive ? usePlayerStore.getState().progress : 0}
            />
          </div>
          <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">
            {formatDuration(sound.durationMs)}
          </span>
        </div>

        {/* Description */}
        {sound.description && (
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{sound.description}</p>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 text-center">
          {[
            { label: 'Format', value: sound.format.toUpperCase() },
            { label: 'Duration', value: formatDuration(sound.durationMs) },
            { label: 'Plays', value: sound.playCount.toLocaleString() + 'x' },
            { label: 'Downloads', value: sound.downloadCount.toLocaleString() + 'x' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-700">{value}</p>
            </div>
          ))}
        </div>

        {/* Tags */}
        {sound.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {sound.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/browse?search=${tag.slug}`}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* File size */}
        {sound.fileSize && (
          <p className="text-xs text-gray-400 mb-5">File size: {formatFileSize(sound.fileSize)}</p>
        )}

        {/* Download error */}
        {downloadError && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {downloadError}
          </div>
        )}

        {/* CTA */}
        <DownloadCTA
          sound={sound}
          inCart={inCart}
          isAuthenticated={isAuthenticated}
          downloading={downloading}
          onDownload={handleDownload}
          onAddCart={() => addItem(sound, 'personal')}
          onRemoveCart={() => removeItem(sound.id)}
          onLogin={() => router.push('/auth/login')}
        />
      </div>

      {/* Ratings & Reviews */}
      <RatingSection soundId={sound.id} />

      {/* Author card */}
      {sound.author && (
        <Link href={`/creators/${sound.author.id}`} className="mt-4 bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3 hover:border-violet-200 hover:bg-violet-50/30 transition-colors group block">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-violet-600 font-semibold text-sm overflow-hidden">
            {sound.author.avatarUrl
              ? <img src={mediaUrl(sound.author.avatarUrl)} alt={sound.author.name} className="w-full h-full rounded-full object-cover" />
              : sound.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Creator</p>
            <p className="text-sm font-medium text-gray-900 group-hover:text-violet-700 transition-colors">{sound.author.name}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </Link>
      )}
    </div>
  );
}

// ─── CTA component — handles all access levels ────────────

interface CTAProps {
  sound: SoundEffect;
  inCart: boolean;
  isAuthenticated: boolean;
  downloading: string | null;
  onDownload: () => void;
  onAddCart: () => void;
  onRemoveCart: () => void;
  onLogin: () => void;
}

function DownloadCTA({ sound, inCart, isAuthenticated, downloading, onDownload, onAddCart, onRemoveCart, onLogin }: CTAProps) {
  const DownloadBtn = ({ label = 'Download' }: { label?: string }) => (
    <button
      onClick={isAuthenticated ? onDownload : onLogin}
      disabled={downloading === sound.id}
      className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {downloading === sound.id ? (
        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Downloading...</>
      ) : (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> {label}</>
      )}
    </button>
  );

  if (sound.accessLevel === 'FREE') {
    return (
      <div className="flex gap-3">
        <DownloadBtn label="Download Free" />
      </div>
    );
  }

  if (sound.accessLevel === 'PRO' || sound.accessLevel === 'BUSINESS') {
    return (
      <div className="flex items-center gap-3">
        <div className="text-center px-2">
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
            {sound.accessLevel === 'PRO' ? 'Requires Pro Plan' : 'Requires Business Plan'}
          </p>
        </div>
        <DownloadBtn label={`Download (${sound.accessLevel})`} />
      </div>
    );
  }

  if (sound.accessLevel === 'PURCHASE') {
    if (sound.isPurchased) {
      return (
        <div className="flex gap-3">
          <DownloadBtn label="Download (Already Purchased)" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <div className="text-center px-2 flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">
            Rp {(sound.price / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-gray-400">{sound.licenseType}</p>
        </div>
        <button
          onClick={inCart ? onRemoveCart : onAddCart}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            inCart
              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {inCart ? 'Remove from Cart' : 'Add to Cart'}
        </button>
      </div>
    );
  }

  return null;
}
