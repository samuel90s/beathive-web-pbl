// src/app/browse/page.tsx
'use client';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSounds } from '@/lib/hooks/useSounds';
import SoundRow from '@/components/sounds/SoundRow';
import type { SoundFilters } from '@/types';
import { useDebounce } from '@/lib/hooks/useDebounce';
import clsx from 'clsx';

// ─── Category definitions ─────────────────────────────────────────────────

const SFX_CATEGORIES = [
  {
    slug: 'foley', name: 'Foley',
    gradient: 'from-rose-500 to-pink-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="17" cy="34" rx="7" ry="5" strokeWidth="2"/>
        <ellipse cx="31" cy="38" rx="7" ry="4" strokeWidth="2"/>
        <path d="M10 34V18c0-3 2-5 5-5h2l5 8 5-12h2c3 0 5 2 5 5v20"/>
      </svg>
    ),
  },
  {
    slug: 'ambience', name: 'Ambience',
    gradient: 'from-amber-400 to-orange-500',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 20 Q12 10 20 20 Q28 30 36 20 Q44 10 48 16"/>
        <path d="M4 30 Q12 20 20 30 Q28 40 36 30 Q44 20 48 26" opacity="0.6"/>
      </svg>
    ),
  },
  {
    slug: 'soundscape', name: 'Soundscape',
    gradient: 'from-teal-500 to-cyan-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <rect x="2"  y="28" width="6"  height="16" rx="2"/>
        <rect x="11" y="20" width="6"  height="24" rx="2"/>
        <rect x="20" y="10" width="6"  height="34" rx="2"/>
        <rect x="29" y="16" width="6"  height="28" rx="2"/>
        <rect x="38" y="24" width="6"  height="20" rx="2"/>
      </svg>
    ),
  },
  {
    slug: 'nature', name: 'Nature & Weather',
    gradient: 'from-green-500 to-emerald-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M24 8 C12 8 8 16 12 22 C8 22 6 26 10 28 H38 C42 26 40 22 36 22 C40 16 36 8 24 8Z" strokeLinejoin="round"/>
        <line x1="16" y1="33" x2="14" y2="40"/>
        <line x1="24" y1="33" x2="22" y2="40"/>
        <line x1="32" y1="33" x2="30" y2="40"/>
      </svg>
    ),
  },
  {
    slug: 'explosions', name: 'Explosions',
    gradient: 'from-red-500 to-orange-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <path d="M24 4 L28 18 L40 12 L32 22 L46 24 L32 26 L40 36 L28 30 L24 44 L20 30 L8 36 L16 26 L2 24 L16 22 L8 12 L20 18 Z"/>
      </svg>
    ),
  },
  {
    slug: 'weapons', name: 'Weapons & Combat',
    gradient: 'from-slate-600 to-zinc-700',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="18"/>
        <circle cx="24" cy="24" r="4"/>
        <line x1="24" y1="6" x2="24" y2="14"/>
        <line x1="24" y1="34" x2="24" y2="42"/>
        <line x1="6" y1="24" x2="14" y2="24"/>
        <line x1="34" y1="24" x2="42" y2="24"/>
      </svg>
    ),
  },
  {
    slug: 'vehicles', name: 'Vehicles',
    gradient: 'from-blue-500 to-indigo-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 30 L10 18 Q12 14 16 14 H32 Q36 14 38 18 L42 30 V36 H6 Z"/>
        <circle cx="14" cy="36" r="5" fill="currentColor" strokeWidth="0"/>
        <circle cx="34" cy="36" r="5" fill="currentColor" strokeWidth="0"/>
        <circle cx="14" cy="36" r="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="34" cy="36" r="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M16 14 L20 24 H28 L32 14"/>
      </svg>
    ),
  },
  {
    slug: 'ui-game', name: 'UI & Game',
    gradient: 'from-violet-500 to-purple-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="14" width="40" height="24" rx="8"/>
        <line x1="16" y1="22" x2="16" y2="30"/>
        <line x1="12" y1="26" x2="20" y2="26"/>
        <circle cx="32" cy="22" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="38" cy="26" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="32" cy="30" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="26" cy="26" r="2" fill="currentColor" strokeWidth="0"/>
      </svg>
    ),
  },
  {
    slug: 'horror', name: 'Horror',
    gradient: 'from-purple-900 to-indigo-950',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <path d="M24 4 C14 4 8 12 8 22 V38 L12 34 L16 38 L20 34 L24 38 L28 34 L32 38 L36 34 L40 38 V22 C40 12 34 4 24 4Z"/>
        <circle cx="18" cy="22" r="3" fill="white"/>
        <circle cx="30" cy="22" r="3" fill="white"/>
        <circle cx="19" cy="22" r="1.5" fill="#1e1b4b"/>
        <circle cx="31" cy="22" r="1.5" fill="#1e1b4b"/>
      </svg>
    ),
  },
  {
    slug: 'human', name: 'Human & Crowd',
    gradient: 'from-amber-400 to-yellow-500',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <circle cx="24" cy="10" r="6"/>
        <path d="M14 44 V32 C14 26 18 22 24 22 C30 22 34 26 34 32 V44"/>
        <circle cx="10" cy="14" r="4" opacity="0.6"/>
        <path d="M4 40 V30 C4 25 7 22 10 22" opacity="0.6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/>
        <circle cx="38" cy="14" r="4" opacity="0.6"/>
        <path d="M44 40 V30 C44 25 41 22 38 22" opacity="0.6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    slug: 'animals', name: 'Animals',
    gradient: 'from-lime-500 to-green-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <ellipse cx="24" cy="30" rx="12" ry="10"/>
        <ellipse cx="14" cy="14" rx="5" ry="7" transform="rotate(-15 14 14)"/>
        <ellipse cx="34" cy="14" rx="5" ry="7" transform="rotate(15 34 14)"/>
        <ellipse cx="10" cy="26" rx="4" ry="6" transform="rotate(-30 10 26)"/>
        <ellipse cx="38" cy="26" rx="4" ry="6" transform="rotate(30 38 26)"/>
        <circle cx="21" cy="30" r="2.5" fill="white" opacity="0.4"/>
        <circle cx="27" cy="30" r="2.5" fill="white" opacity="0.4"/>
      </svg>
    ),
  },
  {
    slug: 'electronic', name: 'Electronic & Sci-Fi',
    gradient: 'from-cyan-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="14" y="14" width="20" height="20" rx="3"/>
        <circle cx="19" cy="19" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="29" cy="19" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="19" cy="29" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="29" cy="29" r="2" fill="currentColor" strokeWidth="0"/>
        <line x1="14" y1="24" x2="6" y2="24"/>
        <line x1="34" y1="24" x2="42" y2="24"/>
        <line x1="24" y1="14" x2="24" y2="6"/>
        <line x1="24" y1="34" x2="24" y2="42"/>
      </svg>
    ),
  },
  {
    slug: 'comedy', name: 'Comedy & Cartoon',
    gradient: 'from-yellow-400 to-amber-500',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6 H34 Q40 6 40 12 V28 Q40 34 34 34 H28 L20 42 V34 H14 Q8 34 8 28 V12 Q8 6 14 6"/>
        <circle cx="18" cy="20" r="2" fill="currentColor" strokeWidth="0"/>
        <circle cx="30" cy="20" r="2" fill="currentColor" strokeWidth="0"/>
        <path d="M17 26 Q24 32 31 26"/>
      </svg>
    ),
  },
  {
    slug: 'magic', name: 'Magic & Fantasy',
    gradient: 'from-pink-500 to-violet-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <path d="M24 4 L26.4 16 L36 10 L30 20 L42 22 L30 24 L36 34 L26.4 28 L24 40 L21.6 28 L12 34 L18 24 L6 22 L18 20 L12 10 L21.6 16 Z" opacity="0.9"/>
        <circle cx="10" cy="10" r="3" opacity="0.6"/>
        <circle cx="38" cy="8" r="2" opacity="0.5"/>
        <circle cx="42" cy="36" r="2.5" opacity="0.6"/>
        <circle cx="8" cy="38" r="2" opacity="0.5"/>
      </svg>
    ),
  },
  {
    slug: 'sports', name: 'Sports & Action',
    gradient: 'from-emerald-500 to-green-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="currentColor">
        <path d="M30 4 L20 20 H28 L18 44 L36 22 H26 Z"/>
      </svg>
    ),
  },
  {
    slug: 'industrial', name: 'Industrial',
    gradient: 'from-stone-500 to-zinc-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="8"/>
        <circle cx="24" cy="24" r="3" fill="currentColor" strokeWidth="0"/>
        <path d="M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42"/>
        <path d="M11.5 11.5 L15.7 15.7 M32.3 32.3 L36.5 36.5"/>
        <path d="M36.5 11.5 L32.3 15.7 M15.7 32.3 L11.5 36.5"/>
      </svg>
    ),
  },
];

const MUSIC_CATEGORIES = [
  {
    slug: 'sound-scoring', name: 'Sound Scoring',
    gradient: 'from-violet-600 to-indigo-700',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3" fill="currentColor" strokeWidth="0"/>
        <circle cx="18" cy="16" r="3" fill="currentColor" strokeWidth="0"/>
        <rect x="24" y="10" width="4" height="28" rx="1" fill="currentColor" strokeWidth="0"/>
        <rect x="30" y="16" width="4" height="22" rx="1" fill="currentColor" strokeWidth="0"/>
        <rect x="36" y="6" width="4" height="32" rx="1" fill="currentColor" strokeWidth="0"/>
      </svg>
    ),
  },
  {
    slug: 'cinematic', name: 'Cinematic',
    gradient: 'from-indigo-600 to-blue-800',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="14" width="40" height="26" rx="3"/>
        <path d="M4 20 H44 M12 14 L16 8 M24 14 L28 8 M36 14 L40 8"/>
        <circle cx="24" cy="30" r="6"/>
        <polygon points="22,27 22,33 29,30" fill="currentColor" strokeWidth="0"/>
      </svg>
    ),
  },
  {
    slug: 'electronic-music', name: 'Electronic Music',
    gradient: 'from-cyan-500 to-teal-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <rect x="4" y="28" width="40" height="12" rx="3"/>
        <line x1="8" y1="28" x2="8" y2="40"/>
        <line x1="16" y1="28" x2="16" y2="40"/>
        <line x1="24" y1="28" x2="24" y2="40"/>
        <line x1="32" y1="28" x2="32" y2="40"/>
        <line x1="40" y1="28" x2="40" y2="40"/>
        <circle cx="8" cy="22" r="3" fill="currentColor" strokeWidth="0"/>
        <circle cx="20" cy="18" r="3" fill="currentColor" strokeWidth="0"/>
        <circle cx="32" cy="14" r="3" fill="currentColor" strokeWidth="0"/>
        <path d="M8 22 Q14 18 20 18 Q26 18 32 14"/>
      </svg>
    ),
  },
  {
    slug: 'acoustic', name: 'Acoustic',
    gradient: 'from-amber-500 to-orange-600',
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 8 V28 C30 28 36 30 36 36 C36 40 33 43 28 43 C23 43 20 40 20 36 C20 30 26 28 28 28"/>
        <line x1="28" y1="8" x2="38" y2="6"/>
        <line x1="28" y1="12" x2="38" y2="10"/>
        <path d="M8 20 C6 18 6 16 10 16 S14 18 12 20" fill="currentColor" strokeWidth="0" opacity="0.5"/>
        <path d="M4 24 C1 20 1 16 7 16 S13 20 10 24" opacity="0.4"/>
      </svg>
    ),
  },
];

const TYPE_MENU = [
  { type: 'sfx',   label: 'SFX',   sub: SFX_CATEGORIES },
  { type: 'music', label: 'Music', sub: MUSIC_CATEGORIES },
];

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'trending',   label: 'Trending' },
  { value: 'popular',    label: 'Most Downloaded' },
  { value: 'mostplayed', label: 'Most Played' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const ACCESS_OPTIONS = [
  { value: '',         label: 'All' },
  { value: 'FREE',     label: 'Free' },
  { value: 'PRO',      label: 'Pro' },
  { value: 'PURCHASE', label: 'Buy Single' },
];

// ─── Category Grid ────────────────────────────────────────────────────────

function CategoryGrid({ type, onSelect }: { type: string; onSelect: (slug: string) => void }) {
  const group = TYPE_MENU.find((g) => g.type === type);
  if (!group) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">
        {group.label} — Categories
        <span className="ml-2 text-sm font-normal text-[#5a5d72]">{group.sub.length} categories</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {group.sub.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={clsx(
              'relative rounded-2xl p-5 flex flex-col justify-between cursor-pointer overflow-hidden group',
              'hover:scale-[1.03] hover:shadow-elevated transition-all duration-200',
              'bg-gradient-to-br',
              cat.gradient,
            )}
            style={{ aspectRatio: '4/3' }}
          >
            {/* Glow overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white rounded-2xl" />

            {/* Subtle radial highlight */}
            <div className="absolute inset-0 opacity-15"
              style={{ background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
            />

            {/* Icon */}
            <div className="relative text-white/90 group-hover:text-white transition-colors">
              {cat.icon}
            </div>

            {/* Name */}
            <p className="relative text-left text-sm font-bold text-white leading-tight mt-2">
              {cat.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Browse ──────────────────────────────────────────────────────────

function BrowseContent() {
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<'default' | 'grid' | 'list'>('default');
  const [activeType, setActiveType] = useState<string>('');
  const [filters, setFilters] = useState<SoundFilters>({ sortBy: 'newest', page: 1, limit: 30 });
  const [soundType, setSoundType] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);

  useEffect(() => {
    const category = searchParams.get('categorySlug');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    if (category) { setFilters((f) => ({ ...f, categorySlug: category })); setViewMode('list'); }
    if (search) setSearchInput(search);
    if (page) {
      const p = Math.max(1, Math.min(1000, parseInt(page, 10) || 1));
      setFilters((f) => ({ ...f, page: p }));
    }
  }, []);

  const activeFilters: SoundFilters = {
    ...filters,
    search: debouncedSearch || undefined,
    minPrice: debouncedMinPrice ? parseInt(debouncedMinPrice) : undefined,
    maxPrice: debouncedMaxPrice ? parseInt(debouncedMaxPrice) : undefined,
    soundType: soundType || undefined,
  };

  const showSoundList = viewMode === 'default' || viewMode === 'list';
  const { data, isLoading, isError } = useSounds(activeFilters, showSoundList);

  const handleSelectType = useCallback((type: string) => {
    setActiveType(type);
    setSoundType('');
    setFilters((f) => ({ ...f, categorySlug: undefined, page: 1 }));
    setViewMode('grid');
  }, []);

  const handleSelectCategory = useCallback((slug: string) => {
    setSoundType('');
    setFilters((f) => ({ ...f, categorySlug: slug, page: 1 }));
    setViewMode('list');
    const parent = TYPE_MENU.find((g) => g.sub.some((s) => s.slug === slug));
    if (parent) setActiveType(parent.type);
  }, []);

  const setAccess = useCallback((value: string) => {
    setFilters((f) => ({
      ...f,
      accessLevel: (value || undefined) as SoundFilters['accessLevel'],
      isFree: undefined,
      page: 1,
    }));
  }, []);

  const activeCatName = TYPE_MENU.flatMap((g) => g.sub).find((s) => s.slug === filters.categorySlug)?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Search bar */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a4d5e] w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search sound effects..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); if (e.target.value) setViewMode('default'); }}
          className="w-full pl-11 pr-4 py-3 input-dark rounded-xl text-sm"
        />
      </div>

      <div className="flex gap-6">

        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <div className="card rounded-xl p-4 space-y-5 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-none">

            {/* Menu */}
            <div>
              <p className="text-[10px] font-semibold text-[#4a4d5e] uppercase tracking-widest mb-2">Menu</p>
              <div className="space-y-0.5">
                {TYPE_MENU.map((group) => (
                  <div key={group.type}>
                    {/* Parent type button */}
                    <button
                      onClick={() => handleSelectType(group.type)}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150',
                        activeType === group.type && viewMode === 'grid'
                          ? 'bg-accent/15 text-accent-bright'
                          : 'text-[#8b8fa8] hover:text-white hover:bg-white/[0.05]',
                      )}
                    >
                      {group.label}
                    </button>
                    {/* Sub categories */}
                    <div className="ml-2 mt-0.5 space-y-0.5">
                      {group.sub.map((sub) => (
                        <button
                          key={sub.slug}
                          onClick={() => handleSelectCategory(sub.slug)}
                          className={clsx(
                            'w-full text-left px-3 py-1 rounded-lg text-xs transition-all duration-150',
                            filters.categorySlug === sub.slug && viewMode === 'list'
                              ? 'bg-accent/15 text-accent-bright font-medium'
                              : 'text-[#5a5d72] hover:text-[#c4c6d8] hover:bg-white/[0.04]',
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters — only in list mode */}
            {showSoundList && (
              <>
                <div>
                  <p className="text-[10px] font-semibold text-[#4a4d5e] uppercase tracking-widest mb-2">Access</p>
                  <div className="space-y-0.5">
                    {ACCESS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAccess(opt.value)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          (filters.accessLevel ?? '') === opt.value
                            ? 'bg-accent/15 text-accent-bright font-medium'
                            : 'text-[#6b6f82] hover:text-[#c4c6d8] hover:bg-white/[0.05]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#4a4d5e] uppercase tracking-widest mb-2">Price (Rp)</p>
                  <div className="space-y-1.5">
                    <input type="number" min="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min"
                      className="w-full px-2.5 py-1.5 input-dark rounded-lg text-xs" />
                    <input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max"
                      className="w-full px-2.5 py-1.5 input-dark rounded-lg text-xs" />
                    {(minPrice || maxPrice) && (
                      <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-xs text-accent-bright hover:underline">Clear</button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#4a4d5e] uppercase tracking-widest mb-2">Sort By</p>
                  <div className="space-y-0.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setFilters((f) => ({ ...f, sortBy: opt.value as any }))}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          filters.sortBy === opt.value
                            ? 'bg-accent/15 text-accent-bright font-medium'
                            : 'text-[#6b6f82] hover:text-[#c4c6d8] hover:bg-white/[0.05]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Category grid */}
          {viewMode === 'grid' && (
            <CategoryGrid type={activeType} onSelect={handleSelectCategory} />
          )}

          {/* Sound list */}
          {showSoundList && (
            <>
              <div className="flex items-center gap-3 mb-3">
                {activeCatName && viewMode === 'list' && (
                  <button
                    onClick={() => handleSelectType(activeType)}
                    className="flex items-center gap-1 text-sm text-[#6b6f82] hover:text-accent-bright transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="9 2 4 7 9 12"/>
                    </svg>
                    {TYPE_MENU.find((g) => g.type === activeType)?.label ?? 'Back'}
                  </button>
                )}
                <p className="text-sm text-[#5a5d72]">
                  {isLoading ? 'Loading...' : `${data?.pagination.total ?? 0} sound effects${activeCatName ? ` · ${activeCatName}` : ''}`}
                </p>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="h-16 card rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {isError && (
                <div className="text-center py-16 text-[#5a5d72]">
                  <p className="text-base font-medium text-[#8b8fa8]">Failed to load sounds</p>
                  <p className="text-sm mt-1">Check your connection and try again</p>
                </div>
              )}

              {!isLoading && !isError && (
                <>
                  {data?.items.length === 0 ? (
                    <div className="text-center py-20 card rounded-2xl">
                      <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a5d72" strokeWidth="1.5" strokeLinecap="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#8b8fa8]">No sounds found</p>
                      <p className="text-xs text-[#5a5d72] mt-1">Try different keywords or filters</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data?.items.map((sound) => (
                        <SoundRow key={sound.id} sound={sound} />
                      ))}
                    </div>
                  )}

                  {(data?.pagination.totalPages ?? 0) > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button disabled={filters.page === 1}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                        className="px-4 py-2 text-sm rounded-lg border border-rim text-[#8b8fa8] disabled:opacity-30 hover:bg-white/[0.05] hover:text-white transition-colors">
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm text-[#5a5d72]">
                        Page {filters.page} of {data?.pagination.totalPages}
                      </span>
                      <button disabled={filters.page === data?.pagination.totalPages}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                        className="px-4 py-2 text-sm rounded-lg border border-rim text-[#8b8fa8] disabled:opacity-30 hover:bg-white/[0.05] hover:text-white transition-colors">
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="h-12 bg-surface rounded-xl border border-rim animate-pulse mb-6" />
        <div className="flex gap-6">
          <div className="w-48 hidden md:block">
            <div className="card rounded-xl h-64 animate-pulse" />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="card rounded-2xl animate-pulse" style={{ aspectRatio: '4/3' }} />
            ))}
          </div>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
