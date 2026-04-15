'use client'
import AdminLayout from '@/components/layout/AdminLayout'

const STATS = [
  { label: 'Total Sound Effects', value: '30', sub: '+3 bulan ini', color: 'violet' },
  { label: 'Total Pengguna', value: '5', sub: '+2 minggu ini', color: 'teal' },
  { label: 'Pesanan Lunas', value: '4', sub: 'Rp 115.000 total', color: 'green' },
  { label: 'Subscriber Aktif', value: '3', sub: '1 Business, 2 Pro', color: 'amber' },
]

const RECENT_ORDERS = [
  { id: 'INV-2024-00001', user: 'Budi Santoso', amount: 25000, status: 'PAID', date: '10 Apr 2024' },
  { id: 'INV-2024-00002', user: 'Budi Santoso', amount: 45000, status: 'PAID', date: '12 Apr 2024' },
  { id: 'INV-2024-00003', user: 'Reza Pratama', amount: 30000, status: 'PAID', date: '14 Apr 2024' },
  { id: 'INV-2024-00004', user: 'Dewi Permata', amount: 15000, status: 'PAID', date: '13 Apr 2024' },
  { id: '-', user: 'Siti Rahayu', amount: 20000, status: 'PENDING', date: '15 Apr 2024' },
]

const TOP_SOUNDS = [
  { title: 'UI Click Soft', category: 'UI / Game', downloads: 2100, plays: 5600 },
  { title: 'Cartoon Boing', category: 'Komedi', downloads: 1800, plays: 4500 },
  { title: 'Fail Trombone Wah', category: 'Komedi', downloads: 2100, plays: 5200 },
  { title: 'Game Coin Collect', category: 'UI / Game', downloads: 2400, plays: 6100 },
  { title: 'UI Notification Ding', category: 'UI / Game', downloads: 1800, plays: 4200 },
]

const colorMap: Record<string, string> = {
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  green:  'bg-green-50 text-green-700 border-green-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
}

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${colorMap[s.color]}`}>
              <p className="text-xs font-medium opacity-70 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs opacity-60 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Pesanan Terbaru</h2>
              <a href="/orders" className="text-xs text-violet-600 hover:underline">Lihat semua</a>
            </div>
            <div className="divide-y divide-gray-50">
              {RECENT_ORDERS.map((o) => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{o.user}</p>
                    <p className="text-xs text-gray-400">{o.id} · {o.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      Rp {o.amount.toLocaleString('id-ID')}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      o.status === 'PAID'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {o.status === 'PAID' ? 'Lunas' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sounds */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Sound Effect Terpopuler</h2>
              <a href="/sounds" className="text-xs text-violet-600 hover:underline">Lihat semua</a>
            </div>
            <div className="divide-y divide-gray-50">
              {TOP_SOUNDS.map((s, i) => (
                <div key={s.title} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-300 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.category}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{s.downloads.toLocaleString()} download</p>
                    <p>{s.plays.toLocaleString()} play</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
