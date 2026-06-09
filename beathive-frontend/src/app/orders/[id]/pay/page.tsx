// src/app/orders/[id]/pay/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, type PendingOrderDetail } from '@/lib/api/orders';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/store/toast.store';

// ─── Payment method definitions ───────────────────────────

const PAYMENT_METHODS = [
  {
    id: 'qris',
    label: 'QRIS / GoPay',
    desc: 'GoPay, OVO, Dana, ShopeePay, LinkAja, dll',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="8" fill="#00AED6" fillOpacity=".12"/>
        <path d="M10 10h8v8h-8zM22 10h8v8h-8zM10 22h8v8h-8z" stroke="#00AED6" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="12" y="12" width="4" height="4" rx="0.5" fill="#00AED6"/>
        <rect x="24" y="12" width="4" height="4" rx="0.5" fill="#00AED6"/>
        <rect x="12" y="24" width="4" height="4" rx="0.5" fill="#00AED6"/>
        <circle cx="26" cy="26" r="4" stroke="#00AED6" strokeWidth="1.5"/>
        <circle cx="26" cy="26" r="1.5" fill="#00AED6"/>
      </svg>
    ),
  },
  {
    id: 'va',
    label: 'Virtual Account',
    desc: 'BCA, Mandiri, BNI, BRI, Permata',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="8" fill="#BE1E2D" fillOpacity=".12"/>
        <rect x="8" y="13" width="24" height="14" rx="2.5" stroke="#BE1E2D" strokeWidth="1.5"/>
        <path d="M8 18h24" stroke="#BE1E2D" strokeWidth="1.5"/>
        <rect x="12" y="22" width="6" height="2" rx="1" fill="#BE1E2D"/>
        <rect x="22" y="22" width="4" height="2" rx="1" fill="#BE1E2D"/>
      </svg>
    ),
  },
  {
    id: 'cc',
    label: 'Kartu Kredit/Debit',
    desc: 'Visa, Mastercard, JCB, Amex',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="8" fill="#F59E0B" fillOpacity=".12"/>
        <rect x="8" y="12" width="24" height="16" rx="3" stroke="#FBBF24" strokeWidth="1.5"/>
        <rect x="8" y="17" width="24" height="4" fill="#FBBF24" fillOpacity=".25"/>
        <circle cx="27" cy="23" r="3" stroke="#FBBF24" strokeWidth="1.5"/>
        <circle cx="24" cy="23" r="3" fill="#FBBF24" fillOpacity=".4" stroke="#FBBF24" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'minimarket',
    label: 'Minimarket',
    desc: 'Alfamart, Indomaret — bayar tunai',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="8" fill="#10B981" fillOpacity=".12"/>
        <path d="M10 28V16l10-6 10 6v12H10z" stroke="#34D399" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="16" y="21" width="8" height="7" rx="1" stroke="#34D399" strokeWidth="1.5"/>
        <path d="M20 21v7" stroke="#34D399" strokeWidth="1" strokeDasharray="2 1"/>
      </svg>
    ),
  },
];

// ─── Main page ─────────────────────────────────────────────

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<PendingOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('qris');
  const [paying, setPaying] = useState(false);
  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
  const snapBaseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  useEffect(() => {
    // Try sessionStorage first (fastest — no network)
    try {
      const raw = sessionStorage.getItem('pendingOrder');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.orderId === orderId) {
          setOrder(data);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fallback: fetch from API (e.g. after page refresh)
    ordersApi.getOrder(orderId)
      .then(setOrder)
      .catch(() => toast.error('Order tidak ditemukan'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Redirect to Midtrans full-page hosted payment (no popup)
  const openPayment = useCallback(async () => {
    if (!order) return;
    let token = order.snapToken;

    // Refresh token if missing
    if (!token) {
      setPaying(true);
      try {
        const res = await ordersApi.getSnapToken(orderId);
        token = res.snapToken;
      } catch {
        toast.error('Gagal mendapatkan sesi pembayaran. Coba lagi.');
        setPaying(false);
        return;
      }
    }

    setPaying(true);
    // Redirect to Midtrans full-page payment — DO NOT clear cart here.
    // Cart is only cleared after payment is confirmed on the success page.
    window.location.href = `${snapBaseUrl}/snap/v3/redirection/${token}`;
  }, [order, orderId, snapBaseUrl]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[80, 64, 64].map((h, i) => (
              <div key={i} className={`h-${h === 80 ? 20 : 16} rounded-2xl bg-white/[0.04] border border-rim animate-pulse`} style={{ height: h }} />
            ))}
          </div>
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white/[0.04] border border-rim animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-[#6b6f82] mb-3">Order tidak ditemukan.</p>
        <Link href="/checkout" className="text-accent-bright text-sm hover:underline">Kembali ke keranjang</Link>
      </div>
    );
  }

  // Order already paid → redirect to success
  if (order.status === 'PAID') {
    router.replace(`/orders/${orderId}/success`);
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-28">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#5a5d72] mb-6">
        <Link href="/checkout" className="hover:text-white transition-colors">Keranjang</Link>
        <span>/</span>
        <span className="text-[#8b8fa8]">Pembayaran</span>
      </nav>

      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Left: Order summary ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Order ID card */}
          <div className="rounded-2xl border border-rim bg-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#3a3c4e] uppercase tracking-widest mb-1">Nomor Pesanan</p>
                <p className="text-sm font-mono text-[#8b8fa8]">#{orderId.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                Menunggu Pembayaran
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-rim overflow-hidden">
            <div className="px-5 py-3.5 border-b border-rim bg-white/[0.02]">
              <p className="text-xs font-bold text-[#5a5d72] uppercase tracking-widest">Item ({order.items.length})</p>
            </div>
            {order.items.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-rim' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-accent/[0.08] border border-accent/[0.12] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-[#5a5d72] mt-0.5 capitalize">Lisensi {item.licenseType}</p>
                </div>
                <span className="text-sm font-semibold text-white flex-shrink-0">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="rounded-2xl border border-rim bg-surface p-5">
            <p className="text-xs font-bold text-[#5a5d72] uppercase tracking-widest mb-4">Rincian Biaya</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6f82]">Subtotal</span>
                <span className="text-[#c4c6d8]">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6f82]">Biaya Layanan (5%)</span>
                <span className="text-[#c4c6d8]">{formatPrice(order.serviceFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6f82]">PPN (11%)</span>
                <span className="text-[#c4c6d8]">{formatPrice(order.tax)}</span>
              </div>
              <div className="border-t border-rim pt-3 flex items-center justify-between">
                <span className="font-semibold text-white">Total Pembayaran</span>
                <span className="text-2xl font-bold text-white">{formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Payment ── */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4">

          {/* Method selection */}
          <div className="rounded-2xl border border-rim bg-surface p-5">
            <p className="text-xs font-bold text-[#5a5d72] uppercase tracking-widest mb-4">Metode Pembayaran</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    selectedMethod === method.id
                      ? 'border-accent/50 bg-accent/[0.06]'
                      : 'border-rim hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    selectedMethod === method.id ? 'border-accent' : 'border-[#2a2c3e]'
                  }`}>
                    {selectedMethod === method.id && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>

                  {method.icon}

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium transition-colors ${selectedMethod === method.id ? 'text-white' : 'text-[#c4c6d8]'}`}>
                      {method.label}
                    </p>
                    <p className="text-[11px] text-[#4a4d5e] mt-0.5 truncate">{method.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pay button */}
          <div className="rounded-2xl border border-rim bg-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#6b6f82]">Total</span>
              <span className="text-xl font-bold text-white">{formatPrice(order.grandTotal)}</span>
            </div>

            <button
              onClick={openPayment}
              disabled={paying}
              className="w-full py-3.5 btn-accent rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengalihkan...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Bayar Sekarang
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-[#3a3c4e] mt-3 leading-relaxed">
              Pembayaran diproses secara aman oleh Midtrans.<br/>
              Pesanan berlaku 24 jam.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 px-2">
            {[
              { icon: '🔒', text: 'SSL Encrypted' },
              { icon: '✓', text: 'Midtrans Verified' },
              { icon: '↩', text: 'Refund Policy' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1">
                <span className="text-[11px]">{icon}</span>
                <span className="text-[10px] text-[#3a3c4e]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
