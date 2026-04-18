// src/app/studio/page.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatDuration } from '@/lib/utils';
import type { SoundEffect } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const CATEGORIES = [
  { id: '', label: 'Pilih Kategori...' },
  { id: 'aksi', label: 'Aksi' },
  { id: 'alam', label: 'Alam' },
  { id: 'ui-game', label: 'UI / Game' },
  { id: 'suasana', label: 'Suasana' },
  { id: 'manusia', label: 'Manusia' },
  { id: 'kendaraan', label: 'Kendaraan' },
  { id: 'hewan', label: 'Hewan' },
  { id: 'elektronik', label: 'Elektronik' },
];

export default function StudioPage() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();

  const [sounds, setSounds] = useState<SoundEffect[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    categorySlug: '',
    description: '',
    price: '0',
    accessLevel: 'FREE',
    licenseType: 'personal',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (user && user.role !== 'AUTHOR' && user.role !== 'ADMIN') {
      router.push('/browse');
      return;
    }
    fetchMySounds();
  }, [isAuthenticated, user]);

  const fetchMySounds = async () => {
    setLoadingList(true);
    try {
      const token = accessToken || localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/sounds/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSounds(data.items || []);
      }
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  };

  const fixDuration = async (sound: SoundEffect) => {
    setFixingId(sound.id);
    try {
      const token = accessToken || localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/sounds/${sound.id}/recalculate-duration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.durationMs > 0) {
          setSounds((prev) =>
            prev.map((s) => s.id === sound.id ? { ...s, durationMs: data.durationMs } : s)
          );
        }
      }
    } catch { /* ignore */ }
    finally { setFixingId(null); }
  };

  const set = (key: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!form.title) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setForm((f) => ({ ...f, title: name }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) handleFileSelect(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setUploadError('Pilih file audio dulu'); return; }
    if (!form.title.trim()) { setUploadError('Judul harus diisi'); return; }
    if (!form.categorySlug) { setUploadError('Pilih kategori'); return; }

    setUploading(true);
    setUploadError(null);
    setUploadProgress('Mengupload file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', form.title.trim());
      formData.append('categorySlug', form.categorySlug);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('accessLevel', form.accessLevel);
      formData.append('licenseType', form.licenseType);
      if (form.tags.trim()) {
        formData.append('tags', form.tags.trim());
      }

      const token = accessToken || localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/sounds/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload gagal' }));
        throw new Error(err.message || 'Upload gagal');
      }

      const data = await res.json();
      setSounds((prev) => [data, ...prev]);
      setUploadSuccess(true);
      setShowModal(false);
      setForm({ title: '', categorySlug: '', description: '', price: '0', accessLevel: 'FREE', licenseType: 'personal', tags: '' });
      setSelectedFile(null);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'Upload gagal');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Studio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Kelola dan upload sound effect kamu</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setUploadError(null); setUploadSuccess(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload Sound
        </button>
      </div>

      {uploadSuccess && (
        <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-xl flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Sound berhasil diupload!
        </div>
      )}

      {loadingList ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sounds.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Belum ada sound</p>
          <p className="text-sm text-gray-400 mt-1">Upload sound effect pertamamu</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Upload Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sounds.map((sound) => (
            <div key={sound.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{sound.title}</p>
                <p className="text-xs text-gray-400">
                  {sound.category?.name} · {sound.format?.toUpperCase()} · {formatDuration(sound.durationMs)}
                  {' · '}{sound.playCount}x diputar · {sound.downloadCount}x diunduh
                </p>
              </div>
              {/* Fix duration button — always shown so authors can recalculate */}
              <button
                onClick={() => fixDuration(sound)}
                disabled={fixingId === sound.id}
                title="Kalkulasi ulang durasi dari file"
                className="text-xs px-2 py-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {fixingId === sound.id ? '...' : 'Fix Durasi'}
              </button>
              <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${
                sound.isPublished
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {sound.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Upload Sound Effect</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File picker */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  selectedFile ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-violet-700">{selectedFile.name}</p>
                    <p className="text-xs text-violet-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p className="text-sm text-gray-500">Drag & drop atau <span className="text-violet-600">pilih file audio</span></p>
                    <p className="text-xs text-gray-400 mt-1">WAV, MP3, OGG, FLAC · Maks 100MB</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Judul *</label>
                <input
                  type="text" value={form.title} onChange={set('title')} required
                  placeholder="Misal: Heavy Metal Impact"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kategori *</label>
                <select
                  value={form.categorySlug} onChange={set('categorySlug')} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea
                  value={form.description} onChange={set('description')}
                  rows={2} placeholder="Deskripsi singkat sound..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Access Level + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Akses</label>
                  <select
                    value={form.accessLevel} onChange={set('accessLevel')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="FREE">Gratis</option>
                    <option value="PRO">Pro</option>
                    <option value="BUSINESS">Business</option>
                    <option value="PURCHASE">Beli Satuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Harga (Rp) {form.accessLevel === 'FREE' && <span className="text-gray-400">— tidak perlu</span>}
                  </label>
                  <input
                    type="number" value={form.price} onChange={set('price')}
                    min="0" step="1000"
                    disabled={form.accessLevel === 'FREE'}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tags <span className="text-gray-400">(pisahkan dengan koma)</span></label>
                <input
                  type="text" value={form.tags} onChange={set('tags')}
                  placeholder="impact, metal, heavy, sfx"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{uploadError}</p>
              )}

              {uploadProgress && (
                <p className="text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">{uploadProgress}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={uploading || !selectedFile}
                  className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengupload...</>
                  ) : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
