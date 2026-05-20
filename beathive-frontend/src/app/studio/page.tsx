// src/app/studio/page.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';
import { formatDuration } from '@/lib/utils';
import { toast } from '@/lib/store/toast.store';
import type { SoundEffect } from '@/types';

const inputCls = 'w-full px-3 py-2 input-dark rounded-xl text-sm';
const labelCls = 'block text-xs font-medium text-[#6b6f82] mb-1';

const REVIEW_STATUS: Record<string, { label: string; cls: string }> = {
  APPROVED:        { label: 'Live',            cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  PENDING:         { label: 'Pending Review',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  REJECTED:        { label: 'Rejected',        cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  NEEDS_RE_REVIEW: { label: 'Needs Re-review', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

const MUSICAL_KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];
const MOODS = ['upbeat','calm','epic','sad','dark','happy','neutral','tense','romantic','mysterious'];

export default function StudioPage() {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [editSound, setEditSound] = useState<SoundEffect | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '0', accessLevel: 'FREE', categorySlug: '', tags: '', bpm: '', mood: '', musicalKey: '', hasStems: false });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setFormState] = useState({ title: '', categorySlug: '', description: '', price: '0', accessLevel: 'FREE', licenseType: 'personal', tags: '', bpm: '', mood: '', musicalKey: '', hasStems: false });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, _hasHydrated, router]);

  const { data: soundsData, isLoading: loadingList } = useQuery({
    queryKey: ['my-sounds'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sounds/mine');
      return (data.items ?? []) as SoundEffect[];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/sounds/categories');
      return data as { slug: string; name: string; type: string }[];
    },
    staleTime: 5 * 60_000,
  });

  const sounds = soundsData ?? [];

  const fixDuration = async (sound: SoundEffect) => {
    setFixingId(sound.id);
    try {
      const { data } = await apiClient.post(`/sounds/${sound.id}/recalculate-duration`);
      if (data.durationMs > 0) {
        queryClient.setQueryData<SoundEffect[]>(['my-sounds'], prev =>
          prev?.map(s => s.id === sound.id ? { ...s, durationMs: data.durationMs } : s) ?? []
        );
      }
    } catch {
      toast.error('Gagal menghitung ulang durasi');
    } finally {
      setFixingId(null);
    }
  };

  const openEdit = (sound: SoundEffect) => {
    setEditSound(sound);
    setEditError(null);
    setEditForm({
      title: sound.title,
      description: sound.description || '',
      price: String(sound.price ?? 0),
      accessLevel: sound.accessLevel || 'FREE',
      categorySlug: sound.category?.slug || '',
      tags: (sound.tags?.map((t: any) => t.tag?.slug ?? t.slug ?? t.name ?? t) ?? []).join(', '),
      bpm: sound.bpm ? String(sound.bpm) : '',
      mood: sound.mood || '',
      musicalKey: sound.musicalKey || '',
      hasStems: sound.hasStems ?? false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSound) return;
    setSaving(true); setEditError(null);
    try {
      const tagSlugs = editForm.tags.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
      const body: any = {
        title: editForm.title.trim(),
        description: editForm.description,
        price: Number(editForm.price),
        accessLevel: editForm.accessLevel,
        categorySlug: editForm.categorySlug || editSound.category?.slug,
        tags: tagSlugs,
        bpm: editForm.bpm ? Number(editForm.bpm) : undefined,
        mood: editForm.mood || undefined,
        musicalKey: editForm.musicalKey || undefined,
        hasStems: editForm.hasStems,
      };
      const { data } = await apiClient.patch(`/sounds/${editSound.id}`, body);
      queryClient.setQueryData<SoundEffect[]>(['my-sounds'], prev =>
        prev?.map(s => s.id === editSound.id ? { ...s, ...data, tags: data.tags ?? s.tags } : s) ?? []
      );
      setEditSound(null);
      toast.success('Perubahan berhasil disimpan');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setEditError(Array.isArray(msg) ? msg.join(', ') : msg || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const setEdit = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm(f => ({ ...f, [key]: e.target.value }));
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormState(f => ({ ...f, [key]: e.target.value }));

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!form.title) setFormState(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) handleFileSelect(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setUploadError('Pilih file audio terlebih dahulu'); return; }
    if (!form.title.trim()) { setUploadError('Judul wajib diisi'); return; }
    if (!form.categorySlug) { setUploadError('Pilih kategori terlebih dahulu'); return; }

    setUploading(true); setUploadError(null); setUploadProgress('Mengupload file...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', form.title.trim());
      formData.append('categorySlug', form.categorySlug);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('accessLevel', form.accessLevel);
      formData.append('licenseType', form.licenseType);
      if (form.tags.trim()) formData.append('tags', form.tags.trim());
      if (form.bpm) formData.append('bpm', form.bpm);
      if (form.mood) formData.append('mood', form.mood);
      if (form.musicalKey) formData.append('musicalKey', form.musicalKey);
      if (form.hasStems) formData.append('hasStems', 'true');

      const { data } = await apiClient.post('/sounds/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Prepend new sound to cache
      queryClient.setQueryData<SoundEffect[]>(['my-sounds'], prev => [data, ...(prev ?? [])]);
      setUploadSuccess(true);
      setShowModal(false);
      setFormState({ title: '', categorySlug: '', description: '', price: '0', accessLevel: 'FREE', licenseType: 'personal', tags: '', bpm: '', mood: '', musicalKey: '', hasStems: false });
      setSelectedFile(null);
      toast.success('Sound berhasil diupload! Menunggu review admin.');
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 413) setUploadError('File terlalu besar. Kurangi ukuran file.');
      else setUploadError(Array.isArray(msg) ? msg.join(', ') : msg || 'Upload gagal. Coba lagi.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  if (!isAuthenticated || !user) return null;

  const sub = user.subscription;
  const subExpiresAt = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const subExpiresSoon = subExpiresAt && sub?.plan?.slug !== 'free' && subExpiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && subExpiresAt > new Date();
  const subExpired = subExpiresAt && sub?.plan?.slug !== 'free' && sub?.status !== 'ACTIVE';

  const liveCount = sounds.filter(s => s.reviewStatus === 'APPROVED').length;
  const pendingCount = sounds.filter(s => s.reviewStatus === 'PENDING' || s.reviewStatus === 'NEEDS_RE_REVIEW').length;

  return (
    <div className="px-8 py-8 pb-28">

      {/* Subscription warning */}
      {(subExpiresSoon || subExpired) && (
        <div className={`mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 border ${subExpired ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${subExpired ? 'text-red-400' : 'text-amber-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className={`text-sm font-medium ${subExpired ? 'text-red-400' : 'text-amber-400'}`}>
              {subExpired ? 'Subscription expired' : `Subscription berakhir ${subExpiresAt!.toLocaleDateString('id-ID')}`}
            </p>
            <p className={`text-xs mt-0.5 ${subExpired ? 'text-red-400/80' : 'text-amber-400/80'}`}>
              <Link href="/pricing" className="underline font-medium">Lihat paket</Link>
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Studio</h1>
          <p className="text-sm text-[#5a5d72] mt-1">Kelola dan upload sound effect kamu</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setUploadError(null); setUploadSuccess(false); }}
          className="flex items-center gap-2 px-5 py-2.5 btn-accent rounded-xl text-sm font-semibold flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload Sound
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Sound', value: sounds.length, color: 'text-white',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b8fa8" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
          { label: 'Live', value: liveCount, color: 'text-teal-400',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
          { label: 'Menunggu Review', value: pendingCount, color: 'text-amber-400',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-2xl border border-[#1e2030] bg-[#0f1020] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">{icon}</div>
            <div>
              <p className="text-xs text-[#5a5d72] font-medium mb-0.5">{label}</p>
              <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload success banner */}
      {uploadSuccess && (
        <div className="mb-4 px-4 py-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm rounded-xl flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Sound berhasil diupload! Menunggu review admin.
        </div>
      )}

      {/* Sound list header */}
      {sounds.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-bold text-[#5a5d72] uppercase tracking-[0.12em]">Sound Kamu ({sounds.length})</h2>
          <div className="flex-1 h-px bg-[#1e2030]" />
        </div>
      )}

      {/* Sound list */}
      {loadingList ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-[72px] rounded-xl bg-[#0f1020] border border-[#1e2030] animate-pulse" />
          ))}
        </div>
      ) : sounds.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-[#1e2030]">
          <div className="w-16 h-16 rounded-2xl bg-accent/[0.08] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-white">Belum ada sound</p>
          <p className="text-sm text-[#5a5d72] mt-1 mb-6">Upload sound pertama kamu dan mulai earning</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 btn-accent rounded-xl text-sm font-semibold">
            Upload Sekarang
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1e2030] overflow-hidden">
          {sounds.map((sound, idx) => {
            const status = REVIEW_STATUS[sound.reviewStatus || 'PENDING'] ?? REVIEW_STATUS.PENDING;
            return (
              <div key={sound.id}>
                <div className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] ${idx > 0 ? 'border-t border-[#1a1b2e]' : ''} ${sound.reviewStatus === 'REJECTED' ? 'border-l-2 border-l-red-500/40' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-accent/[0.08] border border-accent/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{sound.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[#5a5d72]">{sound.category?.name}</span>
                      <span className="text-[#2a2c3e]">·</span>
                      <span className="text-xs text-[#3a3c4e] font-mono uppercase">{sound.format}</span>
                      <span className="text-[#2a2c3e]">·</span>
                      <span className="text-xs text-[#3a3c4e]">{formatDuration(sound.durationMs)}</span>
                      {sound.durationMs === 0 && (
                        <button
                          onClick={() => fixDuration(sound)}
                          disabled={fixingId === sound.id}
                          className="text-amber-400 hover:underline text-[11px] ml-0.5"
                        >
                          {fixingId === sound.id ? 'memproses...' : 'fix durasi'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center gap-6 text-xs flex-shrink-0">
                    <div className="text-center">
                      <p className="text-[#c4c6d8] font-semibold">{sound.playCount.toLocaleString()}</p>
                      <p className="text-[#3a3c4e] text-[10px] mt-0.5">plays</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#c4c6d8] font-semibold">{sound.downloadCount.toLocaleString()}</p>
                      <p className="text-[#3a3c4e] text-[10px] mt-0.5">downloads</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${status.cls}`}>{status.label}</span>
                    <button
                      onClick={() => openEdit(sound)}
                      className="w-8 h-8 rounded-lg border border-[#1e2030] text-[#5a5d72] hover:text-white hover:border-[#2a2c3e] flex items-center justify-center transition-all"
                      title="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Reject reason */}
                {sound.reviewStatus === 'REJECTED' && sound.reviewNote && (
                  <div className="px-5 pb-3 -mt-1 border-t border-[#1a1b2e]">
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2">
                      <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p className="text-xs text-red-400"><span className="font-medium">Alasan penolakan: </span>{sound.reviewNote}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      {editSound && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card-lift rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border border-rim shadow-elevated">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Edit Sound</h2>
              <button onClick={() => setEditSound(null)} className="text-[#4a4d5e] hover:text-[#8b8fa8] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div><label className={labelCls}>Judul *</label><input type="text" value={editForm.title} onChange={setEdit('title')} required className={inputCls} /></div>
              <div>
                <label className={labelCls}>Kategori *</label>
                <select value={editForm.categorySlug} onChange={setEdit('categorySlug')} required className={`${inputCls} bg-lift`}>
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Deskripsi</label><textarea value={editForm.description} onChange={setEdit('description')} rows={2} className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Akses</label>
                  <select value={editForm.accessLevel} onChange={setEdit('accessLevel')} className={`${inputCls} bg-lift`}>
                    <option value="FREE">Free</option><option value="PRO">Pro</option><option value="PURCHASE">Purchase</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Harga (Rp)</label>
                  <input type="number" value={editForm.price} onChange={setEdit('price')} min="0" step="1000" disabled={editForm.accessLevel === 'FREE'} className={`${inputCls} disabled:opacity-40`} />
                </div>
              </div>
              <div><label className={labelCls}>Tags <span className="text-[#4a4d5e]">(pisahkan dengan koma)</span></label><input type="text" value={editForm.tags} onChange={setEdit('tags')} placeholder="impact, metal, heavy" className={inputCls} /></div>
              {categories.find(c => c.slug === (editForm.categorySlug || editSound?.category?.slug))?.type === 'music' && (
                <div className="space-y-3 pt-1 border-t border-rim">
                  <p className="text-xs font-semibold text-accent-bright">Detail Musik</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>BPM</label><input type="number" value={editForm.bpm} onChange={setEdit('bpm')} min="1" max="300" placeholder="120" className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Nada</label>
                      <select value={editForm.musicalKey} onChange={setEdit('musicalKey')} className={`${inputCls} bg-lift`}>
                        <option value="">— Pilih —</option>
                        {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Mood</label>
                    <select value={editForm.mood} onChange={setEdit('mood')} className={`${inputCls} bg-lift`}>
                      <option value="">— Pilih —</option>
                      {MOODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={editForm.hasStems} onChange={e => setEditForm(f => ({ ...f, hasStems: e.target.checked }))} className="w-4 h-4 rounded accent-violet-600" />
                    <span className="text-sm text-[#c4c6d8]">Termasuk stems / track terpisah</span>
                  </label>
                </div>
              )}
              {editForm.accessLevel !== 'FREE' && <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">Mengubah harga atau akses akan mereset status review ke Pending.</p>}
              {editError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditSound(null)} className="flex-1 py-2.5 btn-ghost rounded-xl text-sm font-medium">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 btn-accent rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Upload Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card-lift rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border border-rim shadow-elevated">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Upload Sound Effect</h2>
              <button onClick={() => setShowModal(false)} className="text-[#4a4d5e] hover:text-[#8b8fa8] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${selectedFile ? 'border-accent/60 bg-accent/[0.08]' : 'border-rim hover:border-accent/40 hover:bg-accent/[0.05]'}`}
              >
                <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-accent-bright">{selectedFile.name}</p>
                    <p className="text-xs text-[#6b6f82] mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-[#3a3c4e] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p className="text-sm text-[#6b6f82]">Drag & drop atau <span className="text-accent-bright">pilih file audio</span></p>
                    <p className="text-xs text-[#4a4d5e] mt-1">WAV, MP3, OGG, FLAC · Maks 100MB</p>
                  </div>
                )}
              </div>

              <div><label className={labelCls}>Judul *</label><input type="text" value={form.title} onChange={set('title')} required placeholder="cth. Heavy Metal Impact" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Kategori *</label>
                <select value={form.categorySlug} onChange={set('categorySlug')} required className={`${inputCls} bg-lift`}>
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Deskripsi</label><textarea value={form.description} onChange={set('description')} rows={2} placeholder="Deskripsi singkat sound..." className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Akses</label>
                  <select value={form.accessLevel} onChange={set('accessLevel')} className={`${inputCls} bg-lift`}>
                    <option value="FREE">Free</option><option value="PRO">Pro</option><option value="PURCHASE">Purchase</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Harga (Rp) {form.accessLevel === 'FREE' && <span className="text-[#4a4d5e]">— tidak perlu</span>}</label>
                  <input type="number" value={form.price} onChange={set('price')} min="0" step="1000" disabled={form.accessLevel === 'FREE'} placeholder="0" className={`${inputCls} disabled:opacity-40`} />
                </div>
              </div>
              <div><label className={labelCls}>Tags <span className="text-[#4a4d5e]">(pisahkan dengan koma)</span></label><input type="text" value={form.tags} onChange={set('tags')} placeholder="impact, metal, heavy, sfx" className={inputCls} /></div>

              {categories.find(c => c.slug === form.categorySlug)?.type === 'music' && (
                <div className="space-y-3 pt-1 border-t border-rim">
                  <p className="text-xs font-semibold text-accent-bright">Detail Musik</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>BPM</label><input type="number" value={form.bpm} onChange={set('bpm')} min="1" max="300" placeholder="120" className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Nada</label>
                      <select value={form.musicalKey} onChange={set('musicalKey')} className={`${inputCls} bg-lift`}>
                        <option value="">— Pilih —</option>
                        {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Mood</label>
                    <select value={form.mood} onChange={set('mood')} className={`${inputCls} bg-lift`}>
                      <option value="">— Pilih —</option>
                      {MOODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.hasStems} onChange={e => setFormState(f => ({ ...f, hasStems: e.target.checked }))} className="w-4 h-4 rounded accent-violet-600" />
                    <span className="text-sm text-[#c4c6d8]">Termasuk stems / track terpisah</span>
                  </label>
                </div>
              )}

              {uploadError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{uploadError}</p>}
              {uploadProgress && <p className="text-xs text-accent-bright bg-accent/10 border border-accent/20 px-3 py-2 rounded-lg">{uploadProgress}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 btn-ghost rounded-xl text-sm font-medium">Batal</button>
                <button type="submit" disabled={uploading || !selectedFile} className="flex-1 py-2.5 btn-accent rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengupload...</> : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
