// src/app/dashboard/page.tsx
'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { toast } from '@/lib/store/toast.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { ordersApi } from '@/lib/api/orders';
import { useDownload } from '@/lib/hooks/useDownload';
import { formatPrice, formatDate, mediaUrl } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

const SERVICE_FEE_PERCENT = 5;
const TAX_PERCENT = 11;

interface InvoiceData {
  orderId: string;
  invoiceNumber: string;
  issuedAt: string;
  customer: { name: string; email: string };
  items: { title: string; licenseType: string; price: number }[];
  subtotal: number;
}

interface Withdrawal { id: string; amountRp: number; status: string; bankName: string; accountNo: string; createdAt: string; }
interface WalletData { balance: number; totalEarned: number; withdrawals: Withdrawal[]; }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PAID:      { label: 'Paid',             cls: 'bg-teal/10 text-teal border border-teal-200' },
  PENDING:   { label: 'Awaiting Payment', cls: 'bg-amber-500/10 text-amber-400 border border-amber-200' },
  CANCELLED: { label: 'Cancelled',        cls: 'bg-white/[0.05] text-[#6b6f82] border border-rim' },
  FAILED:    { label: 'Failed',           cls: 'bg-red-500/10 text-red-400 border border-red-200' },
};

const WITHDRAWAL_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Processing', cls: 'bg-amber-500/10 text-amber-400 border border-amber-200' },
  PAID:     { label: 'Completed', cls: 'bg-teal/10 text-teal border border-teal-200' },
  REJECTED: { label: 'Rejected',  cls: 'bg-red-500/10 text-red-400 border border-red-200' },
};

function DashboardPage() {
  const isAuth = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const { accessToken } = useAuthStore();
  const { download, downloading } = useDownload();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'payouts'>('purchases');
  const [popupInvoice, setPopupInvoice] = useState<InvoiceData | null>(null);
  const [popupDownloading, setPopupDownloading] = useState(false);

  // Refresh orders when coming from success page
  useEffect(() => {
    if (searchParams.get('upgrade') === 'success' || searchParams.get('paid') === '1') {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  }, []);

  // Tutup modal dengan ESC
  const closePopup = useCallback(() => setPopupInvoice(null), []);
  useEffect(() => {
    if (!popupInvoice) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [popupInvoice, closePopup]);

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
      const res = await fetch(`${API_URL}/earnings/wallet`, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : { balance: 0, totalEarned: 0, withdrawals: [] };
    },
    enabled: isAuth,
  });

  const handleDownloadInvoice = async (orderId: string, invoiceNumber: string) => {
    setInvoiceLoading(orderId);
    try { await ordersApi.downloadInvoicePdf(orderId, invoiceNumber); }
    catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to download invoice PDF');
    } finally { setInvoiceLoading(null); }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    setActionLoading(orderId + '-cancel');
    try {
      await ordersApi.cancelOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order');
    } finally { setActionLoading(null); }
  };

  const handleContinuePayment = async (orderId: string) => {
    setActionLoading(orderId + '-pay');
    try {
      const { snapToken } = await ordersApi.getSnapToken(orderId);
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            try { await ordersApi.verifyPayment(orderId); } catch { /* webhook handles this */ }
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            try {
              const inv = await ordersApi.getInvoice(orderId);
              setPopupInvoice(inv);
            } catch { /* invoice may not be ready yet, user can check purchase history */ }
          },
          onPending: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
          onError: () => toast.error('Payment failed. Please try again.'),
          onClose: () => {},
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to open payment session');
    } finally { setActionLoading(null); }
  };

  const handleDownloadPopupPdf = async () => {
    if (!popupInvoice) return;
    setPopupDownloading(true);
    try { await ordersApi.downloadInvoicePdf(popupInvoice.orderId, popupInvoice.invoiceNumber); }
    catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to download invoice PDF');
    } finally { setPopupDownloading(false); }
  };

  if (!isAuth || !user) return null;

  const planColor = subscription?.plan.slug === 'pro' ? 'violet' : subscription?.plan.slug === 'business' ? 'amber' : 'gray';
  const paidOrders = orders?.filter((o) => o.status === 'PAID') ?? [];

  const popupServiceFee = popupInvoice ? Math.round(popupInvoice.subtotal * SERVICE_FEE_PERCENT / 100) : 0;
  const popupTax = popupInvoice ? Math.round((popupInvoice.subtotal + popupServiceFee) * TAX_PERCENT / 100) : 0;
  const popupTotal = popupInvoice ? popupInvoice.subtotal + popupServiceFee + popupTax : 0;

  return (
    <>
    {/* Invoice popup setelah lanjut bayar */}
    {popupInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="card-lift rounded-2xl shadow-elevated w-full max-w-md overflow-hidden border border-rim">
          <div className="bg-accent px-6 py-5 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold">BeatHive</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Payment Successful ✓</span>
            </div>
            <p className="text-sm text-accent-bright/80">{popupInvoice.invoiceNumber}</p>
            <p className="text-xs text-accent-bright/60 mt-0.5">{formatDate(popupInvoice.issuedAt)}</p>
          </div>
          <div className="px-6 py-4">
            <div className="mb-4 pb-3 border-b border-gray-50">
              <p className="text-xs text-[#6b6f82] mb-1">Customer</p>
              <p className="text-sm font-medium text-[#c4c6d8]">{popupInvoice.customer.name}</p>
              <p className="text-xs text-[#6b6f82]">{popupInvoice.customer.email}</p>
            </div>
            <div className="space-y-2 mb-4">
              {popupInvoice.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-medium text-[#c4c6d8]">{item.title}</p><p className="text-xs text-[#6b6f82] capitalize">{item.licenseType} license</p></div>
                  <span className="text-sm text-[#c4c6d8] flex-shrink-0">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-rim pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-[#6b6f82]"><span>Subtotal</span><span>{formatPrice(popupInvoice.subtotal)}</span></div>
              <div className="flex justify-between text-xs text-[#6b6f82]"><span>Service Fee ({SERVICE_FEE_PERCENT}%)</span><span>{formatPrice(popupServiceFee)}</span></div>
              <div className="flex justify-between text-xs text-[#6b6f82]"><span>VAT ({TAX_PERCENT}%)</span><span>{formatPrice(popupTax)}</span></div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-rim">
                <span>Total Paid</span><span className="text-accent-bright">{formatPrice(popupTotal)}</span>
              </div>
            </div>
          </div>
          <div className="px-6 pb-5 flex gap-2">
            <button onClick={handleDownloadPopupPdf} disabled={popupDownloading}
              className="flex-1 py-2.5 border border-accent/30 text-accent-bright text-sm font-medium rounded-xl hover:bg-accent/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {popupDownloading ? 'Downloading...' : 'Invoice PDF'}
            </button>
            <button onClick={() => setPopupInvoice(null)}
              className="flex-1 py-2.5 btn-accent text-sm font-medium rounded-xl  transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-accent-bright text-xl font-bold overflow-hidden ring-2 ring-violet-100">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(user.avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
          ) : user.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-[#6b6f82]">{user.email}</p>
        </div>
        <Link href="/profile" className="ml-auto text-xs text-[#6b6f82] hover:text-[#8b8fa8] transition-colors flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Profile
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-[#6b6f82] mb-1">Total Purchases</p>
          <p className="text-2xl font-bold text-white">{paidOrders.length}</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-[#6b6f82] mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-white text-sm leading-tight mt-1">{formatPrice(paidOrders.reduce((s, o) => s + o.totalAmount, 0))}</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-[#6b6f82] mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-accent-bright text-sm leading-tight mt-1">{formatPrice(wallet?.totalEarned ?? 0)}</p>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-[#6b6f82] mb-1">Wallet Balance</p>
          <p className="text-2xl font-bold text-teal-600 text-sm leading-tight mt-1">{formatPrice(wallet?.balance ?? 0)}</p>
        </div>
      </div>

      {/* Subscription */}
      <div className="card rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${planColor === 'violet' ? 'bg-violet-100' : planColor === 'amber' ? 'bg-amber-100' : 'bg-white/[0.05]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={planColor === 'violet' ? '#7c3aed' : planColor === 'amber' ? '#d97706' : '#9ca3af'} strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{subscription?.plan.name ?? 'Free'} Plan</p>
              {subscription?.status === 'ACTIVE' && subscription.plan.slug !== 'free' && (
                <p className="text-xs text-[#6b6f82]">Active until {formatDate(subscription.currentPeriodEnd)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {subscription && !subscription.plan.unlimited && subscription.usage && (
              <div className="text-right hidden md:block">
                <p className="text-xs text-[#6b6f82] mb-1">{subscription.usage.downloadsThisMonth} / {subscription.plan.downloadLimit} downloads</p>
                <div className="w-32 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (subscription.usage.downloadsThisMonth / subscription.plan.downloadLimit) * 100)}%` }} />
                </div>
              </div>
            )}
            {subscription?.plan.slug !== 'business' && (
              <Link href="/pricing" className="px-3 py-1.5 text-xs font-medium btn-accent rounded-lg  transition-colors">
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="flex border-b border-rim">
          {(['purchases', 'payouts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-accent-bright border-b-2 border-violet-600' : 'text-[#6b6f82] hover:text-[#8b8fa8]'
              }`}
            >
              {tab === 'purchases' ? 'Purchase History' : 'Payout History'}
            </button>
          ))}
        </div>

        {/* Purchase History */}
        {activeTab === 'purchases' && (
          !orders?.length ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              </div>
              <p className="text-sm font-medium text-[#6b6f82]">No purchases yet</p>
              <Link href="/browse" className="mt-2 inline-block text-xs text-violet-600 hover:underline">Start browsing sounds</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.FAILED;
                return (
                  <div key={order.id} className="p-5">
                    {/* Order header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        {order.invoice && <span className="text-xs font-mono text-[#6b6f82]">{order.invoice.invoiceNumber}</span>}
                        <span className="text-xs text-[#6b6f82]">{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-white">{formatPrice(order.totalAmount)}</p>
                        {order.status === 'PAID' && order.invoice && (
                          <button
                            onClick={() => handleDownloadInvoice(order.id, order.invoice!.invoiceNumber)}
                            disabled={invoiceLoading === order.id}
                            className="mt-1 flex items-center gap-1 text-xs text-violet-500 hover:text-accent-bright transition-colors ml-auto disabled:opacity-50"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {invoiceLoading === order.id ? 'Downloading...' : 'Invoice PDF'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <rect x="1" y="4" width="3" height="8" rx="1" fill="#7c3aed"/>
                              <rect x="5.5" y="2" width="3" height="12" rx="1" fill="#7c3aed"/>
                              <rect x="10" y="5" width="3" height="6" rx="1" fill="#7c3aed"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#c4c6d8] truncate">{item.soundEffect.title}</p>
                            <p className="text-xs text-[#6b6f82] capitalize">{item.licenseType} License · {formatPrice(item.priceSnapshot)}</p>
                          </div>
                          {order.status === 'PAID' && (
                            <button
                              onClick={() => download(item.soundEffect.id, item.soundEffect.slug, item.soundEffect.format)}
                              disabled={downloading === item.soundEffect.id}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg btn-accent  transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              {downloading === item.soundEffect.id ? (
                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              )}
                              Download
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pending actions */}
                    {order.status === 'PENDING' && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleContinuePayment(order.id)}
                          disabled={actionLoading === order.id + '-pay'}
                          className="flex-1 py-2 text-xs font-semibold btn-accent rounded-xl  transition-colors disabled:opacity-50"
                        >
                          {actionLoading === order.id + '-pay' ? 'Loading...' : '💳 Continue Payment'}
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={actionLoading === order.id + '-cancel'}
                          className="px-4 py-2 text-xs font-medium border border-rim text-[#6b6f82] rounded-xl hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                        >
                          {actionLoading === order.id + '-cancel' ? '...' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Payout History */}
        {activeTab === 'payouts' && (
          !wallet?.withdrawals.length ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <p className="text-sm font-medium text-[#6b6f82]">No payout history yet</p>
              <Link href="/studio" className="mt-2 inline-block text-xs text-violet-600 hover:underline">Upload sounds & start earning</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {wallet.withdrawals.map((wd) => {
                const st = WITHDRAWAL_STATUS[wd.status] ?? WITHDRAWAL_STATUS.PENDING;
                return (
                  <div key={wd.id} className="p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      wd.status === 'PAID' ? 'bg-teal-50' : wd.status === 'REJECTED' ? 'bg-red-50' : 'bg-amber-50'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={wd.status === 'PAID' ? '#0d9488' : wd.status === 'REJECTED' ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white">{formatPrice(wd.amountRp)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-[#6b6f82]">{wd.bankName} · {wd.accountNo}</p>
                    </div>
                    <p className="text-xs text-[#6b6f82] flex-shrink-0">{formatDate(wd.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <script
        type="text/javascript"
        src={`https://app.${process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/snap.js`}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
    </div>
    </>
  );
}

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardPage />
    </Suspense>
  );
}
