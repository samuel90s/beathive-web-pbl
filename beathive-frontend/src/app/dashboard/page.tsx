// src/app/dashboard/page.tsx
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { ordersApi } from '@/lib/api/orders';
import { formatPrice, formatDate, mediaUrl } from '@/lib/utils';
import { toast } from '@/lib/store/toast.store';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface WalletData { balance: number; totalEarned: number; }

const QUICK_LINKS = [
  {
    href: '/dashboard/downloads',
    label: 'Download History',
    desc: 'Semua sound yang pernah didownload',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
  },
  {
    href: '/dashboard/orders',
    label: 'Pesanan',
    desc: 'Riwayat pembelian & invoice',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    href: '/dashboard/earnings',
    label: 'Earnings',
    desc: 'Pendapatan & penarikan dana',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    color: 'text-accent-bright',
    bg: 'bg-accent/10',
  },
  {
    href: '/studio',
    label: 'Upload Sound',
    desc: 'Tambah sound baru ke platform',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

function DashboardContent() {
  const isAuth = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success' || searchParams.get('paid') === '1') {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.getMy,
    enabled: isAuth,
  });

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getMyOrders,
    enabled: isAuth,
  });

  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const token = accessToken || sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/earnings/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : { balance: 0, totalEarned: 0 };
    },
    enabled: isAuth,
  });

  if (!isAuth || !user) return (
    <div className="px-6 py-8 space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-3 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <div key={i} className="card rounded-2xl p-4 h-20 animate-pulse" />)}
      </div>
      <div className="card rounded-2xl p-5 h-24 animate-pulse" />
    </div>
  );

  const planColor = subscription?.plan.slug === 'pro' ? 'violet' : subscription?.plan.slug === 'business' ? 'amber' : 'gray';
  const paidOrders = orders?.filter((o) => o.status === 'PAID') ?? [];

  return (
    <>
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-lift rounded-2xl border border-rim w-full max-w-sm p-6 shadow-elevated">
            <p className="text-sm text-[#c4c6d8] mb-5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-rim text-[#8b8fa8] hover:bg-white/[0.05] transition-colors">
                Tidak
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                Ya, batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-8 py-8 pb-28">

        {/* Profile header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center text-accent-bright text-2xl font-bold overflow-hidden ring-2 ring-violet-500/20 flex-shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(user.avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
            ) : user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-[#6b6f82] mt-0.5">{user.email}</p>
          </div>
          <Link href="/profile"
            className="ml-auto flex items-center gap-2 text-sm text-[#6b6f82] hover:text-[#c4c6d8] transition-colors px-4 py-2 rounded-xl border border-rim hover:border-white/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Profil
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pembelian', value: paidOrders.length, color: 'text-white' },
            { label: 'Total Belanja', value: formatPrice(paidOrders.reduce((s, o) => s + o.totalAmount, 0)), color: 'text-white' },
            { label: 'Total Earning', value: formatPrice(wallet?.totalEarned ?? 0), color: 'text-accent-bright' },
            { label: 'Saldo', value: formatPrice(wallet?.balance ?? 0), color: 'text-teal-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card rounded-2xl p-5">
              <p className="text-sm text-[#5a5d72] mb-1.5">{label}</p>
              <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Subscription card */}
        <div className="card rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                planColor === 'violet' ? 'bg-violet-500/20' : planColor === 'amber' ? 'bg-amber-500/20' : 'bg-white/[0.05]'
              }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={planColor === 'violet' ? '#8b5cf6' : planColor === 'amber' ? '#f59e0b' : '#6b7280'}
                  strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{subscription?.plan.name ?? 'Free'} Plan</p>
                {subscription?.status === 'ACTIVE' && subscription.plan.slug !== 'free' && (
                  <p className="text-xs text-[#5a5d72]">Aktif sampai {formatDate(subscription.currentPeriodEnd)}</p>
                )}
                {subscription?.status === 'CANCELLED' && (
                  <p className="text-xs text-amber-400">Dibatalkan — akses sampai {formatDate(subscription.currentPeriodEnd)}</p>
                )}
              </div>
            </div>

            {/* Download usage bar */}
            {subscription && !subscription.plan.unlimited && subscription.usage && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-[#5a5d72]">Download bulan ini</p>
                  <p className="text-xs font-medium text-[#8b8fa8]">
                    {subscription.usage.downloadsThisMonth} / {subscription.plan.downloadLimit}
                  </p>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      subscription.usage.downloadsThisMonth / subscription.plan.downloadLimit > 0.8
                        ? 'bg-amber-500' : 'bg-violet-500'
                    }`}
                    style={{ width: `${Math.min(100, (subscription.usage.downloadsThisMonth / subscription.plan.downloadLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              {subscription?.plan.slug !== 'business' && (
                <Link href="/pricing" className="px-3 py-1.5 text-xs font-medium btn-accent rounded-lg transition-colors">
                  Upgrade
                </Link>
              )}
              {subscription?.plan.slug !== 'free' && subscription?.status === 'ACTIVE' && (
                <button
                  onClick={() => setConfirmModal({
                    message: 'Batalkan subscription? Akses tetap aktif sampai akhir periode billing.',
                    onConfirm: async () => {
                      try {
                        const token = accessToken || sessionStorage.getItem('accessToken');
                        const res = await fetch(`${API_URL}/subscriptions/me`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ['subscription'] });
                          toast.success('Subscription dibatalkan.');
                        } else {
                          toast.error('Gagal membatalkan subscription');
                        }
                      } catch {
                        toast.error('Gagal membatalkan subscription');
                      }
                    },
                  })}
                  className="px-3 py-1.5 text-xs font-medium border border-rim text-[#6b6f82] hover:text-red-400 hover:border-red-500/30 rounded-lg transition-colors"
                >
                  Batalkan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick navigation cards */}
        <div>
          <p className="text-xs font-semibold text-[#3a3c4e] uppercase tracking-widest mb-4">Menu Cepat</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card rounded-2xl p-5 flex items-start gap-4 hover:border-white/[0.1] hover:bg-lift transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-white group-hover:text-accent-bright transition-colors">{item.label}</p>
                  <p className="text-sm text-[#5a5d72] mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <svg className="flex-shrink-0 text-[#3a3c4e] group-hover:text-[#6b6f82] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="px-6 py-8 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-3 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="card rounded-2xl p-4 h-20 animate-pulse" />)}
        </div>
        <div className="card rounded-2xl p-5 h-24 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="card rounded-2xl p-16 animate-pulse" />)}
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
