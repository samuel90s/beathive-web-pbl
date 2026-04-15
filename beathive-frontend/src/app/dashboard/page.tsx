// src/app/dashboard/page.tsx
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { ordersApi } from '@/lib/api/orders';
import { formatPrice, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const isAuth = useRequireAuth();
  const user = useAuthStore((s) => s.user);

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

  if (!isAuth || !user) return null;

  const planColors = { free: 'gray', pro: 'violet', business: 'amber' } as const;
  const planColor = planColors[subscription?.plan.slug ?? 'free'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-lg font-semibold">
          {user.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {/* Subscription card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Subscription</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              planColor === 'violet' ? 'bg-violet-100 text-violet-700' :
              planColor === 'amber' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {subscription?.plan.name ?? 'Free'}
            </span>
          </div>

          {subscription && (
            <>
              {/* Download usage bar */}
              {!subscription.plan.unlimited && subscription.usage && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Download bulan ini</span>
                    <span>{subscription.usage.downloadsThisMonth} / {subscription.plan.downloadLimit}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (subscription.usage.downloadsThisMonth / subscription.plan.downloadLimit) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {subscription.plan.unlimited && (
                <p className="text-sm text-teal-600 mb-4">Download unlimited aktif</p>
              )}

              <div className="flex items-center gap-3">
                {subscription.plan.slug !== 'business' && (
                  <Link href="/pricing"
                    className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                    Upgrade Plan
                  </Link>
                )}
                {subscription.status === 'ACTIVE' && subscription.plan.slug !== 'free' && (
                  <p className="text-xs text-gray-400">
                    Aktif hingga {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Statistik</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Total pembelian</p>
              <p className="text-xl font-semibold text-gray-900">
                {orders?.filter((o) => o.status === 'PAID').length ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total spend</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatPrice(
                  orders?.filter((o) => o.status === 'PAID')
                    .reduce((s, o) => s + o.totalAmount, 0) ?? 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order history */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-5 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Riwayat Pembelian</h2>
        </div>

        {!orders?.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Belum ada pembelian.{' '}
            <Link href="/browse" className="text-violet-600 hover:underline">Mulai browse</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'PAID' ? 'bg-teal-50 text-teal-700' :
                        order.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {order.status === 'PAID' ? 'Lunas' : order.status === 'PENDING' ? 'Menunggu' : 'Gagal'}
                      </span>
                      {order.invoice && (
                        <span className="text-xs text-gray-400">{order.invoice.invoiceNumber}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {order.items.map((item) => (
                        <p key={item.id} className="text-sm text-gray-700 truncate">
                          {item.soundEffect.title}
                          <span className="text-xs text-gray-400 ml-1">({item.licenseType})</span>
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{formatPrice(order.totalAmount)}</p>
                    {order.items.some((i) => i.licensePdfUrl) && (
                      <button className="text-xs text-violet-600 hover:underline mt-1">
                        Unduh Lisensi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
