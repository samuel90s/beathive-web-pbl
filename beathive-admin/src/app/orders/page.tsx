'use client'
import AdminLayout from '@/components/layout/AdminLayout'

const ORDERS = [
  { id: 'ord-001', invoice: 'INV-2024-00001', user: 'Budi Santoso',  items: ['Explosion Heavy 01'], amount: 25000,  status: 'PAID',    date: '10 Apr 2024' },
  { id: 'ord-002', invoice: 'INV-2024-00002', user: 'Budi Santoso',  items: ['Explosion Deep 02', 'Punch Impact Hard'], amount: 45000, status: 'PAID', date: '12 Apr 2024' },
  { id: 'ord-003', invoice: 'INV-2024-00003', user: 'Reza Pratama',  items: ['Game Over Jingle', 'Jump Scare Sting'], amount: 30000, status: 'PAID', date: '14 Apr 2024' },
  { id: 'ord-004', invoice: 'INV-2024-00004', user: 'Dewi Permata',  items: ['Game Level Up'], amount: 15000,  status: 'PAID',    date: '13 Apr 2024' },
  { id: 'ord-005', invoice: '-',              user: 'Siti Rahayu',   items: ['Motorcycle Revving'], amount: 20000, status: 'PENDING', date: '15 Apr 2024' },
]

const STATUS_COLOR: Record<string, string> = {
  PAID:     'bg-green-50 text-green-700',
  PENDING:  'bg-amber-50 text-amber-700',
  FAILED:   'bg-red-50 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
}

const total = ORDERS.filter(o => o.status === 'PAID').reduce((s, o) => s + o.amount, 0)

export default function OrdersPage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Pesanan</h1>
            <p className="text-sm text-gray-400">{ORDERS.length} total · Revenue: Rp {total.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Lunas', value: ORDERS.filter(o => o.status === 'PAID').length, color: 'green' },
            { label: 'Pending', value: ORDERS.filter(o => o.status === 'PENDING').length, color: 'amber' },
            { label: 'Gagal', value: ORDERS.filter(o => o.status === 'FAILED').length, color: 'red' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-4 ${
              c.color === 'green' ? 'bg-green-50 border-green-100 text-green-700' :
              c.color === 'amber' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-red-50 border-red-100 text-red-700'
            }`}>
              <p className="text-xs font-medium opacity-70">{c.label}</p>
              <p className="text-2xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pembeli</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ORDERS.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-600">{o.invoice}</p>
                    <p className="text-xs text-gray-400">{o.id}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{o.user}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {o.items.map(i => (
                        <p key={i} className="text-xs text-gray-600">{i}</p>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    Rp {o.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status]}`}>
                      {o.status === 'PAID' ? 'Lunas' : o.status === 'PENDING' ? 'Pending' : o.status}
                    </span>
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
