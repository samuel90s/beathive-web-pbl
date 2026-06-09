// src/app/admin/withdrawals/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/lib/store/toast.store';

interface WithdrawalItem {
  id: string;
  amountRp: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  bankName: string | null;
  accountNo: string | null;
  note: string | null;
  createdAt: string;
  wallet: {
    user: { id: string; name: string; email: string };
  };
}

const STATUS_COLORS = {
  PENDING: 'bg-amber-500/10 text-amber-400',
  PAID: 'bg-teal/10 text-teal',
  REJECTED: 'bg-red-500/10 text-red-400',
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ [id: string]: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await apiClient.get('/admin/withdrawals', { params });
      setItems(data.items);
      setTotal(data.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: 'PAID' | 'REJECTED', note?: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/admin/withdrawals/${id}`, { status, note });
      toast.success(status === 'PAID' ? 'Withdrawal approved' : 'Withdrawal rejected');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Withdrawal Requests</h1>
          <p className="text-sm text-[#6b6f82] mt-0.5">{total} total requests</p>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'btn-accent'
                  : 'bg-surface border border-rim text-[#8b8fa8] hover:bg-white/[0.03]'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card rounded-2xl border border-rim p-12 text-center text-[#6b6f82] text-sm">
          No withdrawal requests found.
        </div>
      ) : (
        <div className="card rounded-2xl border border-rim overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-rim">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Creator</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{item.wallet.user.name}</p>
                    <p className="text-xs text-[#6b6f82]">{item.wallet.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    Rp {item.amountRp.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    {item.bankName ? (
                      <>
                        <p className="text-[#c4c6d8] font-medium">{item.bankName}</p>
                        <p className="text-xs font-mono text-[#6b6f82]">{item.accountNo}</p>
                        {item.note?.startsWith('Account holder:') && (
                          <p className="text-xs text-[#6b6f82]">{item.note.replace('Account holder: ', '')}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-[#6b6f82]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                    {item.note && (
                      <p className="text-xs text-[#6b6f82] mt-0.5">{item.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b6f82]">
                    {new Date(item.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING' ? (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => updateStatus(item.id, 'PAID')}
                          disabled={actionLoading === item.id}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                          Mark as Paid
                        </button>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Rejection note..."
                            value={rejectNote[item.id] ?? ''}
                            onChange={(e) => setRejectNote((p) => ({ ...p, [item.id]: e.target.value }))}
                            className="flex-1 text-xs px-2 py-1.5 border border-rim rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 min-w-0"
                          />
                          <button
                            onClick={() => updateStatus(item.id, 'REJECTED', rejectNote[item.id])}
                            disabled={actionLoading === item.id}
                            className="px-2 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6b6f82]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
