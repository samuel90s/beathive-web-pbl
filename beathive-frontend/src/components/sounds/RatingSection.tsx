'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';
import { mediaUrl } from '@/lib/utils';

interface Review {
  id: string;
  score: number;
  reviewText?: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

interface RatingData {
  avgScore: number;
  totalCount: number;
  distribution: { score: number; count: number }[];
  reviews: Review[];
}

function Stars({ score, interactive = false, onSelect }: { score: number; interactive?: boolean; onSelect?: (s: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={(interactive ? hover || score : score) >= s ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function RatingSection({ soundId }: { soundId: string }) {
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<RatingData | null>(null);
  const [myRating, setMyRating] = useState<{ score: number; reviewText?: string } | null>(null);
  const [score, setScore] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRatings();
    if (isAuthenticated) fetchMyRating();
  }, [soundId, isAuthenticated]);

  const fetchRatings = async () => {
    try {
      const res = await apiClient.get(`/ratings/sound/${soundId}`);
      setData(res.data);
    } catch { /* ignore */ }
  };

  const fetchMyRating = async () => {
    try {
      const res = await apiClient.get(`/ratings/sound/${soundId}/mine`);
      if (res.data) {
        setMyRating(res.data);
        setScore(res.data.score);
        setText(res.data.reviewText ?? '');
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await apiClient.post('/ratings', { soundId, score, reviewText: text || undefined });
      setMsg('Review submitted!');
      setShowForm(false);
      await fetchRatings();
      await fetchMyRating();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/ratings/${soundId}`);
      setMyRating(null);
      setScore(0);
      setText('');
      setMsg('Review removed.');
      await fetchRatings();
    } catch { /* ignore */ }
  };

  if (!data) return null;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Ratings & Reviews</h3>

      {/* Summary */}
      <div className="flex gap-6 mb-5">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">{data.avgScore > 0 ? data.avgScore.toFixed(1) : '—'}</p>
          <Stars score={data.avgScore} />
          <p className="text-xs text-gray-400 mt-1">{data.totalCount} review{data.totalCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 space-y-1">
          {data.distribution.map(d => (
            <div key={d.score} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right text-gray-500">{d.score}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{ width: data.totalCount > 0 ? `${(d.count / data.totalCount) * 100}%` : '0%' }}
                />
              </div>
              <span className="w-4 text-gray-400">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* My review status / CTA */}
      {isAuthenticated ? (
        myRating ? (
          <div className="mb-4 p-3 bg-violet-50 rounded-xl text-sm flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Your review</p>
              <Stars score={myRating.score} />
              {myRating.reviewText && <p className="text-gray-600 mt-1">{myRating.reviewText}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setShowForm(true)} className="text-xs text-violet-600 hover:underline">Edit</button>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ) : !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="mb-4 w-full py-2 border border-dashed border-violet-300 text-violet-600 text-sm rounded-xl hover:bg-violet-50 transition-colors"
          >
            Write a Review
          </button>
        ) : null
      ) : (
        <p className="mb-4 text-sm text-gray-400 text-center">
          <a href="/auth/login" className="text-violet-600 hover:underline">Sign in</a> to leave a review
        </p>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Your rating</p>
            <Stars score={score} interactive onSelect={setScore} />
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share your thoughts (optional)"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || score === 0}
              className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {msg && <p className="text-sm text-violet-600 mb-3">{msg}</p>}

      {/* Review list */}
      <div className="space-y-3">
        {data.reviews.filter(r => r.reviewText).map(r => (
          <div key={r.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
              {r.user.avatarUrl
                ? <img src={mediaUrl(r.user.avatarUrl)} alt={r.user.name} className="w-full h-full rounded-full object-cover" />
                : r.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-gray-700">{r.user.name}</span>
                <Stars score={r.score} />
              </div>
              <p className="text-sm text-gray-600">{r.reviewText}</p>
            </div>
          </div>
        ))}
        {data.reviews.filter(r => r.reviewText).length === 0 && data.totalCount > 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No written reviews yet.</p>
        )}
      </div>
    </div>
  );
}
