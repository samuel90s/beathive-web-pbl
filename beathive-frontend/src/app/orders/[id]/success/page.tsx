'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const transactionStatus = searchParams.get('transaction_status');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify payment with backend then fetch order
    const verify = async () => {
      try {
        await apiClient.post('/orders/verify-payment', { orderId }).catch(() => {});
        const res = await apiClient.get('/orders/me');
        const found = res.data?.find((o: any) => o.id === orderId);
        setOrder(found ?? null);
      } catch (err: any) {
        setError('Could not load order details.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPaid = order?.status === 'PAID' || transactionStatus === 'settlement' || transactionStatus === 'capture';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isPaid ? 'bg-teal-100' : 'bg-amber-100'}`}>
          {isPaid ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isPaid ? 'Payment Successful!' : 'Payment Pending'}
        </h1>
        <p className="text-gray-500 mb-6">
          {isPaid
            ? 'Your order has been confirmed. Your sounds are ready to download.'
            : 'Your payment is being processed. Downloads will be available once confirmed.'}
        </p>

        {/* Order summary */}
        {order && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-semibold">Order Summary</p>
            <div className="space-y-2 mb-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate mr-3">{item.soundEffect?.title ?? 'Sound Effect'}</span>
                  <span className="text-gray-500 flex-shrink-0">Rp {item.priceSnapshot?.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="text-violet-600">Rp {order.totalAmount?.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/browse"
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
