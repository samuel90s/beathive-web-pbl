// src/app/dashboard/orders/page.tsx
'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { ordersApi } from '@/lib/api/orders';
import { useDownload } from '@/lib/hooks/useDownload';
import { formatPrice, formatDate } from '@/lib/utils';
import { InvoiceModal, type InvoiceData } from '@/components/ui/InvoiceModal';
import { toast } from '@/lib/store/toast.store';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PAID:      { label: 'Lunas',            cls: 'bg-teal/10 text-teal border border-teal/20' },
  PENDING:   { label: 'Menunggu Bayar',   cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  CANCELLED: { label: 'Dibatalkan',       cls: 'bg-white/[0.05] text-[#6b6f82] border border-rim' },
  FAILED:    { label: 'Gagal',            cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

function OrdersContent() {
  const isAuth = useRequireAuth();
  const { download, downloading } = useDownload();
  const queryClient = useQueryClient();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
  const [popupInvoice, setPopupInvoice] = useState<InvoiceData | null>(null);
  const [popupDownloading, setPopupDownloading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const closePopup = useCallback(() => setPopupInvoice(null), []);
  useEffect(() => {
    if (!popupInvoice) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [popupInvoice, closePopup]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getMyOrders,
    enabled: isAuth,
  });

  const handleDownloadInvoice = async (orderId: string, invoiceNumber: string) => {
    setInvoiceLoading(orderId);
    try { await ordersApi.downloadInvoicePdf(orderId, invoiceNumber); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal download invoice'); }
    finally { setInvoiceLoading(null); }
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
            } catch { /* invoice may not be ready */ }
          },
          onPending: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
          onError: () => toast.error('Pembayaran gagal. Coba lagi.'),
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuka sesi pembayaran');
    } finally { setActionLoading(null); }
  };

  const doCancelOrder = async (orderId: string) => {
    setActionLoading(orderId + '-cancel');
    try {
      await ordersApi.cancelOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pesanan dibatalkan');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan pesanan');
    } finally { setActionLoading(null); }
  };

  if (isLoading) return (
    <div className="px-6 py-8 space-y-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="h-28 card rounded-2xl animate-pulse" />
      ))}
    </div>
  );

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

      {popupInvoice && (
        <InvoiceModal
          invoice={popupInvoice}
          onClose={closePopup}
          onDownload={async () => {
            setPopupDownloading(true);
            try { await ordersApi.downloadInvoicePdf(popupInvoice.orderId, popupInvoice.invoiceNumber); }
            catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal download invoice'); }
            finally { setPopupDownloading(false); }
          }}
          downloading={popupDownloading}
        />
      )}

      <div className="px-8 py-8 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Pesanan</h1>
          <p className="text-sm text-[#5a5d72] mt-1">Riwayat pembelian sound kamu</p>
        </div>

        {!orders?.length ? (
          <div className="card rounded-2xl py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6f82" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-[#6b6f82]">Belum ada pesanan</p>
            <Link href="/browse" className="mt-2 inline-block text-xs text-violet-500 hover:underline">
              Mulai browse sound
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.FAILED;
              return (
                <div key={order.id} className="card rounded-2xl p-5 max-w-3xl">
                  {/* Order header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      {order.invoice && (
                        <span className="text-xs font-mono text-[#5a5d72]">{order.invoice.invoiceNumber}</span>
                      )}
                      <span className="text-xs text-[#5a5d72]">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-white">{formatPrice(order.totalAmount)}</p>
                      {order.status === 'PAID' && order.invoice && (
                        <button
                          onClick={() => handleDownloadInvoice(order.id, order.invoice!.invoiceNumber)}
                          disabled={invoiceLoading === order.id}
                          className="mt-1 flex items-center gap-1 text-xs text-violet-500 hover:text-accent-bright ml-auto disabled:opacity-50 transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          {invoiceLoading === order.id ? 'Mengunduh...' : 'Invoice PDF'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="4" width="3" height="8" rx="1" fill="#8b5cf6"/>
                            <rect x="5.5" y="2" width="3" height="12" rx="1" fill="#8b5cf6"/>
                            <rect x="10" y="5" width="3" height="6" rx="1" fill="#8b5cf6"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#c4c6d8] truncate">{item.soundEffect.title}</p>
                          <p className="text-xs text-[#5a5d72] capitalize">{item.licenseType} License · {formatPrice(item.priceSnapshot)}</p>
                        </div>
                        {order.status === 'PAID' && (
                          <button
                            onClick={() => download(item.soundEffect.id, item.soundEffect.slug, item.soundEffect.format)}
                            disabled={downloading === item.soundEffect.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg btn-accent flex-shrink-0 disabled:opacity-50 transition-colors"
                          >
                            {downloading === item.soundEffect.id ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            )}
                            Download
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pending payment actions */}
                  {order.status === 'PENDING' && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleContinuePayment(order.id)}
                        disabled={actionLoading === order.id + '-pay'}
                        className="flex-1 py-2.5 text-sm font-semibold btn-accent rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === order.id + '-pay' ? 'Memuat...' : '💳 Lanjutkan Pembayaran'}
                      </button>
                      <button
                        onClick={() => setConfirmModal({ message: 'Batalkan pesanan ini?', onConfirm: () => doCancelOrder(order.id) })}
                        disabled={actionLoading === order.id + '-cancel'}
                        className="px-4 py-2.5 text-sm font-medium border border-rim text-[#6b6f82] rounded-xl hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === order.id + '-cancel' ? '...' : 'Batalkan'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-28 card rounded-2xl animate-pulse" />)}</div>}>
      <OrdersContent />
    </Suspense>
  );
}
