'use client'
import { useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'

const SOUNDS = [
  { id: 'sfx-001', title: 'Explosion Heavy 01', category: 'Aksi', price: 25000, access: 'FREE', plays: 1250, downloads: 430, published: true },
  { id: 'sfx-002', title: 'Explosion Deep 02', category: 'Aksi', price: 30000, access: 'PRO', plays: 890, downloads: 210, published: true },
  { id: 'sfx-003', title: 'Gunshot Pistol 01', category: 'Aksi', price: 20000, access: 'FREE', plays: 2100, downloads: 780, published: true },
  { id: 'sfx-006', title: 'Rain Heavy Loop', category: 'Alam', price: 0, access: 'FREE', plays: 3200, downloads: 1100, published: true },
  { id: 'sfx-007', title: 'Thunder Crack Close', category: 'Alam', price: 0, access: 'FREE', plays: 1800, downloads: 620, published: true },
  { id: 'sfx-011', title: 'UI Click Soft', category: 'UI / Game', price: 0, access: 'FREE', plays: 5600, downloads: 2100, published: true },
  { id: 'sfx-013', title: 'Game Level Up', category: 'UI / Game', price: 15000, access: 'FREE', plays: 3800, downloads: 1400, published: true },
  { id: 'sfx-014', title: 'Game Coin Collect', category: 'UI / Game', price: 0, access: 'FREE', plays: 6100, downloads: 2400, published: true },
  { id: 'sfx-018', title: 'Hospital Corridor', category: 'Suasana', price: 35000, access: 'BUSINESS', plays: 560, downloads: 180, published: true },
  { id: 'sfx-027', title: 'Jump Scare Sting', category: 'Horror', price: 30000, access: 'PRO', plays: 2100, downloads: 760, published: true },
  { id: 'sfx-029', title: 'Cartoon Boing', category: 'Komedi', price: 0, access: 'FREE', plays: 4500, downloads: 1800, published: true },
  { id: 'sfx-030', title: 'Fail Trombone Wah', category: 'Komedi', price: 0, access: 'FREE', plays: 5200, downloads: 2100, published: true },
]

const ACCESS_COLOR: Record<string, string> = {
  FREE:     'bg-teal-50 text-teal-700',
  PRO:      'bg-violet-50 text-violet-700',
  BUSINESS: 'bg-amber-50 text-amber-700',
  PURCHASE: 'bg-gray-100 text-gray-600',
}

export default function SoundsPage() {
  const [search, setSearch] = useState('')
  const filtered = SOUNDS.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Sound Effects</h1>
            <p className="text-sm text-gray-400">{SOUNDS.length} total sound effect</p>
          </div>
          <button className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            + Upload SFX
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Cari sound effect..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Judul</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Akses</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Play</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Download</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.id}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCESS_COLOR[s.access]}`}>
                      {s.access}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {s.price === 0 ? <span className="text-teal-600 font-medium">Gratis</span> : `Rp ${s.price.toLocaleString('id-ID')}`}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.plays.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.downloads.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.published ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-violet-600 hover:underline">Edit</button>
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
