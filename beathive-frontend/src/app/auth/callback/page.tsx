// src/app/auth/callback/page.tsx
'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    // Secure flow: backend sends a short-lived code, we exchange for real tokens.
    // Legacy URL-based token passing was removed (SEC-04) — tokens in URL
    // can leak via browser history, referrer headers, and server logs.
    const code = params.get('code');

    if (code) {
      authApi.exchangeCode(code)
        .then((result) => {
          setAuth(result.user, result.accessToken, result.refreshToken);
          router.push('/browse');
        })
        .catch(() => {
          router.push('/auth/login?error=oauth_failed');
        });
    } else {
      router.push('/auth/login?error=oauth_failed');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Memproses login...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
