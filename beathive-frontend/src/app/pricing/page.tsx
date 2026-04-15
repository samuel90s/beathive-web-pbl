// src/app/pricing/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { formatPrice } from '@/lib/utils';

const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Untuk coba-coba dulu',
    features: [
      '5 download per bulan',
      'Akses sound effect gratis',
      'Preview 30 detik semua SFX',
      'Lisensi personal only',
    ],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 99000,
    priceYearly: 890000,
    description: 'Untuk kreator aktif',
    features: [
      '100 download per bulan',
      'Akses semua SFX Pro & Free',
      'Lisensi komersial included',
      'Download WAV original',
      'Priority support',
    ],
    cta: 'Mulai Pro',
    highlight: true,
  },
  {
    slug: 'business',
    name: 'Business',
    priceMonthly: 299000,
    priceYearly: 2500000,
    description: 'Untuk tim & studio',
    features: [
      'Download unlimited',
      'Akses semua SFX termasuk Business',
      'Lisensi komersial penuh',
      'Multi-seat (3 akun)',
      'Invoice perusahaan',
      'Dedicated support',
    ],
    cta: 'Mulai Business',
    highlight: false,
  },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const handleUpgrade = async (planSlug: string) => {
    if (planSlug === 'free') { router.push('/auth/register'); return; }
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    setLoading(planSlug);
    try {
      const result = await subscriptionsApi.upgrade(planSlug, cycle);
      if ((window as any).snap) {
        (window as any).snap.pay(result.snapToken, {
          onSuccess: () => router.push('/dashboard?upgrade=success'),
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
    <div className="max-w-5xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">Pilih plan yang tepat</h1>
        <p className="text-gray-400 mb-6">Mulai gratis, upgrade kapan saja. Tidak ada kontrak.</p>

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
              {c === 'monthly' ? 'Bulanan' : 'Tahunan'}
              {c === 'yearly' && (
                <span className="ml-1.5 text-xs text-teal-600 font-medium">Hemat 25%</span>
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
                    Paling Populer
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-900">{plan.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                {price === 0 ? (
                  <div className="text-3xl font-semibold text-gray-900">Gratis</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-gray-900">
                        {formatPrice(monthlyEquiv)}
                      </span>
                      <span className="text-sm text-gray-400">/bulan</span>
                    </div>
                    {cycle === 'yearly' && discount > 0 && (
                      <p className="text-xs text-teal-600 mt-0.5">
                        Ditagih {formatPrice(price)}/tahun · Hemat {discount}%
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
                onClick={() => handleUpgrade(plan.slug)}
                disabled={loading === plan.slug}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  plan.highlight
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {loading === plan.slug ? 'Memproses...' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Semua plan bisa di-cancel kapan saja. Akses tetap aktif hingga akhir periode.
      </p>

      <script
        type="text/javascript"
        src={`https://app.${process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/snap.js`}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />
    </div>
  );
}
