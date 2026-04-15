# BeatHive Backend API

Backend NestJS untuk platform BeatHive — stock sound effects. REST API dengan autentikasi JWT, sistem subscription, pembelian per item, dan integrasi Midtrans.

---

## Prasyarat

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- FFmpeg (untuk audio processing)
- AWS S3 bucket (private + public)
- Akun Midtrans (sandbox untuk development)

---

## Cara Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

```bash
cp .env.example .env
# Edit .env dengan kredensial kamu
```

### 3. Setup database

```bash
# Generate Prisma client
npm run prisma:generate

# Jalankan migrations
npm run prisma:migrate

# Seed data awal (plans, categories, tags)
npm run prisma:seed
```

### 4. Jalankan server

```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build && npm start
```

Server berjalan di `http://localhost:3000/api/v1`

---

## Struktur Project

```
src/
├── auth/                    # Autentikasi (JWT, Google OAuth)
│   ├── strategies/          # JWT & Google passport strategies
│   ├── dto/                 # Request validation
│   ├── auth.service.ts
│   └── auth.controller.ts
├── sounds/                  # Sound effects (browse, search, download)
│   ├── sounds.service.ts    # Logic termasuk gatekeeper download
│   └── sounds.controller.ts
├── orders/                  # Pembelian per item
│   ├── orders.service.ts    # Buat order + Midtrans Snap token
│   ├── orders.controller.ts # Termasuk webhook endpoint
│   └── webhook.service.ts   # Handler konfirmasi Midtrans
├── subscriptions/           # Manajemen subscription
│   ├── subscriptions.service.ts
│   └── subscriptions.controller.ts
├── common/
│   ├── guards/              # JwtAuthGuard, SubscriptionGuard
│   ├── decorators/          # @CurrentUser()
│   ├── storage/             # AWS S3 service + signed URL
│   ├── audio/               # FFmpeg: preview & waveform
│   └── license/             # Generate PDF lisensi
└── prisma/
    └── prisma.service.ts
prisma/
├── schema.prisma            # Semua tabel database
└── seed.ts                  # Data awal
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/auth/register` | — | Daftar akun baru |
| POST | `/auth/login` | — | Login email/password |
| POST | `/auth/refresh` | — | Refresh access token |
| GET | `/auth/me` | JWT | Data user + subscription |
| GET | `/auth/google` | — | Redirect ke Google OAuth |
| GET | `/auth/google/callback` | — | Callback Google OAuth |

### Sounds
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/sounds` | — | Browse & search (dengan filter) |
| GET | `/sounds/:slug` | — | Detail satu sound effect |
| POST | `/sounds/:id/download` | JWT | Request download (cek gatekeeper) |

**Query params untuk GET /sounds:**
- `search` — kata kunci pencarian
- `categorySlug` — filter kategori
- `isFree` — `true`/`false`
- `minDuration`, `maxDuration` — dalam detik
- `sortBy` — `newest`, `popular`, `price_asc`, `price_desc`
- `page`, `limit` — pagination

### Orders
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/orders` | JWT | Buat order + dapat Snap token |
| GET | `/orders/me` | JWT | Riwayat order user |
| POST | `/orders/webhook/midtrans` | — | Webhook dari Midtrans |

### Subscriptions
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/subscriptions/me` | JWT | Status & kuota subscription |
| POST | `/subscriptions/upgrade` | JWT | Upgrade plan + dapat Snap token |
| DELETE | `/subscriptions/me` | JWT | Cancel subscription |

---

## Alur Payment (Midtrans Snap)

1. Frontend panggil `POST /orders` atau `POST /subscriptions/upgrade`
2. Backend return `snapToken`
3. Frontend buka Midtrans popup: `window.snap.pay(snapToken)`
4. User bayar di popup Midtrans
5. Midtrans kirim webhook ke `POST /orders/webhook/midtrans`
6. Backend verifikasi signature → update status order → generate lisensi PDF
7. Frontend polling status order atau terima notif realtime

**Penting:** Jangan andalkan redirect dari Midtrans sebagai konfirmasi. Selalu gunakan webhook.

---

## Gatekeeper Download

Setiap request `POST /sounds/:id/download` melewati pengecekan ini secara berurutan:

1. User sudah login? (JWT valid)
2. Pernah beli satuan sound ini? → izinkan download
3. Punya subscription aktif?
4. Plan cukup untuk akses level sound ini? (free/pro/business)
5. Kuota download bulan ini masih ada?
6. Jika semua lolos → generate signed URL (expire 24 jam)

---

## Catatan Keamanan

- `fileUrl` di database TIDAK PERNAH dikirim ke frontend — hanya signed URL yang expire
- Webhook Midtrans diverifikasi via SHA-512 signature sebelum diproses
- Rate limiting aktif di endpoint auth (5 register/menit, 10 login/menit)
- Password di-hash dengan bcrypt cost factor 12
- File audio private di S3 — tidak bisa diakses tanpa signed URL
