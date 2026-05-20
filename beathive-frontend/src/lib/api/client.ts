// src/lib/api/client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function getToken(key: 'accessToken' | 'refreshToken'): string | null {
  if (typeof window === 'undefined') return null;
  const direct = sessionStorage.getItem(key);
  if (direct) return direct;
  try {
    const raw = sessionStorage.getItem('beathive-auth');
    if (raw) return JSON.parse(raw)?.state?.[key] ?? null;
  } catch { /* ignore */ }
  return null;
}

function updateStoredTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem('accessToken', accessToken);
  sessionStorage.setItem('refreshToken', refreshToken);
  try {
    const raw = sessionStorage.getItem('beathive-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state.accessToken = accessToken;
      parsed.state.refreshToken = refreshToken;
      sessionStorage.setItem('beathive-auth', JSON.stringify(parsed));
    }
  } catch { /* ignore */ }
}

// FE-01: Mutex to prevent concurrent /auth/refresh calls.
// When multiple 401s fire simultaneously (e.g. after a 15m access token expires),
// only the first triggers a refresh; the rest queue up and reuse the same new token.
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function flushQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// Request interceptor — inject access token
apiClient.interceptors.request.use((config) => {
  const token = getToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getToken('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

      updateStoredTokens(data.accessToken, data.refreshToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
      flushQueue(null, data.accessToken);

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (err) {
      flushQueue(err, null);
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('beathive-auth');
      // Also clear Zustand store so isAuthenticated = false immediately,
      // preventing any in-flight renders from seeing stale auth state.
      try {
        const { useAuthStore } = await import('@/lib/store/auth.store');
        useAuthStore.getState().logout();
      } catch { /* ignore if store not available */ }
      window.location.href = '/auth/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
