'use client';
import { API_URL as API } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import toast from 'react-hot-toast';


interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  user: { name: string; email: string };
  items: { audioAsset: { title: string }; licenseType: string }[];
  invoice?: { invoiceNumber: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400',
  PAID:    'bg-teal/10 text-teal',
  FAILED:  'bg-red-500/10 text-red-400',
  REFUNDED:'bg-white/[0.05] text-[#8b8fa8]',
  CANCELLED:'bg-white/[0.05] text-[#8b8fa8]',
};

function getOrderDuration(createdAt: string, status: string) {
  const ageMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const hours = Math.floor(ageMs / 3_600_000);
  const days = Math.floor(hours / 24);
  if (status !== 'PENDING') return days > 0 ? `${days}d` : `${hours}h`;
  if (ageMs >= 86_400_000) return `Expired ${days}d ago`;
  const remainingHours = Math.max(1, Math.ceil((86_400_000 - ageMs) / 3_600_000));
  return `${hours}h old · ${remainingHours}h left`;
}

export default function AdminOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadOrders = () => {
    const token = accessToken || sessionStorage.getItem('accessToken');
    fetch(`${API}/admin/orders?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setOrders(data.items || []); setTotal(data.pagination?.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const syncOrder = async (orderId: string) => {
    setSyncingId(orderId);
    try {
      const token = accessToken || sessionStorage.getItem('accessToken');
      const response = await fetch(`${API}/admin/orders/${orderId}/sync`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to sync order');
      toast.success(data.message || `Status order: ${data.status}`);
      loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync order');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-white">Orders</h1>
        <p className="text-sm text-[#6b6f82] mt-0.5">{total} total orders</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card rounded-2xl border border-rim overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rim bg-white/[0.03]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Invoice</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Duration</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#6b6f82] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#c4c6d8]">{o.user.name}</p>
                    <p className="text-xs text-[#6b6f82]">{o.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.items.map((item, i) => (
                      <p key={i} className="text-xs text-[#8b8fa8] truncate max-w-[180px]">
                        {item.audioAsset.title}
                        <span className="text-[#6b6f82]"> ({item.licenseType})</span>
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6b6f82]">
                    {o.invoice?.invoiceNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#c4c6d8]">
                    Rp {(o.totalAmount / 1000).toFixed(0)}rb
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-white/[0.05] text-[#8b8fa8]'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-xs ${
                    o.status === 'PENDING' && Date.now() - new Date(o.createdAt).getTime() >= 86_400_000
                      ? 'text-red-400'
                      : 'text-[#6b6f82]'
                  }`}>
                    {getOrderDuration(o.createdAt, o.status)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[#6b6f82]">
                    {new Date(o.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'PENDING' ? (
                      <button
                        onClick={() => syncOrder(o.id)}
                        disabled={syncingId === o.id}
                        className="rounded-lg border border-rim px-3 py-1.5 text-xs text-accent-bright hover:border-accent/50 disabled:opacity-50"
                      >
                        {syncingId === o.id ? 'Syncing...' : 'Sync Status'}
                      </button>
                    ) : (
                      <span className="text-xs text-[#4a4d5e]">—</span>
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
