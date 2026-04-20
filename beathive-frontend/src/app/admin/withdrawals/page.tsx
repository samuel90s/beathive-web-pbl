// src/app/admin/withdrawals/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

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
  PENDING: 'bg-amber-50 text-amber-700',
  PAID: 'bg-teal-50 text-teal-700',
  REJECTED: 'bg-red-50 text-red-600',
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
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Withdrawal Requests</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total requests</p>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          No withdrawal requests found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Creator</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.wallet.user.name}</p>
                    <p className="text-xs text-gray-400">{item.wallet.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    Rp {item.amountRp.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    {item.bankName ? (
                      <>
                        <p className="text-gray-700 font-medium">{item.bankName}</p>
                        <p className="text-xs font-mono text-gray-500">{item.accountNo}</p>
                        {item.note?.startsWith('Account holder:') && (
                          <p className="text-xs text-gray-400">{item.note.replace('Account holder: ', '')}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                    {item.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
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
                            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 min-w-0"
                          />
                          <button
                            onClick={() => updateStatus(item.id, 'REJECTED', rejectNote[item.id])}
                            disabled={actionLoading === item.id}
                            className="px-2 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
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
