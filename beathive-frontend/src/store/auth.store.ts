// src/store/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ user, accessToken, refreshToken })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }),
    {
      name: 'beathive-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

// ─────────────────────────────────────────────────────────────

// src/store/player.store.ts — global audio player state
import { SoundEffect } from '@/types'

interface PlayerState {
  currentTrack: SoundEffect | null
  queue: SoundEffect[]
  isPlaying: boolean
  progress: number       // 0–1
  duration: number       // dalam detik
  volume: number         // 0–1
  setTrack: (track: SoundEffect) => void
  addToQueue: (track: SoundEffect) => void
  togglePlay: () => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  playNext: () => void
  playPrev: () => void
  clearQueue: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,

  setTrack: (track) => {
    const { queue } = get()
    // Tambahkan ke queue kalau belum ada
    const inQueue = queue.find((t) => t.id === track.id)
    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      queue: inQueue ? queue : [...queue, track],
    })
  },

  addToQueue: (track) => {
    const { queue } = get()
    if (!queue.find((t) => t.id === track.id)) {
      set({ queue: [...queue, track] })
    }
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setProgress: (progress) => set({ progress }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume }),

  playNext: () => {
    const { currentTrack, queue } = get()
    if (!currentTrack) return
    const idx = queue.findIndex((t) => t.id === currentTrack.id)
    const next = queue[idx + 1]
    if (next) set({ currentTrack: next, isPlaying: true, progress: 0 })
  },

  playPrev: () => {
    const { currentTrack, queue } = get()
    if (!currentTrack) return
    const idx = queue.findIndex((t) => t.id === currentTrack.id)
    const prev = queue[idx - 1]
    if (prev) set({ currentTrack: prev, isPlaying: true, progress: 0 })
  },

  clearQueue: () => set({ queue: [], currentTrack: null, isPlaying: false }),
}))
