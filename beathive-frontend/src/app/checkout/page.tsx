// src/app/checkout/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart.store';
import { ordersApi } from '@/lib/api/orders';
import { formatPrice, formatDate } from '@/lib/utils';

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

function InvoiceModal({ invoice, onClose, onDownload, downloading }: {
  invoice: InvoiceData;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const serviceFee = Math.round(invoice.subtotal * SERVICE_FEE_PERCENT / 100);
  const tax = Math.round((invoice.subtotal + serviceFee) * TAX_PERCENT / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-violet-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold">BeatHive</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Pembayaran Berhasil ✓</span>
          </div>
          <p className="text-sm text-violet-200">{invoice.invoiceNumber}</p>
          <p className="text-xs text-violet-300 mt-0.5">{formatDate(invoice.issuedAt)}</p>
        </div>

        <div className="px-6 py-4">
          {/* Customer */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Pembeli</p>
            <p className="text-sm font-medium text-gray-800">{invoice.customer.name}</p>
            <p className="text-xs text-gray-500">{invoice.customer.email}</p>
          </div>

          {/* Items */}
          <div className="mb-4 space-y-2">
            {invoice.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-800 font-medium">{item.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{item.licenseType} license</p>
                </div>
                <span className="text-sm text-gray-700 flex-shrink-0">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Biaya Layanan ({SERVICE_FEE_PERCENT}%)</span>
              <span>{formatPrice(serviceFee)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>PPN ({TAX_PERCENT}%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span>
              <span className="text-violet-700">{formatPrice(invoice.subtotal + serviceFee + tax)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex-1 py-2.5 border border-violet-200 text-violet-600 text-sm font-medium rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? 'Mengunduh...' : 'Download PDF'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            Lihat Purchase History
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, updateLicense, totalAmount, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const subtotal = totalAmount();
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT / 100);
  const taxBase = subtotal + serviceFee;
  const tax = Math.round(taxBase * TAX_PERCENT / 100);
  const grandTotal = subtotal + serviceFee + tax;

  const handleCheckout = async () => {
    if (!items.length) return;
    setLoading(true);
    setError(null);

    try {
      const result = await ordersApi.create(items);

      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(result.snapToken, {
          onSuccess: async () => {
            try { await ordersApi.verifyPayment(result.orderId); } catch { /* webhook */ }
            clearCart();
            // Retry getInvoice beberapa kali karena invoice dibuat async
            let inv = null;
            for (let i = 0; i < 4; i++) {
              try {
                inv = await ordersApi.getInvoice(result.orderId);
                break;
              } catch {
                await new Promise(r => setTimeout(r, 800));
              }
            }
            if (inv) {
              setPaidOrderId(result.orderId);
              setInvoice(inv);
            } else {
              router.push(`/orders/${result.orderId}/success`);
            }
            setLoading(false);
          },
          onPending: () => {
            router.push(`/orders/${result.orderId}/success?status=pending`);
          },
          onError: () => { setError('Pembayaran gagal. Silakan coba lagi.'); setLoading(false); },
          onClose: () => setLoading(false),
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat order');
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice || !paidOrderId) return;
    setDownloadingPdf(true);
    try { await ordersApi.downloadInvoicePdf(paidOrderId, invoice.invoiceNumber); } catch { /* ignore */ }
    finally { setDownloadingPdf(false); }
  };

  if (items.length === 0 && !invoice) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-xl font-medium text-gray-900 mb-2">Cart kamu kosong</p>
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
    <>
      {/* Invoice modal setelah pembayaran berhasil */}
      {invoice && (
        <InvoiceModal
          invoice={invoice}
          onClose={() => router.push('/dashboard')}
          onDownload={handleDownloadPdf}
          downloading={downloadingPdf}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Cart</h1>

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
                          {type === 'personal' ? 'Personal' : 'Commercial (2×)'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                      {item.licenseType === 'personal'
                        ? 'Personal: YouTube, media sosial, proyek non-komersial.'
                        : 'Commercial: Iklan, film, game, produk berbayar. Lisensi seumur hidup.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900">{formatPrice(price)}</span>
                    <button onClick={() => removeItem(item.sound.id)} className="text-gray-300 hover:text-red-400 transition-colors">
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

        {/* Invoice Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rincian Pembayaran</h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Biaya Layanan ({SERVICE_FEE_PERCENT}%)</span>
              <span className="text-gray-800">{formatPrice(serviceFee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">PPN ({TAX_PERCENT}%)</span>
              <span className="text-gray-800">{formatPrice(tax)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Checkout button */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : `Bayar ${formatPrice(grandTotal)}`}
          </button>
          <p className="text-xs text-center text-gray-400 mt-3">
            Pembayaran aman via Midtrans · QRIS · Transfer Bank · Kartu Kredit
          </p>
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
