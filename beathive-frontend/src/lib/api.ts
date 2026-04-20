// src/lib/api.ts
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: inject access token ─────────────

function getToken(key: 'accessToken' | 'refreshToken'): string | null {
  if (typeof window === 'undefined') return null
  const direct = sessionStorage.getItem(key)
  if (direct) return direct
  try {
    const raw = sessionStorage.getItem('beathive-auth')
    if (raw) return JSON.parse(raw)?.state?.[key] ?? null
  } catch { /* ignore */ }
  return null
}

api.interceptors.request.use((config) => {
  const token = getToken('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: auto refresh token ─────────────

let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // Tunggu refresh selesai, lalu retry
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true

      try {
        const refreshToken = getToken('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        })

        sessionStorage.setItem('accessToken', data.accessToken)
        sessionStorage.setItem('refreshToken', data.refreshToken)

        queue.forEach((cb) => cb(data.accessToken))
        queue = []

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        // Refresh gagal — logout
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: () => api.get('/auth/me'),
}

// ─── Sounds ────────────────────────────────────────────────

export const soundsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/sounds', { params }),

  get: (slug: string) =>
    api.get(`/sounds/${slug}`),

  download: (id: string) =>
    api.post(`/sounds/${id}/download`),
}

// ─── Orders ───────────────────────────────────────────────

export const ordersApi = {
  create: (items: { soundEffectId: string; licenseType: string }[]) =>
    api.post('/orders', { items }),

  myOrders: () =>
    api.get('/orders/me'),
}

// ─── Subscriptions ────────────────────────────────────────

export const subscriptionsApi = {
  me: () =>
    api.get('/subscriptions/me'),

  upgrade: (planSlug: string, billingCycle: 'monthly' | 'yearly') =>
    api.post('/subscriptions/upgrade', { planSlug, billingCycle }),

  cancel: () =>
    api.delete('/subscriptions/me'),
}
