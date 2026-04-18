// src/components/layout/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCartStore } from '@/lib/store/cart.store';
import clsx from 'clsx';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = useCartStore((s) => s.items.length);
  const pathname = usePathname();

  const navLinks = [
    { href: '/browse', label: 'Browse' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-lg font-semibold text-gray-900">beat</span>
          <span className="text-lg font-semibold text-violet-600">hive</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                pathname.startsWith(link.href)
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              {link.label}
            </Link>
          ))}
          {/* Studio — tampil untuk semua user yang login */}
          {isAuthenticated && (
            <Link
              href="/studio"
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5',
                pathname.startsWith('/studio')
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              Studio
            </Link>
          )}
          {/* Admin — hanya untuk ADMIN */}
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-red-50 text-red-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              )}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Wishlist — hanya tampil kalau sudah login */}
          {isAuthenticated && (
            <Link
              href="/wishlist"
              title="Wishlist saya"
              className={clsx(
                'p-2 rounded-lg transition-colors',
                pathname.startsWith('/wishlist')
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50',
              )}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={pathname.startsWith('/wishlist') ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </Link>
          )}

          {/* Cart */}
          <Link
            href="/checkout"
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1h2l2.4 9.6a1 1 0 001 .8h7.2a1 1 0 001-.76L16 5H4"/>
              <circle cx="7.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="13.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-medium">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:block">{user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
