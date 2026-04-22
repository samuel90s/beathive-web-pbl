// src/app/pricing/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { formatPrice } from '@/lib/utils';

const SERVICE_FEE_PERCENT = 5;
const TAX_PERCENT = 11;

interface ConfirmPlan {
  slug: string;
  name: string;
  price: number;
  cycle: 'monthly' | 'yearly';
}

function ConfirmModal({ plan, onConfirm, onClose, loading }: {
  plan: ConfirmPlan;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const serviceFee = Math.round(plan.price * SERVICE_FEE_PERCENT / 100);
  const tax = Math.round((plan.price + serviceFee) * TAX_PERCENT / 100);
  const total = plan.price + serviceFee + tax;
  const cycleLabel = plan.cycle === 'yearly' ? 'Tahunan' : 'Bulanan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-violet-600 px-6 py-5 text-white">
          <p className="text-lg font-bold">Konfirmasi Berlangganan</p>
          <p className="text-sm text-violet-200 mt-0.5">Plan {plan.name} · {cycleLabel}</p>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Plan {plan.name} ({cycleLabel})</span>
              <span>{formatPrice(plan.price)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Biaya Layanan ({SERVICE_FEE_PERCENT}%)</span>
              <span>{formatPrice(serviceFee)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>PPN ({TAX_PERCENT}%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold text-gray-900">
              <span className="text-sm">Total</span>
              <span className="text-violet-700">{formatPrice(total)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Akses aktif langsung setelah pembayaran dikonfirmasi. Bisa dibatalkan kapan saja.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
            ) : `Bayar ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Just getting started',
    features: [
      '5 downloads per month',
      'Access to free sound effects',
      '30-second preview for all SFX',
      'Personal license only',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 19000,
    priceYearly: 179000,
    description: 'For active creators',
    features: [
      '100 downloads per month',
      'Access to all Pro & Free SFX',
      'Commercial license included',
      'Original WAV download',
      'Priority support',
    ],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    slug: 'business',
    name: 'Business',
    priceMonthly: 49000,
    priceYearly: 459000,
    description: 'For teams & studios',
    features: [
      'Unlimited downloads',
      'Access to all SFX including Business',
      'Full commercial license',
      'Multi-seat (3 accounts)',
      'Company invoice',
      'Dedicated support',
    ],
    cta: 'Start Business',
    highlight: false,
  },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmPlan | null>(null);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const handleClickPlan = (planSlug: string, priceMonthly: number, priceYearly: number, name: string) => {
    if (planSlug === 'free') { router.push('/auth/register'); return; }
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    const price = cycle === 'yearly' ? priceYearly : priceMonthly;
    setConfirm({ slug: planSlug, name, price, cycle });
  };

  const handleConfirmPay = async () => {
    if (!confirm) return;
    setLoading(confirm.slug);
    try {
      const result = await subscriptionsApi.upgrade(confirm.slug, confirm.cycle);
      setConfirm(null);
      if ((window as any).snap) {
        (window as any).snap.pay(result.snapToken, {
          onSuccess: async () => {
            try { await subscriptionsApi.verifyPayment(result.orderId); } catch { /* webhook */ }
            router.push('/dashboard?upgrade=success');
          },
          onError: () => setLoading(null),
          onClose: () => setLoading(null),
        });
      }
    } catch {
      setLoading(null);
    }
  };

  const yearlyDiscount = (monthly: number, yearly: number) => {
    if (!monthly) return 0;
    return Math.round((1 - yearly / (monthly * 12)) * 100);
  };

  return (
    <>
    {confirm && (
      <ConfirmModal
        plan={confirm}
        onConfirm={handleConfirmPay}
        onClose={() => setConfirm(null)}
        loading={loading === confirm.slug}
      />
    )}
    <div className="max-w-5xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">Choose the right plan</h1>
        <p className="text-gray-400 mb-6">Start free, upgrade anytime. No contracts.</p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all ${
                cycle === c
                  ? 'bg-white text-gray-900 font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c === 'monthly' ? 'Monthly' : 'Yearly'}
              {c === 'yearly' && (
                <span className="ml-1.5 text-xs text-teal-600 font-medium">Save 25%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const monthlyEquiv = cycle === 'yearly' && plan.priceYearly
            ? Math.round(plan.priceYearly / 12)
            : plan.priceMonthly;
          const discount = yearlyDiscount(plan.priceMonthly, plan.priceYearly);

          return (
            <div
              key={plan.slug}
              className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'border-2 border-violet-400 shadow-lg shadow-violet-100'
                  : 'border border-gray-100'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-900">{plan.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                {price === 0 ? (
                  <div className="text-3xl font-semibold text-gray-900">Free</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-gray-900">
                        {formatPrice(monthlyEquiv)}
                      </span>
                      <span className="text-sm text-gray-400">/mo</span>
                    </div>
                    {cycle === 'yearly' && discount > 0 && (
                      <p className="text-xs text-teal-600 mt-0.5">
                        Billed {formatPrice(price)}/year · Save {discount}%
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M13.28 4.22a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06L6.25 10.19l5.97-5.97a.75.75 0 011.06 0z"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleClickPlan(plan.slug, plan.priceMonthly, plan.priceYearly, plan.name)}
                disabled={loading === plan.slug}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  plan.highlight
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {loading === plan.slug ? 'Processing...' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        All plans can be cancelled anytime. Access remains active until the end of the billing period.
      </p>

      <script
        type="text/javascript"
        src={`https://app.${process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/snap.js`}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
    </div>
    </>
  );
}
