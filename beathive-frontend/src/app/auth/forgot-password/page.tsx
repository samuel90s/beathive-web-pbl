'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-base">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">beat</span><span className="text-accent-bright">hive</span>
          </Link>
          <p className="text-[#6b6f82] text-sm mt-2">Reset your password</p>
        </div>

        <div className="card rounded-2xl p-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-[#6b6f82]">
                If an account exists for <strong className="text-[#c4c6d8]">{email}</strong>, you'll receive a reset link shortly.
              </p>
              <Link href="/auth/login" className="mt-6 inline-block text-sm text-accent-bright hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Forgot your password?</h2>
              <p className="text-sm text-[#6b6f82] mb-5">Enter your email and we'll send you a reset link.</p>
              {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#6b6f82] mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com" className="w-full px-3 py-2.5 input-dark rounded-xl text-sm" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 btn-accent rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-[#6b6f82] mt-4">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-accent-bright hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
