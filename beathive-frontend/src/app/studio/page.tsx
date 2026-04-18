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

interface Earning { id: string; soundTitle: string; amountRp: number; earnedAt: string; }
interface Withdrawal { id: string; amountRp: number; status: string; bankName: string; accountNo: string; createdAt: string; }
interface WalletData { balance: number; totalEarned: number; earnings: Earning[]; withdrawals: Withdrawal[]; }

export default function StudioPage() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();

  const [tab, setTab] = useState<'sounds' | 'earnings'>('sounds');
  const [sounds, setSounds] = useState<SoundEffect[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', accountNo: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
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
    fetchMySounds();
    fetchWallet();
  }, [isAuthenticated]);

  const fetchWallet = async () => {
    const token = accessToken || localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/earnings/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setWallet(await res.json());
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const token = accessToken || localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/earnings/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountRp: Number(withdrawForm.amount),
          bankName: withdrawForm.bankName,
          accountNo: withdrawForm.accountNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal');
      setWithdrawMsg('Request withdrawal berhasil! Admin akan memproses dalam 1-3 hari kerja.');
      setWithdrawForm({ amount: '', bankName: '', accountNo: '' });
      fetchWallet();
    } catch (err: any) {
      setWithdrawMsg(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Studio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Kelola dan upload sound effect kamu</p>
        </div>
        {tab === 'sounds' && (
          <button
            onClick={() => { setShowModal(true); setUploadError(null); setUploadSuccess(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload Sound
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(['sounds', 'earnings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'sounds' ? 'Sound Saya' : `Earnings${wallet ? ` · Rp ${(wallet.balance / 1000).toFixed(0)}rb` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'earnings' && (
        <div className="space-y-4">
          {/* Saldo cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Saldo Tersedia</p>
              <p className="text-2xl font-bold text-violet-600">
                Rp {((wallet?.balance ?? 0) / 1000).toFixed(0)}rb
              </p>
              <p className="text-xs text-gray-400 mt-1">Min. withdraw Rp 50rb</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {((wallet?.totalEarned ?? 0) / 1000).toFixed(0)}rb
              </p>
              <p className="text-xs text-gray-400 mt-1">25% pool subscription</p>
            </div>
          </div>

          {/* Withdraw form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Request Withdrawal</h3>
            <form onSubmit={handleWithdraw} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Jumlah (Rp)</label>
                  <input
                    type="number" min="50000" step="10000"
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="50000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank</label>
                  <input
                    type="text" value={withdrawForm.bankName}
                    onChange={e => setWithdrawForm(f => ({ ...f, bankName: e.target.value }))}
                    placeholder="BCA / BRI / Mandiri / dll"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nomor Rekening</label>
                <input
                  type="text" value={withdrawForm.accountNo}
                  onChange={e => setWithdrawForm(f => ({ ...f, accountNo: e.target.value }))}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              {withdrawMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${withdrawMsg.includes('berhasil') ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
                  {withdrawMsg}
                </p>
              )}
              <button
                type="submit" disabled={withdrawing || (wallet?.balance ?? 0) < 50000}
                className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {withdrawing ? 'Memproses...' : 'Request Withdrawal'}
              </button>
            </form>
          </div>

          {/* Earning history */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Riwayat Earning</h3>
            {!wallet?.earnings.length ? (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada earning. Upload PRO sound dan tunggu downloads!</p>
            ) : (
              <div className="space-y-2">
                {wallet.earnings.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-700 truncate max-w-xs">{e.soundTitle}</p>
                      <p className="text-xs text-gray-400">{new Date(e.earnedAt).toLocaleDateString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-teal-600">+Rp {e.amountRp.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {uploadSuccess && tab === 'sounds' && (
        <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-xl flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Sound berhasil diupload!
        </div>
      )}

      {tab === 'sounds' && (loadingList ? (
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
          {sounds.map((sound) => {
            const reviewStatus = sound.reviewStatus || 'PENDING';
            const isRejected = reviewStatus === 'REJECTED';
            const statusCls = reviewStatus === 'APPROVED'
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : isRejected
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';
            const statusLabel = reviewStatus === 'APPROVED' ? 'Live' : isRejected ? 'Ditolak' : 'Menunggu Review';
            return (
              <div key={sound.id} className={`bg-white rounded-xl border px-4 py-3 ${isRejected ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sound.title}</p>
                    <p className="text-xs text-gray-400">
                      {sound.category?.name} · {sound.format?.toUpperCase()} · {formatDuration(sound.durationMs)}
                      {' · '}{sound.playCount}x diputar · {sound.downloadCount}x diunduh
                    </p>
                  </div>
                  <button
                    onClick={() => fixDuration(sound)}
                    disabled={fixingId === sound.id}
                    title="Kalkulasi ulang durasi dari file"
                    className="text-xs px-2 py-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {fixingId === sound.id ? '...' : 'Fix Durasi'}
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${statusCls}`}>
                    {statusLabel}
                  </span>
                </div>
                {isRejected && sound.reviewNote && (
                  <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-xs text-red-600"><span className="font-medium">Alasan: </span>{sound.reviewNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

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
