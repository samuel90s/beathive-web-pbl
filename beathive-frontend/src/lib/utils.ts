// src/lib/utils.ts

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Return display URL for media files (avatars, previews).
// Relative /uploads/... paths are prefixed with the backend base URL.
// Absolute URLs (Google OAuth, S3/CDN) are passed through as-is.
export function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1')
    .replace(/\/api\/v1\/?$/, '');
  return `${base}${url}`;
}
