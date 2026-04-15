// src/app/checkout/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart.store';
import { ordersApi } from '@/lib/api/orders';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, updateLicense, totalAmount, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = totalAmount();

  const handleCheckout = async () => {
    if (!items.length) return;
    setLoading(true);
    setError(null);

    try {
      const result = await ordersApi.create(items);

      // Buka Midtrans Snap popup
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(result.snapToken, {
          onSuccess: () => {
            clearCart();
            router.push(`/dashboard?order=${result.orderId}&status=success`);
          },
          onPending: () => {
            router.push(`/dashboard?order=${result.orderId}&status=pending`);
          },
          onError: () => setError('Pembayaran gagal. Silakan coba lagi.'),
          onClose: () => setLoading(false),
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat order');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-xl font-medium text-gray-900 mb-2">Keranjang kosong</p>
        <p className="text-gray-400 mb-6">Tambahkan sound effect dari halaman browse</p>
        <button
          onClick={() => router.push('/browse')}
          className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Browse Sound Effects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Keranjang</h1>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
        {items.map((item, i) => {
          const price = item.licenseType === 'commercial'
            ? item.sound.price * 2
            : item.sound.price;

          return (
            <div key={item.sound.id} className={`p-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="4" width="3" height="8" rx="1" fill="#7c3aed"/>
                    <rect x="5.5" y="2" width="3" height="12" rx="1" fill="#7c3aed"/>
                    <rect x="10" y="5" width="3" height="6" rx="1" fill="#7c3aed"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.sound.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.sound.category.name}</p>

                  {/* Pilih lisensi */}
                  <div className="flex gap-2 mt-2">
                    {(['personal', 'commercial'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => updateLicense(item.sound.id, type)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          item.licenseType === type
                            ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {type === 'personal' ? 'Personal' : 'Komersial (2×)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(price)}
                  </span>
                  <button
                    onClick={() => removeItem(item.sound.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M1 1l12 12M13 1L1 13"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total & checkout */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-xl font-semibold text-gray-900">{formatPrice(total)}</span>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses...' : 'Bayar Sekarang'}
        </button>

        <p className="text-xs text-center text-gray-400 mt-3">
          Pembayaran aman via Midtrans · QRIS · Transfer · Kartu Kredit
        </p>
      </div>

      {/* Midtrans Snap script */}
      <script
        type="text/javascript"
        src={`https://app.${process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/snap.js`}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
    </div>
  );
}
