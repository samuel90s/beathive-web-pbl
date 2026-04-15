'use client'
import AdminLayout from '@/components/layout/AdminLayout'

const USERS = [
  { id: 'usr-001', name: 'Budi Santoso',  email: 'budi@example.com',  plan: 'Free',     status: 'ACTIVE', joined: '1 Jan 2024',  downloads: 2, orders: 2 },
  { id: 'usr-002', name: 'Siti Rahayu',   email: 'siti@example.com',  plan: 'Pro',      status: 'ACTIVE', joined: '15 Jan 2024', downloads: 2, orders: 1 },
  { id: 'usr-003', name: 'Ahmad Fauzi',   email: 'ahmad@example.com', plan: 'Business', status: 'ACTIVE', joined: '3 Feb 2024',  downloads: 2, orders: 0 },
  { id: 'usr-004', name: 'Dewi Permata',  email: 'dewi@example.com',  plan: 'Pro',      status: 'ACTIVE', joined: '20 Feb 2024', downloads: 1, orders: 1 },
  { id: 'usr-005', name: 'Reza Pratama',  email: 'reza@example.com',  plan: 'Free',     status: 'ACTIVE', joined: '5 Mar 2024',  downloads: 2, orders: 1 },
]

const PLAN_COLOR: Record<string, string> = {
  Free:     'bg-gray-100 text-gray-600',
  Pro:      'bg-violet-50 text-violet-700',
  Business: 'bg-amber-50 text-amber-700',
}

export default function UsersPage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pengguna</h1>
          <p className="text-sm text-gray-400">{USERS.length} pengguna terdaftar</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pengguna</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Download</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pesanan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bergabung</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {USERS.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-semibold flex-shrink-0">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLOR[u.plan]}`}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{u.downloads}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{u.orders}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.joined}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
