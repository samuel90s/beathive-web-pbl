'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  user: { name: string; email: string };
  items: { soundEffect: { title: string }; licenseType: string }[];
  invoice?: { invoiceNumber: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PAID:    'bg-teal-50 text-teal-700',
  FAILED:  'bg-red-50 text-red-700',
  REFUNDED:'bg-gray-100 text-gray-600',
};

export default function AdminOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = accessToken || localStorage.getItem('accessToken');
    fetch(`${API}/admin/orders?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setOrders(data.items || []); setTotal(data.pagination?.total || 0); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-400 mt-0.5">{total} total order</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{o.user.name}</p>
                    <p className="text-xs text-gray-400">{o.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.items.map((item, i) => (
                      <p key={i} className="text-xs text-gray-600 truncate max-w-[180px]">
                        {item.soundEffect.title}
                        <span className="text-gray-400"> ({item.licenseType})</span>
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {o.invoice?.invoiceNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    Rp {(o.totalAmount / 1000).toFixed(0)}rb
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(o.createdAt).toLocaleDateString('id-ID')}
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
