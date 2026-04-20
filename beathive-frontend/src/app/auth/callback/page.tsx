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
    // New secure flow: backend sends a short-lived auth code (not real tokens)
    // We exchange it for real tokens via a POST request.
    const code = params.get('code');

    // Legacy fallback for any old bookmarks — should not happen in normal flow
    const legacyAccess = params.get('accessToken');
    const legacyRefresh = params.get('refreshToken');

    if (code) {
      // Secure flow: exchange auth code for tokens via API
      authApi.exchangeCode(code)
        .then((result) => {
          setAuth(result.user, result.accessToken, result.refreshToken);
          router.push('/browse');
        })
        .catch(() => {
          router.push('/auth/login?error=oauth_failed');
        });
    } else if (legacyAccess && legacyRefresh) {
      // Legacy fallback — maintain backwards compatibility but log warning
      console.warn('[BeatHive] Using legacy OAuth callback with tokens in URL. This is deprecated.');
      sessionStorage.setItem('accessToken', legacyAccess);
      sessionStorage.setItem('refreshToken', legacyRefresh);

      authApi.getMe()
        .then((user) => {
          setAuth(user, legacyAccess, legacyRefresh);
          router.push('/browse');
        })
        .catch(() => {
          router.push('/auth/login?error=fetch_failed');
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
