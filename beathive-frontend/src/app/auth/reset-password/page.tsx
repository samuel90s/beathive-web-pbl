'use client';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!token) setError('Invalid or missing reset token.'); }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-base">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">beat</span><span className="text-accent-bright">hive</span>
          </Link>
          <p className="text-[#6b6f82] text-sm mt-2">Set a new password</p>
        </div>

        <div className="card rounded-2xl p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Password reset!</h2>
              <p className="text-sm text-[#6b6f82]">Your password has been updated. Redirecting to sign in...</p>
              <Link href="/auth/login" className="mt-6 inline-block text-sm text-accent-bright hover:underline">Sign in now</Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Create new password</h2>
              <p className="text-sm text-[#6b6f82] mb-5">Choose a strong password with at least 8 characters.</p>
              {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#6b6f82] mb-1">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    placeholder="Min. 8 characters" className="w-full px-3 py-2.5 input-dark rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[#6b6f82] mb-1">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    placeholder="Repeat your password" className="w-full px-3 py-2.5 input-dark rounded-xl text-sm" />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="w-full py-2.5 btn-accent rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
              <p className="text-center text-sm text-[#6b6f82] mt-4">
                <Link href="/auth/login" className="text-accent-bright hover:underline">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
