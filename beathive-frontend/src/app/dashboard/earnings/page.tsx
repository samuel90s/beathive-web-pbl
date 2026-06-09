// src/app/dashboard/earnings/page.tsx
'use client';
import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/lib/store/toast.store';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

interface Withdrawal { id: string; amountRp: number; status: string; bankName: string; accountNo: string; createdAt: string; }
interface WalletData { balance: number; totalEarned: number; withdrawals: Withdrawal[]; }

const WITHDRAWAL_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Diproses',  cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  PAID:     { label: 'Selesai',   cls: 'bg-teal/10 text-teal border border-teal/20' },
  REJECTED: { label: 'Ditolak',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EarningsContent() {
  const isAuth = useRequireAuth();
  const { accessToken } = useAuthStore();
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const { data: wallet, isLoading, refetch } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const token = accessToken || sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/earnings/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : { balance: 0, totalEarned: 0, withdrawals: [] };
    },
    enabled: isAuth,
  });

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 50000) {
      toast.error('Minimum penarikan Rp 50.000');
      return;
    }
    if (amount > (wallet?.balance ?? 0)) {
      toast.error('Saldo tidak cukup');
      return;
    }
    setWithdrawLoading(true);
    try {
      const token = accessToken || sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/earnings/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountRp: amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal mengajukan penarikan');
      }
      toast.success('Permintaan penarikan berhasil diajukan');
      setShowWithdrawForm(false);
      setWithdrawAmount('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengajukan penarikan');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (isLoading) return (
    <div className="px-6 py-8 space-y-3">
      <div className="h-32 card rounded-2xl animate-pulse" />
      <div className="h-24 card rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="px-8 py-8 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Earnings</h1>
        <p className="text-sm text-[#5a5d72] mt-1">Pendapatan dari sound kamu</p>
      </div>

      {/* Earnings stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-2xl">
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-[#5a5d72] mb-2">Saldo Tersedia</p>
          <p className="text-2xl font-bold text-teal-400">{formatPrice(wallet?.balance ?? 0)}</p>
          <button
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            disabled={(wallet?.balance ?? 0) < 50000}
            className="mt-3 w-full py-2 text-xs font-semibold btn-accent rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Tarik Dana
          </button>
        </div>
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-[#5a5d72] mb-2">Total Diperoleh</p>
          <p className="text-2xl font-bold text-accent-bright">{formatPrice(wallet?.totalEarned ?? 0)}</p>
          <p className="text-xs text-[#3a3c4e] mt-3">Sepanjang waktu</p>
        </div>
      </div>

      {/* Withdraw form */}
      {showWithdrawForm && (
        <div className="card rounded-2xl p-5 mb-5 border border-accent/20 max-w-2xl">
          <p className="text-sm font-semibold text-white mb-3">Ajukan Penarikan</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5a5d72]">Rp</span>
              <input
                type="number"
                min="50000"
                max={wallet?.balance ?? 0}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Jumlah (min. 50.000)"
                className="w-full pl-9 pr-3 py-2.5 input-dark rounded-xl text-sm"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="px-5 py-2.5 text-sm font-semibold btn-accent rounded-xl disabled:opacity-50 transition-colors"
            >
              {withdrawLoading ? 'Memproses...' : 'Ajukan'}
            </button>
            <button
              onClick={() => setShowWithdrawForm(false)}
              className="px-3 py-2.5 text-sm border border-rim text-[#6b6f82] rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              Batal
            </button>
          </div>
          <p className="text-xs text-[#3a3c4e] mt-2">
            Dana akan ditransfer ke rekening bank yang terdaftar di{' '}
            <Link href="/profile" className="text-accent-bright hover:underline">profil kamu</Link>.
          </p>
        </div>
      )}

      {/* Withdrawal history */}
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-white mb-3">Riwayat Penarikan</p>

        {!wallet?.withdrawals.length ? (
          <div className="card rounded-2xl py-14 text-center">
            <div className="w-11 h-11 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6f82" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <p className="text-sm text-[#6b6f82]">Belum ada penarikan</p>
            {(wallet?.balance ?? 0) >= 50000 ? (
              <button
                onClick={() => setShowWithdrawForm(true)}
                className="mt-2 text-xs text-accent-bright hover:underline"
              >
                Tarik dana sekarang
              </button>
            ) : (
              <p className="text-xs text-[#3a3c4e] mt-1">Upload sound & mulai earning dulu</p>
            )}
          </div>
        ) : (
          <div className="card rounded-2xl divide-y divide-white/[0.05] overflow-hidden">
            {wallet.withdrawals.map((wd) => {
              const st = WITHDRAWAL_STATUS[wd.status] ?? WITHDRAWAL_STATUS.PENDING;
              return (
                <div key={wd.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    wd.status === 'PAID' ? 'bg-teal/10' : wd.status === 'REJECTED' ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={wd.status === 'PAID' ? '#2dd4bf' : wd.status === 'REJECTED' ? '#f87171' : '#fbbf24'}
                      strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white">{formatPrice(wd.amountRp)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-[#5a5d72]">{wd.bankName} · {wd.accountNo}</p>
                  </div>
                  <p className="text-xs text-[#3a3c4e] flex-shrink-0">{fmtDate(wd.createdAt)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8 space-y-3"><div className="h-32 card rounded-2xl animate-pulse" /><div className="h-24 card rounded-2xl animate-pulse" /></div>}>
      <EarningsContent />
    </Suspense>
  );
}
