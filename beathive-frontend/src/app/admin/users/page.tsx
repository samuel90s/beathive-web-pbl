'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription?: { plan: { name: string; slug: string }; status: string } | null;
  _count: { uploadedSounds: number; orders: number };
}

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const token = () => accessToken || localStorage.getItem('accessToken');

  const fetchUsers = async (q = '') => {
    setLoading(true);
    const res = await fetch(`${API}/admin/users?search=${q}&limit=50`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    setUsers(data.items || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const PLAN_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    pro: 'bg-violet-50 text-violet-700',
    business: 'bg-amber-50 text-amber-700',
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} user terdaftar</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Cari nama atau email..."
        value={search}
        onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value); }}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4 bg-white"
      />

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sounds</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'ADMIN' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.subscription ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.subscription.plan.slug] || 'bg-gray-100 text-gray-600'}`}>
                        {u.subscription.plan.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{u._count.uploadedSounds}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{u._count.orders}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('id-ID')}
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
