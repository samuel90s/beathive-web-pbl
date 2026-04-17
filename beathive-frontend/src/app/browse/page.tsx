// src/app/browse/page.tsx
'use client';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSounds } from '@/lib/hooks/useSounds';
import SoundRow from '@/components/sounds/SoundRow';
import type { SoundFilters } from '@/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

const CATEGORIES = [
  { slug: '', label: 'Semua' },
  { slug: 'aksi', label: 'Aksi' },
  { slug: 'alam', label: 'Alam' },
  { slug: 'ui-game', label: 'UI / Game' },
  { slug: 'suasana', label: 'Suasana' },
  { slug: 'manusia', label: 'Manusia' },
  { slug: 'kendaraan', label: 'Kendaraan' },
  { slug: 'hewan', label: 'Hewan' },
  { slug: 'elektronik', label: 'Elektronik' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'popular', label: 'Paling Banyak Download' },
  { value: 'mostplayed', label: 'Paling Sering Diputar' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
];

const ACCESS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'FREE', label: 'Gratis' },
  { value: 'PRO', label: 'Pro' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'PURCHASE', label: 'Beli Satuan' },
];

export default function BrowsePage() {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<SoundFilters>({
    sortBy: 'newest',
    page: 1,
    limit: 30,
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  // Baca URL params saat pertama kali (dari link di halaman lain)
  useEffect(() => {
    const category = searchParams.get('categorySlug');
    const search = searchParams.get('search');
    if (category) setFilters((f) => ({ ...f, categorySlug: category }));
    if (search) setSearchInput(search);
  }, []);

  const activeFilters: SoundFilters = { ...filters, search: debouncedSearch || undefined };
  const { data, isLoading, isError } = useSounds(activeFilters);

  const setCategory = useCallback((slug: string) => {
    setFilters((f) => ({ ...f, categorySlug: slug || undefined, page: 1 }));
  }, []);

  const setAccess = useCallback((value: string) => {
    setFilters((f) => ({
      ...f,
      accessLevel: (value || undefined) as SoundFilters['accessLevel'],
      isFree: undefined,
      page: 1,
    }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Search bar */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5L14 14" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Cari sound effect... (explosion, rain, footstep...)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-6">

        {/* Sidebar filters */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-5">

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kategori</p>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setCategory(cat.slug)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      (filters.categorySlug || '') === cat.slug
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Akses</p>
              <div className="space-y-0.5">
                {ACCESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAccess(opt.value)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      (filters.accessLevel ?? '') === opt.value
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Urutkan</p>
              <div className="space-y-0.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilters((f) => ({ ...f, sortBy: opt.value as any }))}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filters.sortBy === opt.value
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Sound list */}
        <div className="flex-1 min-w-0">

          {/* Results count */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              {isLoading ? 'Memuat...' : `${data?.pagination.total ?? 0} sound effect`}
            </p>
          </div>

          {/* List */}
          {isLoading && (
            <div className="space-y-2">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">Gagal memuat data</p>
              <p className="text-sm mt-1">Periksa koneksi dan coba lagi</p>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {data?.items.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-lg">Tidak ada hasil</p>
                  <p className="text-sm mt-1">Coba kata kunci atau filter lain</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data?.items.map((sound) => (
                    <SoundRow key={sound.id} sound={sound} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {(data?.pagination.totalPages ?? 0) > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    disabled={filters.page === 1}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-500">
                    Halaman {filters.page} dari {data?.pagination.totalPages}
                  </span>
                  <button
                    disabled={filters.page === data?.pagination.totalPages}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
