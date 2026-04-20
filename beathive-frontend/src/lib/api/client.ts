// src/lib/api/client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function getToken(key: 'accessToken' | 'refreshToken'): string | null {
  if (typeof window === 'undefined') return null;
  // Try the direct key first (set by setAuth), then fall back to the Zustand persist blob
  const direct = sessionStorage.getItem(key);
  if (direct) return direct;
  try {
    const raw = sessionStorage.getItem('beathive-auth');
    if (raw) return JSON.parse(raw)?.state?.[key] ?? null;
  } catch { /* ignore */ }
  return null;
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

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = getToken('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        sessionStorage.setItem('accessToken', data.accessToken);
        sessionStorage.setItem('refreshToken', data.refreshToken);
        // Also update the Zustand persist blob so the store stays in sync
        try {
          const raw = sessionStorage.getItem('beathive-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state.accessToken = data.accessToken;
            parsed.state.refreshToken = data.refreshToken;
            sessionStorage.setItem('beathive-auth', JSON.stringify(parsed));
          }
        } catch { /* ignore */ }

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('beathive-auth');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  },
);
