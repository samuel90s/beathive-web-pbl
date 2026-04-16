'use client'
import { useState, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// ─── Tipe ─────────────────────────────────────────────────

interface Sound {
  id: string
  title: string
  category: string
  price: number
  access: string
  plays: number
  downloads: number
  published: boolean
}

// Data dummy (akan diganti dengan fetch ke API jika diperlukan)
const SOUNDS_MOCK: Sound[] = [
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

// ─── Upload Modal ──────────────────────────────────────────

interface UploadForm {
  title: string
  categoryId: string
  description: string
  price: string
  accessLevel: string
  licenseType: string
  tags: string
  token: string
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (sound: any) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState<UploadForm>({
    title: '',
    categoryId: '',
    description: '',
    price: '0',
    accessLevel: 'FREE',
    licenseType: 'personal',
    tags: '',
    token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '',
  })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const validExt = ['wav', 'mp3', 'ogg', 'flac']
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!validExt.includes(ext)) {
      setError(`Format tidak didukung: ${ext}. Gunakan WAV, MP3, OGG, atau FLAC.`)
      return
    }
    setSelectedFile(f)
    setError('')
    if (!form.title) {
      setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) { setError('Pilih file audio terlebih dahulu.'); return }
    if (!form.title.trim()) { setError('Judul wajib diisi.'); return }
    if (!form.categoryId.trim()) { setError('Category ID wajib diisi.'); return }
    if (!form.token.trim()) { setError('Access token wajib diisi. Login dulu di frontend lalu salin token.'); return }

    setUploading(true)
    setProgress('Mengunggah file...')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', form.title.trim())
      formData.append('categoryId', form.categoryId.trim())
      formData.append('description', form.description.trim())
      formData.append('price', form.price)
      formData.append('accessLevel', form.accessLevel)
      formData.append('licenseType', form.licenseType)
      if (form.tags.trim()) formData.append('tags', form.tags.trim())

      setProgress('Memproses audio & menyimpan ke database...')

      const res = await fetch(`${API_URL}/sounds/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${form.token.trim()}` },
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.message || `Error ${res.status}`)
      }

      setProgress('Berhasil!')
      onSuccess(json)
    } catch (err: any) {
      setError(err.message || 'Upload gagal. Coba lagi.')
      setProgress('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Upload Sound Effect</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              File Audio <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
            >
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-violet-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm text-gray-500">Klik untuk pilih file</p>
                  <p className="text-xs text-gray-400 mt-0.5">WAV, MP3, OGG, FLAC — maks. 100 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".wav,.mp3,.ogg,.flac,audio/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Judul */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Judul <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Contoh: Explosion Heavy 01"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Category ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Category ID <span className="text-rose-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(UUID dari tabel categories di DB)</span>
            </label>
            <input
              type="text"
              value={form.categoryId}
              onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Deskripsi singkat tentang sound effect ini..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          {/* Price + Access + License */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Harga (Rp)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Akses</label>
              <select
                value={form.accessLevel}
                onChange={e => setForm(p => ({ ...p, accessLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="PURCHASE">PURCHASE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Lisensi</label>
              <select
                value={form.licenseType}
                onChange={e => setForm(p => ({ ...p, licenseType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="personal">Personal</option>
                <option value="commercial">Commercial</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="explosion, action, war  (pisahkan dengan koma)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Access Token */}
          <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
            <label className="block text-xs font-medium text-amber-800">
              Access Token JWT <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-amber-700">
              Login di frontend (localhost:3001), buka DevTools → Application → Local Storage → salin nilai <code className="bg-amber-100 px-1 rounded">accessToken</code>
            </p>
            <input
              type="text"
              value={form.token}
              onChange={e => setForm(p => ({ ...p, token: e.target.value }))}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 border border-amber-200 bg-white rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Error / Progress */}
          {error && (
            <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg border border-rose-200">
              {error}
            </div>
          )}
          {progress && !error && (
            <div className="bg-violet-50 text-violet-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {progress}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Mengupload...
                </>
              ) : 'Upload SFX'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Halaman utama ─────────────────────────────────────────

export default function SoundsPage() {
  const [sounds, setSounds] = useState<Sound[]>(SOUNDS_MOCK)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [lastUploaded, setLastUploaded] = useState<any>(null)

  const filtered = sounds.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleUploadSuccess = (sound: any) => {
    setShowUpload(false)
    setLastUploaded(sound)
    // Tambahkan ke daftar lokal
    setSounds(prev => [{
      id: sound.id,
      title: sound.title,
      category: sound.category?.name ?? '-',
      price: sound.price ?? 0,
      access: sound.accessLevel ?? 'FREE',
      plays: 0,
      downloads: 0,
      published: sound.isPublished ?? true,
    }, ...prev])
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Sound Effects</h1>
            <p className="text-sm text-gray-400">{sounds.length} total sound effect</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            + Upload SFX
          </button>
        </div>

        {/* Upload success banner */}
        {lastUploaded && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-teal-800">
              <span className="font-medium">{lastUploaded.title}</span> berhasil diupload dan dipublikasikan.
            </p>
            <button onClick={() => setLastUploaded(null)} className="text-teal-500 hover:text-teal-700 text-lg leading-none ml-3">&times;</button>
          </div>
        )}

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
                    {s.price === 0
                      ? <span className="text-teal-600 font-medium">Gratis</span>
                      : `Rp ${s.price.toLocaleString('id-ID')}`}
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

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </AdminLayout>
  )
}
