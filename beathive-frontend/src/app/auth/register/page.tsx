// src/app/auth/register/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password minimal 8 karakter'); return; }
    setLoading(true);
    setError(null);
    try {
      await register(form.name, form.email, form.password);
      router.push('/browse');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold">beat<span className="text-violet-600">hive</span></Link>
          <p className="text-gray-400 text-sm mt-2">Buat akun gratis</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { key: 'name', label: 'Nama lengkap', type: 'text', placeholder: 'Budi Santoso' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'budi@email.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Minimal 8 karakter' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={set(key)} required
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
              </div>
            ))}
            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
              {loading ? 'Membuat akun...' : 'Buat Akun Gratis'}
            </button>
          </form>
          <p className="text-xs text-center text-gray-400 mt-3">
            Dengan mendaftar kamu setuju dengan Syarat & Ketentuan kami
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Sudah punya akun?{' '}
          <Link href="/auth/login" className="text-violet-600 hover:text-violet-700 font-medium">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
