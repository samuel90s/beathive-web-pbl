// src/app/checkout/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart.store';
import { ordersApi } from '@/lib/api/orders';
import { formatPrice } from '@/lib/utils';
import { calcOrderTotals, SERVICE_FEE_PERCENT, TAX_PERCENT } from '@/lib/constants';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, updateLicense, totalAmount } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subtotal, serviceFee, tax, grandTotal } = calcOrderTotals(totalAmount());

  const handleProceed = async () => {
    if (!items.length) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ordersApi.create(items);
      // Save order context to sessionStorage so payment page can render without refetch
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId: result.orderId,
        snapToken: result.snapToken,
        items: result.items,
        subtotal,
        serviceFee,
        tax,
        grandTotal,
      }));
      router.push(`/orders/${result.orderId}/pay`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat pesanan. Coba lagi.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-rim flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a4d5e" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <p className="text-lg font-semibold text-white mb-1">Keranjang kosong</p>
        <p className="text-sm text-[#6b6f82] mb-6">Tambahkan sound dari halaman browse</p>
        <Link href="/browse" className="px-5 py-2.5 btn-accent rounded-xl text-sm font-medium">
          Browse Sounds
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#5a5d72] mb-6">
        <Link href="/browse" className="hover:text-white transition-colors">Browse</Link>
        <span>/</span>
        <span className="text-[#8b8fa8]">Keranjang</span>
      </nav>

      <h1 className="text-xl font-bold text-white mb-6">Keranjang Belanja</h1>

      {/* Items */}
      <div className="rounded-2xl border border-rim overflow-hidden mb-4">
        {items.map((item, i) => {
          const isMusic = item.sound.category?.type === 'music';
          const price = item.licenseType === 'commercial' || item.licenseType === 'sync'
            ? item.sound.price * 2
            : item.licenseType === 'broadcast'
            ? item.sound.price * 3
            : item.sound.price;

          const licenseOptions = isMusic
            ? [
                { type: 'personal',   label: 'Personal',        desc: 'Proyek personal, podcast, konten non-komersial' },
                { type: 'sync',       label: 'Sync (2×)',        desc: 'Video monetized, YouTube, film independen' },
                { type: 'broadcast',  label: 'Broadcast (3×)',   desc: 'TV, radio, iklan, distribusi komersial luas' },
              ]
            : [
                { type: 'personal',   label: 'Personal',        desc: 'Proyek personal, podcast, social media' },
                { type: 'commercial', label: 'Commercial (2×)',  desc: 'Iklan, film, game, produk berbayar' },
              ];

          return (
            <div key={item.sound.id} className={`p-4 bg-surface ${i > 0 ? 'border-t border-rim' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-accent/[0.08] border border-accent/[0.12] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.sound.title}</p>
                      <p className="text-xs text-[#5a5d72] mt-0.5">{item.sound.category.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-white">{formatPrice(price)}</span>
                      <button
                        onClick={() => removeItem(item.sound.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[#3a3c4e] hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M1 1l12 12M13 1L1 13"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* License picker */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {licenseOptions.map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => updateLicense(item.sound.id, type as any)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          item.licenseType === type
                            ? 'border-accent/50 bg-accent/10 text-accent-bright font-medium'
                            : 'border-rim text-[#6b6f82] hover:border-white/10 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#4a4d5e] mt-1.5 leading-relaxed">
                    {licenseOptions.find(l => l.type === item.licenseType)?.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-rim bg-surface p-5 mb-4">
        <h2 className="text-sm font-semibold text-white mb-4">Ringkasan Pembayaran</h2>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6f82]">Subtotal ({items.length} item)</span>
            <span className="text-[#c4c6d8]">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6f82]">Biaya Layanan ({SERVICE_FEE_PERCENT}%)</span>
            <span className="text-[#c4c6d8]">{formatPrice(serviceFee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6f82]">PPN ({TAX_PERCENT}%)</span>
            <span className="text-[#c4c6d8]">{formatPrice(tax)}</span>
          </div>
          <div className="border-t border-rim pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-xl font-bold text-white">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-rim bg-surface p-4">
        {error && (
          <div className="mb-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}
        <button
          onClick={handleProceed}
          disabled={loading}
          className="w-full py-3.5 btn-accent rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Lanjut ke Pembayaran
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-[11px] text-[#3a3c4e] flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Secure payment
          </span>
          <span className="text-[#2a2c3e]">·</span>
          <span className="text-[11px] text-[#3a3c4e]">Midtrans · QRIS · VA · CC</span>
        </div>
      </div>
    </div>
  );
}
