// src/components/layout/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCartStore } from '@/lib/store/cart.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import clsx from 'clsx';
import { mediaUrl } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

function EqIcon() {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[3px] bg-accent rounded-full origin-bottom animate-eq"
          style={{ height: `${[40, 90, 65, 80][i - 1]}%`, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = useCartStore((s) => s.items.length);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.getMy,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const isPaidPlan = subscription?.plan?.slug && subscription.plan.slug !== 'free';

  const navLinks = [
    { href: '/browse', label: 'Browse' },
    ...(!isPaidPlan ? [{ href: '/pricing', label: 'Pricing' }] : []),
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <nav className={clsx(
      'sticky top-0 z-40 transition-all duration-200',
      scrolled
        ? 'bg-surface/80 backdrop-blur-xl border-b border-rim shadow-surface'
        : 'bg-transparent border-b border-transparent',
    )}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <EqIcon />
          </div>
          <span className="text-base font-bold tracking-tight">
            <span className="text-white">beat</span><span className="text-accent-bright">hive</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-all duration-150',
                pathname.startsWith(link.href)
                  ? 'nav-active font-medium'
                  : 'text-[#8b8fa8] hover:text-white hover:bg-white/[0.05]',
              )}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated && (
            <Link
              href="/studio"
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-all duration-150 flex items-center gap-1.5',
                pathname.startsWith('/studio')
                  ? 'nav-active font-medium'
                  : 'text-[#8b8fa8] hover:text-white hover:bg-white/[0.05]',
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              Studio
            </Link>
          )}

          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-all duration-150',
                pathname.startsWith('/admin')
                  ? 'bg-red-500/15 text-red-400 font-medium'
                  : 'text-[#8b8fa8] hover:text-white hover:bg-white/[0.05]',
              )}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex-1" />

        {/* Right */}
        <div className="flex items-center gap-1.5">

          {isAuthenticated && (
            <Link
              href="/wishlist"
              title="Wishlist"
              className={clsx(
                'p-2 rounded-lg transition-all duration-150',
                pathname.startsWith('/wishlist')
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-[#6b6f82] hover:text-rose-400 hover:bg-rose-500/10',
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24"
                fill={pathname.startsWith('/wishlist') ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </Link>
          )}

          <ThemeToggle />

          <Link
            href="/checkout"
            className="relative p-2 text-[#6b6f82] hover:text-white hover:bg-white/[0.05] rounded-lg transition-all duration-150"
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1h2l2.4 9.6a1 1 0 001 .8h7.2a1 1 0 001-.76L16 5H4"/>
              <circle cx="7.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="13.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-glow-sm">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150',
                  menuOpen ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent-bright text-xs font-bold overflow-hidden flex-shrink-0">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <span className="hidden md:block text-sm text-[#c4c6d8] font-medium">{user?.name?.split(' ')[0]}</span>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={clsx('text-[#6b6f82] transition-transform duration-150', menuOpen && 'rotate-180')}>
                  <polyline points="2 4 6 8 10 4"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 card-lift rounded-xl border border-rim shadow-elevated py-1 z-50 animate-fade-up">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#c4c6d8] hover:text-white hover:bg-white/[0.05] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    Dashboard
                  </Link>
                  <Link href="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#c4c6d8] hover:text-white hover:bg-white/[0.05] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    Profile
                  </Link>
                  <div className="border-t border-rim my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login"
                className="px-3 py-1.5 text-sm text-[#8b8fa8] hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/auth/register"
                className="px-4 py-1.5 text-sm font-medium btn-accent rounded-lg">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
