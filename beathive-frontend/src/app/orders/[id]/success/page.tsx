'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { ordersApi } from '@/lib/api/orders';

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

function OrderSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const isPending = searchParams.get('status') === 'pending';

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await apiClient.post('/orders/verify-payment', { orderId }).catch(() => {});
        const inv = await ordersApi.getInvoice(orderId);
        setInvoice(inv);
      } catch {
        // invoice belum tersedia (order masih pending atau gagal)
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [orderId]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try { await ordersApi.downloadInvoicePdf(orderId, invoice.invoiceNumber); }
    catch { /* ignore */ } finally { setDownloadingPdf(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Pending state
  if (isPending || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Processing</h1>
          <p className="text-[#6b6f82] mb-8">Your payment is being confirmed. Downloads will be available once the payment is complete.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 btn-accent rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            View Purchase History
          </button>
        </div>
      </div>
    );
  }

  const serviceFee = Math.round(invoice.subtotal * SERVICE_FEE_PERCENT / 100);
  const tax = Math.round((invoice.subtotal + serviceFee) * TAX_PERCENT / 100);
  const grandTotal = invoice.subtotal + serviceFee + tax;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
          <p className="text-sm text-[#6b6f82] mt-1">Your sound effects are ready to download</p>
        </div>

        {/* Invoice card */}
        <div className="card rounded-2xl border border-rim shadow-sm overflow-hidden mb-4">
          {/* Invoice header */}
          <div className="bg-violet-600 px-5 py-4 text-white">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold">BeatHive</span>
              <span className="text-xs bg-surface/20 px-2 py-0.5 rounded-full">Payment Successful ✓</span>
            </div>
            <p className="text-sm text-violet-200">{invoice.invoiceNumber}</p>
            <p className="text-xs text-violet-300 mt-0.5">{formatDate(invoice.issuedAt)}</p>
          </div>

          <div className="px-5 py-4">
            {/* Customer */}
            <div className="mb-4 pb-3 border-b border-gray-50">
              <p className="text-xs text-[#6b6f82] mb-1">Customer</p>
              <p className="text-sm font-medium text-[#c4c6d8]">{invoice.customer.name}</p>
              <p className="text-xs text-[#6b6f82]">{invoice.customer.email}</p>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-[#c4c6d8] font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[#6b6f82] capitalize">{item.licenseType} license</p>
                  </div>
                  <span className="text-sm text-[#c4c6d8] flex-shrink-0">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="border-t border-rim pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-[#6b6f82]">
                <span>Subtotal</span>
                <span>{formatPrice(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#6b6f82]">
                <span>Service Fee ({SERVICE_FEE_PERCENT}%)</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#6b6f82]">
                <span>VAT ({TAX_PERCENT}%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-rim">
                <span>Total Paid</span>
                <span className="text-accent-bright">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex-1 py-2.5 border border-violet-200 text-accent-bright text-sm font-medium rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloadingPdf ? 'Downloading...' : 'Invoice PDF'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-2.5 btn-accent text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            View Purchases
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
