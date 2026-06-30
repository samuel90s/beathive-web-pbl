'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/store/auth.store';

const ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  content: 'M4 6h16M4 12h16M4 18h10',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  finance: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
};

const CONTENT_LINKS = [
  { href: '/admin/sounds', label: 'Sound Review' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/tags', label: 'Tags' },
  { href: '/admin/testimonials', label: 'Testimonials' },
];

const FINANCE_LINKS = [
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
];

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function Submenu({
  links,
  pathname,
}: {
  links: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div className="ml-5 mt-1 pl-3 border-l border-rim space-y-0.5">
      {links.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'block px-3 py-2 rounded-lg text-[13px] transition-colors',
              isActive
                ? 'text-accent-bright bg-accent/10 font-medium'
                : 'text-[#6b6f82] hover:text-white hover:bg-white/[0.03]',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const contentActive = CONTENT_LINKS.some((item) => pathname.startsWith(item.href));
  const financeActive = FINANCE_LINKS.some((item) => pathname.startsWith(item.href));
  const [contentOpen, setContentOpen] = useState(contentActive);
  const [financeOpen, setFinanceOpen] = useState(financeActive);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    if (user && user.role !== 'ADMIN') router.replace('/browse');
  }, [_hasHydrated, isAuthenticated, router, user]);

  useEffect(() => {
    if (contentActive) setContentOpen(true);
    if (financeActive) setFinanceOpen(true);
  }, [contentActive, financeActive]);

  if (!_hasHydrated || !user || user.role !== 'ADMIN') return null;

  const primaryClass = (active: boolean) => clsx(
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
    active
      ? 'bg-accent/10 text-accent-bright font-medium'
      : 'text-[#8b8fa8] hover:bg-white/[0.03] hover:text-white',
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/[0.03] lg:flex">
      <aside className="hidden lg:flex w-56 bg-surface border-r border-rim flex-col fixed top-16 bottom-0 z-10">
        <div className="px-5 py-5 border-b border-rim">
          <p className="text-[10px] font-semibold text-[#5a5d72] uppercase tracking-widest">Workspace</p>
          <p className="text-sm font-semibold text-white mt-1">Admin Panel</p>
          <p className="text-xs text-[#5a5d72] mt-0.5 truncate">{user.name}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link href="/admin" className={primaryClass(pathname === '/admin')}>
            <Icon path={ICONS.dashboard} />
            Dashboard
          </Link>

          <div>
            <button onClick={() => setContentOpen((open) => !open)}
              className={primaryClass(contentActive)}>
              <Icon path={ICONS.content} />
              <span className="flex-1 text-left">Content</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className={clsx('transition-transform', contentOpen && 'rotate-180')}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {contentOpen && <Submenu links={CONTENT_LINKS} pathname={pathname} />}
          </div>

          <Link href="/admin/users" className={primaryClass(pathname.startsWith('/admin/users'))}>
            <Icon path={ICONS.users} />
            Users
          </Link>

          <div>
            <button onClick={() => setFinanceOpen((open) => !open)}
              className={primaryClass(financeActive)}>
              <Icon path={ICONS.finance} />
              <span className="flex-1 text-left">Finance</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className={clsx('transition-transform', financeOpen && 'rotate-180')}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {financeOpen && <Submenu links={FINANCE_LINKS} pathname={pathname} />}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-rim">
          <Link href="/browse"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b6f82] hover:text-white hover:bg-white/[0.03] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            View public site
          </Link>
        </div>
      </aside>

      <div className="lg:hidden border-b border-rim bg-surface px-4 py-3 overflow-x-auto">
        <nav className="flex gap-2 min-w-max">
          {[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/sounds', label: 'Content' },
            { href: '/admin/users', label: 'Users' },
            { href: '/admin/orders', label: 'Finance' },
          ].map((item) => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : item.label === 'Content'
                ? contentActive
                : item.label === 'Finance'
                  ? financeActive
                  : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm',
                  active ? 'bg-accent/10 text-accent-bright font-medium' : 'text-[#8b8fa8]',
                )}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 lg:ml-56 p-4 sm:p-6 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
