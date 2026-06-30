# Laporan Pengujian Perangkat Lunak Project Based Learning

## Judul
Pengujian Perangkat Lunak pada Aplikasi Arsonus

## Identitas Proyek

Nama aplikasi: Arsonus  
Jenis aplikasi: Web app marketplace sound effect dan music asset  
Platform: Website  
Frontend: Next.js, React, Tailwind CSS  
Backend: NestJS, Prisma ORM  
Database: PostgreSQL  
Payment gateway: Midtrans  
Objek pengujian: Project Based Learning tim Arsonus

---

## 1. Pendahuluan / Tujuan Pengujian

Arsonus adalah aplikasi web yang digunakan untuk menjual, mengelola, dan mengunduh aset audio seperti sound effect dan music. Aplikasi ini memiliki beberapa fitur utama, yaitu autentikasi pengguna, browse katalog audio, wishlist, cart, order, pembayaran melalui Midtrans, subscription plan, creator studio untuk upload audio, admin panel, dan dashboard pengguna.

Pengujian perangkat lunak dilakukan untuk memastikan bahwa fitur utama aplikasi berjalan sesuai kebutuhan, antarmuka mudah digunakan, validasi data berjalan dengan baik, serta sistem dapat dibangun dan dijalankan tanpa error fatal. Pengujian juga bertujuan untuk menemukan bug, kelemahan UI/UX, dan risiko teknis yang perlu diperbaiki sebelum aplikasi digunakan secara lebih luas.

Tujuan pengujian ini adalah:

1. Memastikan fungsi utama Arsonus berjalan sesuai skenario pengguna.
2. Menguji proses autentikasi, upload, pembelian, pembayaran, dan admin management.
3. Memastikan frontend dan backend dapat di-build tanpa error.
4. Mengidentifikasi warning, bug, dan issue yang masih perlu diperbaiki.
5. Memberikan rekomendasi perbaikan untuk meningkatkan kualitas aplikasi.

---

## 2. Tools yang Digunakan

| No | Tools | Fungsi |
|---|---|---|
| 1 | Visual Studio Code | Membaca source code dan melakukan pemeriksaan struktur project |
| 2 | Terminal / PowerShell | Menjalankan command build, test, dan lint |
| 3 | npm | Menjalankan script project frontend dan backend |
| 4 | Jest | Unit testing backend |
| 5 | ESLint | Static code analysis frontend |
| 6 | TypeScript Compiler | Mengecek kesalahan tipe pada backend |
| 7 | Next.js Build | Memastikan frontend berhasil dikompilasi |
| 8 | Browser / DevTools | Pengujian manual UI, navigasi, dan respons tampilan |
| 9 | Midtrans Dashboard | Mengecek integrasi payment gateway dan status metode pembayaran |

---

## 3. Ruang Lingkup Pengujian

Pengujian difokuskan pada modul berikut:

1. Autentikasi pengguna: login, register, Google login, lupa password.
2. Browse sound: kategori, filter, search, preview audio.
3. Cart dan checkout: tambah/hapus item, pilih lisensi, pembayaran.
4. Subscription Pro: pilih durasi, payment page, Midtrans production/sandbox.
5. Creator Studio: upload sound/music, kategori, tag, status review.
6. Admin panel: dashboard, manage users, categories, sounds, orders.
7. Dashboard user: order history, download history, notification.
8. UI/UX: dark mode, light mode, sidebar, layout, keterbacaan teks.
9. Build dan static analysis: frontend/backend build, lint, unit test.

---

## 4. Skenario Pengujian

### 4.1 Pengujian Autentikasi

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| AUTH-01 | Register user baru | Buka halaman register, isi nama, email, password, submit | Akun berhasil dibuat dan user diarahkan ke aplikasi | Perlu diuji manual |
| AUTH-02 | Login dengan email dan password valid | Buka login, isi kredensial valid, klik login | User berhasil masuk | Perlu diuji manual |
| AUTH-03 | Login dengan password salah | Isi email valid dan password salah | Sistem menampilkan pesan error | Perlu diuji manual |
| AUTH-04 | Google login | Klik login Google | Redirect OAuth berjalan sesuai konfigurasi Google | Perlu diuji manual |
| AUTH-05 | Forgot password | Isi email di halaman lupa password | Sistem mengirim instruksi reset password | Perlu diuji manual |

### 4.2 Pengujian Browse dan Search Audio

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| BRW-01 | Membuka halaman browse | Buka `/browse` | Daftar sound dan kategori tampil | Perlu diuji manual |
| BRW-02 | Filter SFX/Music | Klik kategori Sound Effects atau Music | Data tampil sesuai kategori | Perlu diuji manual |
| BRW-03 | Search sound | Ketik keyword pada search bar | Sistem menampilkan sound yang relevan | Perlu diuji manual |
| BRW-04 | Preview audio | Klik tombol play pada sound | Audio preview berjalan | Perlu diuji manual |
| BRW-05 | Light/dark mode | Toggle mode tampilan | Tema berubah dengan kontras teks tetap terbaca | Perlu diuji manual |

### 4.3 Pengujian Cart dan Checkout

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| CRT-01 | Menambah sound ke cart | Klik tombol cart pada sound berbayar | Item masuk ke cart | Perlu diuji manual |
| CRT-02 | Menghapus item dari cart | Klik tombol cart/remove pada item yang sudah masuk cart | Item terhapus dari cart | Perlu diuji manual |
| CRT-03 | Pilih lisensi Personal | Pilih lisensi personal di checkout | Harga mengikuti lisensi personal | Perlu diuji manual |
| CRT-04 | Pilih lisensi Commercial | Pilih lisensi commercial di checkout | Harga berubah sesuai commercial | Perlu diuji manual |
| CRT-05 | Lanjut pembayaran | Klik lanjut pembayaran | User diarahkan ke halaman payment | Perlu diuji manual |

### 4.4 Pengujian Payment Midtrans

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| PAY-01 | Membuat order | Checkout item berbayar | Sistem membuat order dan snap token | Perlu diuji manual |
| PAY-02 | Membuka halaman pembayaran | Buka `/orders/{id}/pay` | Halaman pilih metode pembayaran tampil | Perlu diuji manual |
| PAY-03 | Redirect Midtrans | Klik bayar sekarang | User diarahkan ke halaman Midtrans | Perlu diuji manual |
| PAY-04 | Webhook Midtrans | Midtrans mengirim notifikasi POST ke webhook | Status order berubah sesuai pembayaran | Perlu diuji manual |
| PAY-05 | Payment channel production | Buka payment production | Channel tampil jika sudah approved oleh Midtrans | Teridentifikasi issue eksternal |

Catatan: Pada mode production, ditemukan pesan “No payment channels available”. Berdasarkan pengecekan, penyebabnya adalah status metode pembayaran Midtrans masih dalam proses verifikasi, bukan error utama pada kode aplikasi.

### 4.5 Pengujian Subscription Pro

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| SUB-01 | Pilih plan Pro | Buka `/pricing`, pilih durasi Pro | Modal konfirmasi tampil | Perlu diuji manual |
| SUB-02 | Konfirmasi pembayaran Pro | Klik bayar pada modal | User diarahkan ke `/subscriptions/{orderId}/pay` | Perlu diuji manual |
| SUB-03 | Pilih metode pembayaran Pro | Pilih QRIS/VA/Kartu/Minimarket | Pilihan metode aktif secara visual | Perlu diuji manual |
| SUB-04 | Redirect payment Pro | Klik bayar sekarang | User diarahkan ke Midtrans | Perlu diuji manual |
| SUB-05 | Aktivasi Pro | Pembayaran sukses | Subscription user aktif | Perlu diuji manual setelah channel Midtrans aktif |

### 4.6 Pengujian Creator Studio

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| STD-01 | Membuka Studio | Login sebagai creator/user, buka `/studio` | Form upload dan list sound tampil | Perlu diuji manual |
| STD-02 | Upload sound effect | Isi form upload kategori SFX dan file audio | Upload berhasil masuk review | Perlu diuji manual |
| STD-03 | Upload music | Pilih tipe music dan kategori music | Kategori music tersedia dan upload berhasil | Perlu diuji manual |
| STD-04 | Edit sound | Klik edit pada sound milik user | Data sound dapat diubah | Perlu diuji manual |
| STD-05 | Resubmit sound ditolak | Resubmit sound dengan data baru | Status kembali menunggu review | Perlu diuji manual |

### 4.7 Pengujian Admin Panel

| ID | Skenario | Langkah Pengujian | Expected Result | Status |
|---|---|---|---|---|
| ADM-01 | Membuka dashboard admin | Login admin, buka `/admin` | Statistik tampil | Perlu diuji manual |
| ADM-02 | Manage users | Buka `/admin/users` | Admin dapat create, edit, delete user | Perlu diuji manual |
| ADM-03 | Review sound | Buka sound review/admin sounds | Admin dapat approve/reject sound | Perlu diuji manual |
| ADM-04 | Manage categories | Buka `/admin/categories` | Admin dapat tambah/edit/hapus kategori | Perlu diuji manual |
| ADM-05 | Manage orders | Buka `/admin/orders` | Admin dapat melihat dan sinkron status order | Perlu diuji manual |

---

## 5. Langkah-Langkah Pengujian Teknis

### 5.1 Backend Build Test

Command yang dijalankan:

```bash
cd beathive-backend
npm run build
```

Hasil:

```text
> arsonus-backend@1.0.0 build
> tsc -p tsconfig.json
```

Status: Berhasil. Tidak ditemukan error TypeScript pada backend.

### 5.2 Backend Unit Test

Command yang dijalankan:

```bash
cd beathive-backend
npm test
```

Hasil:

```text
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        6.772 s
```

Status: Berhasil. Unit test backend yang tersedia lulus seluruhnya.

### 5.3 Frontend Build Test

Command yang dijalankan:

```bash
cd beathive-frontend
npm run build
```

Hasil:

```text
Compiled successfully
Running TypeScript
Generating static pages
Route /pricing
Route /studio
Route /subscriptions/[id]/pay
Route /orders/[id]/pay
```

Status: Berhasil. Frontend berhasil dikompilasi dan route penting berhasil ter-generate.

### 5.4 Frontend Lint Test

Command yang dijalankan:

```bash
cd beathive-frontend
npm run lint
```

Hasil ringkas:

```text
90 problems (0 errors, 90 warnings)
```

Status: Berhasil dengan warning. Tidak ada error lint yang menghentikan build, namun terdapat 90 warning yang perlu diperbaiki secara bertahap.

Jenis warning yang ditemukan:

1. Penggunaan `any` pada beberapa file frontend.
2. Dependency `useEffect` yang belum lengkap.
3. Variabel/import yang tidak digunakan.
4. Penggunaan `<img>` yang disarankan diganti ke `next/image`.
5. Karakter quote yang perlu di-escape pada JSX.

---

## 6. Hasil Pengujian

| No | Jenis Pengujian | Tools | Hasil | Status |
|---|---|---|---|---|
| 1 | Backend build | TypeScript Compiler | Build berhasil tanpa error | Passed |
| 2 | Backend unit test | Jest | 3 test passed | Passed |
| 3 | Frontend build | Next.js Build | Build berhasil | Passed |
| 4 | Frontend lint | ESLint | 0 error, 90 warning | Passed with Warning |
| 5 | Payment production | Midtrans | Channel belum tersedia karena verifikasi Midtrans | External Pending |
| 6 | Webhook URL | Browser/API check | GET menghasilkan 404 karena endpoint hanya menerima POST | Normal |

---

## 7. Temuan Bug / Issue

### ISSUE-01: Payment channel Midtrans production belum tersedia

Deskripsi:  
Saat membuka halaman pembayaran production, Midtrans menampilkan pesan “No payment channels available”.

Penyebab:  
Metode pembayaran pada akun Midtrans production masih dalam proses verifikasi, sehingga QRIS/VA/e-wallet/kartu belum tersedia.

Dampak:  
User belum dapat menyelesaikan pembayaran real production sampai channel disetujui Midtrans.

Rekomendasi:  
Menunggu approval dari Midtrans dan memastikan Payment Notification URL sudah diisi:

```text
https://arsonus.my.id/api/v1/orders/webhook/midtrans
```

### ISSUE-02: ESLint warning cukup banyak

Deskripsi:  
Frontend memiliki 90 warning ESLint.

Dampak:  
Tidak menghambat build, tetapi dapat menurunkan kualitas maintainability kode.

Rekomendasi:  
Perbaiki secara bertahap, mulai dari file yang paling sering digunakan seperti `pricing`, `studio`, `dashboard`, `SoundCard`, dan `Navbar`.

### ISSUE-03: Beberapa `useEffect` missing dependency

Deskripsi:  
Beberapa komponen React memiliki warning dependency pada `useEffect`.

Dampak:  
Berpotensi menyebabkan data tidak refresh dengan benar atau muncul bug state yang sulit dilacak.

Rekomendasi:  
Gunakan `useCallback` pada function fetch atau lengkapi dependency array sesuai rekomendasi ESLint.

### ISSUE-04: Masih terdapat penggunaan tipe `any`

Deskripsi:  
Beberapa API response dan error handling masih menggunakan `any`.

Dampak:  
Type safety berkurang, risiko error runtime meningkat.

Rekomendasi:  
Buat interface/type khusus untuk response API dan error object.

### ISSUE-05: Testing otomatis frontend belum tersedia

Deskripsi:  
Frontend belum memiliki unit test atau end-to-end test yang berjalan otomatis.

Dampak:  
Regresi UI dan flow user harus diuji manual.

Rekomendasi:  
Tambahkan Playwright untuk E2E test dan React Testing Library/Vitest untuk component test.

---

## 8. Analisis dan Rekomendasi Perbaikan

Berdasarkan hasil pengujian, aplikasi Arsonus sudah dapat dikompilasi dengan baik pada sisi frontend dan backend. Backend juga sudah memiliki unit test yang berhasil dijalankan. Hal ini menunjukkan bahwa struktur dasar aplikasi cukup stabil.

Namun, masih terdapat beberapa aspek yang perlu ditingkatkan. Pada sisi frontend, warning ESLint cukup banyak sehingga perlu dilakukan refactoring bertahap. Warning tersebut tidak menghentikan aplikasi, tetapi dapat menjadi indikasi potensi masalah maintainability dan bug di masa depan.

Pada sisi payment, integrasi Midtrans secara teknis sudah diarahkan ke mode production. Akan tetapi, metode pembayaran belum dapat digunakan karena channel production masih diverifikasi oleh Midtrans. Masalah ini bersifat eksternal dan tidak sepenuhnya berasal dari kode aplikasi.

Rekomendasi perbaikan:

1. Menunggu approval channel pembayaran Midtrans production.
2. Menambahkan test otomatis untuk flow kritis seperti login, checkout, upload, dan admin review.
3. Mengurangi penggunaan `any` pada frontend.
4. Memperbaiki warning `useEffect` dependency.
5. Menambahkan dokumentasi testing manual dan screenshot untuk setiap fitur utama.
6. Menambahkan negative test untuk input invalid seperti file upload bukan audio, harga kosong, password salah, dan token expired.
7. Menambahkan monitoring/logging untuk payment dan webhook.

---

## 9. Dokumentasi Screenshot yang Harus Dilampirkan

Berikut screenshot yang disarankan untuk ditempel ke laporan akhir:

| No | Screenshot | Halaman/Fitur | Keterangan |
|---|---|---|---|
| 1 | Screenshot 1 | Homepage Arsonus | Tampilan awal aplikasi |
| 2 | Screenshot 2 | Login/Register | Pengujian autentikasi |
| 3 | Screenshot 3 | Browse Sound | Katalog sound dan filter |
| 4 | Screenshot 4 | Sound Detail / Preview | Pengujian preview audio |
| 5 | Screenshot 5 | Cart / Checkout | Pengujian keranjang dan lisensi |
| 6 | Screenshot 6 | Payment Page | Pilihan metode pembayaran |
| 7 | Screenshot 7 | Pricing / Subscription | Pilihan plan Pro |
| 8 | Screenshot 8 | Subscription Payment | Pembayaran subscription Pro |
| 9 | Screenshot 9 | Studio Upload | Upload sound/music oleh creator |
| 10 | Screenshot 10 | Admin Dashboard | Statistik admin |
| 11 | Screenshot 11 | Admin Users | CRUD/manage users |
| 12 | Screenshot 12 | Admin Categories | CRUD kategori |
| 13 | Screenshot 13 | Terminal Build Backend | Bukti `npm run build` backend berhasil |
| 14 | Screenshot 14 | Terminal Unit Test Backend | Bukti Jest 3 test passed |
| 15 | Screenshot 15 | Terminal Build Frontend | Bukti Next.js build berhasil |
| 16 | Screenshot 16 | Terminal Lint Frontend | Bukti ESLint 0 error, 90 warning |
| 17 | Screenshot 17 | Midtrans Dashboard | Status channel pembayaran/verifikasi |

---

## 10. Kesimpulan

Berdasarkan hasil pengujian, aplikasi Arsonus sudah memiliki fondasi yang cukup baik sebagai project marketplace audio. Backend dan frontend berhasil dibangun tanpa error fatal. Unit test backend yang tersedia juga berhasil dijalankan dengan hasil 3 test passed. Frontend berhasil melewati proses build dan routing utama seperti pricing, studio, checkout, order payment, dan subscription payment berhasil ter-generate.

Beberapa issue masih perlu diperhatikan, terutama warning ESLint pada frontend, belum adanya automated test frontend, serta status payment channel Midtrans production yang masih menunggu verifikasi. Secara keseluruhan, aplikasi sudah layak untuk tahap pengujian lanjutan dan perbaikan kualitas, terutama pada aspek testing otomatis, type safety, dan stabilitas flow pembayaran.

Dengan perbaikan bertahap pada issue yang ditemukan, Arsonus dapat menjadi aplikasi PBL yang lebih stabil, mudah dipelihara, dan siap digunakan sebagai produk digital berbasis marketplace audio.
