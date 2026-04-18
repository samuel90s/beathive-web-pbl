'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Sound {
  id: string;
  title: string;
  slug: string;
  format: string;
  accessLevel: string;
  reviewStatus: string;
  reviewNote?: string;
  durationMs: number;
  fileSize?: number;
  previewUrl: string;
  createdAt: string;
  category: { name: string };
  author?: { name: string; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

function formatDur(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function AdminSoundsPage() {
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState('PENDING');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const token = () => accessToken || localStorage.getItem('accessToken');

  const fetchSounds = async () => {
    setLoading(true);
    const status = tab === 'ALL' ? '' : `status=${tab}&`;
    const res = await fetch(`${API}/admin/sounds?${status}limit=50`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    setSounds(data.items || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchSounds(); }, [tab]);

  const approve = async (id: string) => {
    setActionLoading(id);
    await fetch(`${API}/admin/sounds/${id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` },
    });
    setSounds(prev => prev.map(s => s.id === id ? { ...s, reviewStatus: 'APPROVED' } : s));
    setActionLoading(null);
  };

  const reject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    await fetch(`${API}/admin/sounds/${rejectModal.id}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason || 'Tidak memenuhi standar kualitas' }),
    });
    setSounds(prev => prev.map(s => s.id === rejectModal.id
      ? { ...s, reviewStatus: 'REJECTED', reviewNote: rejectReason }
      : s
    ));
    setRejectModal(null);
    setRejectReason('');
    setActionLoading(null);
  };

  const togglePlay = (sound: Sound) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`${API}/sounds/${sound.id}/preview`);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(sound.id);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sound Review</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} sound ditemukan</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ALL' ? 'Semua' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sounds.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500">Tidak ada sound dengan status ini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sounds.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-4">
                {/* Play button */}
                <button
                  onClick={() => togglePlay(s)}
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                    playingId === s.id ? 'bg-violet-600' : 'bg-gray-100 hover:bg-violet-100'
                  }`}
                >
                  {playingId === s.id ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                      <rect x="1" y="0" width="3" height="10" rx="1"/>
                      <rect x="6" y="0" width="3" height="10" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="#6b7280">
                      <polygon points="0,0 10,6 0,12"/>
                    </svg>
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{s.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[s.reviewStatus]}`}>
                      {s.reviewStatus}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {s.accessLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.category?.name} · {s.format?.toUpperCase()} · {formatDur(s.durationMs)}
                    {s.author && ` · oleh ${s.author.name}`}
                    {' · '}{new Date(s.createdAt).toLocaleDateString('id-ID')}
                  </p>
                  {s.reviewNote && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded-lg">
                      Alasan reject: {s.reviewNote}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {s.reviewStatus === 'PENDING' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => approve(s.id)}
                      disabled={actionLoading === s.id}
                      className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === s.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setRejectModal({ id: s.id, title: s.title }); setRejectReason(''); }}
                      disabled={actionLoading === s.id}
                      className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {s.reviewStatus === 'APPROVED' && (
                  <button
                    onClick={() => { setRejectModal({ id: s.id, title: s.title }); setRejectReason(''); }}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                  >
                    Reject
                  </button>
                )}
                {s.reviewStatus === 'REJECTED' && (
                  <button
                    onClick={() => approve(s.id)}
                    disabled={actionLoading === s.id}
                    className="px-3 py-1.5 bg-teal-50 text-teal-600 border border-teal-200 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {actionLoading === s.id ? '...' : 'Approve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Reject Sound</h3>
            <p className="text-sm text-gray-500 mb-4">"{rejectModal.title}"</p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Alasan reject <span className="text-gray-400">(wajib ditulis)</span></label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Kualitas audio terlalu rendah, ada noise yang mengganggu..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
