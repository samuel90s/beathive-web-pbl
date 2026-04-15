// src/app/auth/callback/page.tsx
// Halaman ini menangkap token dari Google OAuth redirect
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.push('/auth/login?error=oauth_failed');
      return;
    }

    // Simpan token dulu, lalu fetch user data
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    authApi.getMe()
      .then((user) => {
        setAuth(user, accessToken, refreshToken);
        router.push('/browse');
      })
      .catch(() => {
        router.push('/auth/login?error=fetch_failed');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Memproses login...</p>
      </div>
    </div>
  );
}
