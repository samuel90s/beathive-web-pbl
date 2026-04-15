# BeatHive Frontend

Frontend Next.js 14 untuk aplikasi stock sound effect. App Router, TypeScript, Tailwind CSS.

---

## Cara Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup env
cp .env.local.example .env.local
# Edit .env.local dengan nilai yang benar

# 3. Jalankan dev server
npm run dev
# Buka http://localhost:3001
```

Pastikan backend sudah berjalan di port 3000 sebelum menjalankan frontend.

---

## Struktur Project

```
src/
├── app/                       # Next.js App Router pages
│   ├── page.tsx               # Homepage
│   ├── layout.tsx             # Root layout (Navbar + GlobalPlayer)
│   ├── providers.tsx          # QueryClient provider
│   ├── browse/page.tsx        # Halaman browse & search SFX
│   ├── checkout/page.tsx      # Keranjang & checkout Midtrans
│   ├── dashboard/page.tsx     # Dashboard user (subscription, orders)
│   ├── pricing/page.tsx       # Halaman pricing plans
│   └── auth/
│       ├── login/page.tsx     # Form login + Google OAuth
│       ├── register/page.tsx  # Form registrasi
│       └── callback/page.tsx  # Handler redirect OAuth
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx         # Navigasi + cart badge + user menu
│   ├── player/
│   │   └── GlobalPlayer.tsx   # Sticky audio player (bottom)
│   └── sounds/
│       ├── SoundRow.tsx       # Baris sound effect di daftar
│       └── WaveformBar.tsx    # Visualisasi waveform
│
├── lib/
│   ├── api/
│   │   ├── client.ts          # Axios + interceptor auto-refresh token
│   │   ├── sounds.ts          # API calls untuk sound effects
│   │   ├── auth.ts            # API calls untuk autentikasi
│   │   ├── orders.ts          # API calls untuk order
│   │   └── subscriptions.ts   # API calls untuk subscription
│   ├── hooks/
│   │   ├── useAuth.ts         # Hook login/register/logout + useRequireAuth
│   │   ├── useSounds.ts       # React Query untuk fetch sounds
│   │   ├── useDownload.ts     # Hook trigger download + error handling
│   │   └── useDebounce.ts     # Debounce input pencarian
│   ├── store/
│   │   ├── auth.store.ts      # Zustand: user, tokens, isAuthenticated
│   │   ├── player.store.ts    # Zustand: track aktif, progress, volume
│   │   └── cart.store.ts      # Zustand: keranjang belanja (persist)
│   └── utils.ts               # formatDuration, formatPrice, formatDate
│
└── types/
    └── index.ts               # TypeScript interfaces semua entitas
```

---

## Flow Utama

### Autentikasi
1. User login via form atau Google OAuth
2. Token disimpan ke `localStorage` + Zustand store
3. Axios interceptor inject `Bearer token` ke setiap request
4. Kalau token expired, interceptor otomatis refresh via `/auth/refresh`

### Browse & Play
1. `BrowsePage` fetch sounds via React Query dengan filter/search
2. Klik row → `usePlayerStore.play(track)` → `GlobalPlayer` load audio
3. Waveform di-render dari `sound.waveformData` (array number dari backend)
4. Preview 30 detik — tidak bisa download dari URL preview

### Checkout (Per Item)
1. Klik "Beli" → `useCartStore.addItem(sound, licenseType)`
2. Di `/checkout` → `ordersApi.create(items)` → dapat `snapToken`
3. `window.snap.pay(snapToken)` buka popup Midtrans
4. Setelah bayar → backend terima webhook → generate lisensi → redirect dashboard

### Subscription
1. Di `/pricing` → klik plan → `subscriptionsApi.upgrade(slug, cycle)`
2. Dapat `snapToken` → buka Midtrans popup
3. Setelah bayar → backend aktifkan plan → update di database

---

## State Management

| Store | Isi | Persist? |
|-------|-----|----------|
| `useAuthStore` | user, tokens, isAuthenticated | Ya (tokens saja) |
| `usePlayerStore` | currentTrack, isPlaying, progress, volume | Tidak |
| `useCartStore` | items, totalAmount | Ya (localStorage) |

---

## Catatan Penting

- `GlobalPlayer` hanya muncul kalau ada `currentTrack` — tidak render kalau player kosong
- `fileUrl` (file asli) tidak pernah ada di frontend — hanya `previewUrl` (CDN) dan signed URL sementara
- Signed URL untuk download expire 24 jam — tidak bisa dibagikan
- Cart di-persist ke localStorage — tidak hilang saat refresh
- React Query cache sounds selama 5 menit — tidak refetch terus saat navigasi
