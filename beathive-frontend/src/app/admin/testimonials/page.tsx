'use client';
import { API_URL as API } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

interface Testimonial {
  id: string;
  message: string;
  rating: number;
  isApproved: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 24 24" fill={n <= rating ? '#F7941D' : 'none'} stroke="#F7941D" strokeWidth="1.5">
          <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminTestimonialsPage() {
  const { accessToken } = useAuthStore();
  const token = () => accessToken || sessionStorage.getItem('accessToken') || '';

  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | ''>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : '';
    fetch(`${API}/admin/testimonials${qs}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id: string) => {
    setBusyId(id);
    await fetch(`${API}/admin/testimonials/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    setBusyId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this testimonial? This cannot be undone.')) return;
    setBusyId(id);
    await fetch(`${API}/admin/testimonials/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setBusyId(null);
    load();
  };

  const TABS: { key: 'pending' | 'approved' | ''; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: '', label: 'All' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Testimonials</h1>
        <p className="text-sm text-[#6b6f82] mt-0.5">Real feedback from users — approve to feature publicly.</p>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key || 'all'}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === tab.key ? 'bg-accent/10 text-accent-bright font-medium' : 'text-[#6b6f82] hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card rounded-xl border border-rim overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {items.map((t) => (
              <div key={t.id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-white">{t.user.name}</span>
                      <span className="text-xs text-[#6b6f82]">{t.user.email}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.isApproved ? 'bg-teal/10 text-teal' : 'bg-amber-500/10 text-amber-400'}`}>
                        {t.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <Stars rating={t.rating} />
                    <p className="text-sm text-[#c4c6d8] mt-2 leading-relaxed">{t.message}</p>
                    <p className="text-[11px] text-[#5a5d72] mt-1">{new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!t.isApproved && (
                      <button
                        onClick={() => approve(t.id)}
                        disabled={busyId === t.id}
                        className="px-3 py-1.5 text-xs font-medium bg-teal/10 text-teal rounded-lg hover:bg-teal/20 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => remove(t.id)}
                      disabled={busyId === t.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[#6b6f82]">No testimonials found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
