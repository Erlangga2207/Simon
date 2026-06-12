# PRD — Aplikasi Pengelola Keuangan "Simon"

| | |
|---|---|
| **Versi** | 1.1 (final) |
| **Status** | Siap dieksekusi Claude Code |
| **Tipe Produk** | Web app (responsive), multi-user dengan workspace tim |
| **Lingkup** | Keuangan pribadi + bisnis/UMKM + investasi, dengan feed berita keuangan |
| **Audiens dokumen** | Engineer / Claude Code yang membangun aplikasi |

---

## 1. Ringkasan Eksekutif

Simon adalah aplikasi web pengelola keuangan yang menggabungkan tiga kebutuhan dalam satu produk:

1. **Pencatatan harian** pemasukan & pengeluaran (personal finance).
2. **Perhitungan laba usaha** untuk bisnis/UMKM (omzet − HPP − biaya operasional).
3. **Pelacakan untung-rugi investasi** (saham/kripto: modal vs nilai sekarang).

Aplikasi mendukung **banyak pengguna** yang tergabung dalam **workspace/tim**, dengan kontrol akses berbasis peran. Dilengkapi **dashboard ringkas**, **laporan visual**, dan **feed berita keuangan** bergaya Bloomberg di halaman utama. Tampilan wajib **responsif** (mobile-first) dan terlihat **profesional**.

---

## 2. Tujuan & Sasaran

**Tujuan produk**
- Memberi pengguna satu tempat untuk melihat kondisi keuangan pribadi, usaha, dan investasi secara real-time.
- Membuat pencatatan keuangan cepat (≤ 10 detik per transaksi).
- Menyajikan insight (profit, margin, arus kas, return) secara otomatis tanpa hitung manual.

**Sasaran terukur (success metrics)**
- Pengguna bisa mencatat transaksi dalam ≤ 3 langkah.
- Dashboard memuat data utama dalam < 2 detik.
- Skor Lighthouse: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90.
- Tampil rapi di layar 360px (HP) hingga 1440px+ (desktop).

**Di luar lingkup (Non-goals) untuk v1**
- Aplikasi mobile native (cukup web responsif).
- Integrasi langsung ke rekening bank / open banking.
- Eksekusi transaksi trading riil (hanya pencatatan & monitoring).
- Pembukuan akuntansi penuh / pelaporan pajak resmi.

---

## 3. Persona Pengguna

1. **Andi — Karyawan (pribadi):** ingin tahu ke mana uang harian habis, sisa tabungan bulanan.
2. **Sari — Pemilik UMKM:** ingin tahu laba bersih toko, produk paling untung, biaya terbesar.
3. **Budi — Investor ritel:** ingin memantau portofolio saham/kripto, untung-rugi belum/realisasi.
4. **Tim Keuangan (multi-user):** beberapa orang mengelola keuangan usaha bersama dengan hak akses berbeda.

---

## 4. Konsep Inti: Workspace

Untuk menyatukan "pribadi + bisnis + investasi" tanpa membingungkan, gunakan konsep **Workspace**.

- Satu akun pengguna bisa punya/ikut beberapa workspace.
- Tiap workspace bertipe: **Personal**, **Business**, atau **Investment** (memengaruhi modul & istilah yang ditampilkan).
- Pengguna berpindah workspace lewat switcher di header.
- Data tidak bercampur antar-workspace; laporan dihitung per workspace.

---

## 5. Peran & Hak Akses (Multi-user)

| Peran | Hak akses |
|---|---|
| **Owner** | Semua akses + hapus workspace + atur billing + undang/keluarkan anggota |
| **Admin** | Kelola data + undang anggota + atur kategori, tidak bisa hapus workspace |
| **Member** | Tambah/edit/hapus transaksi miliknya, lihat laporan |
| **Viewer** | Hanya melihat dashboard & laporan (read-only) |

- Undangan anggota via email + link.
- Setiap perubahan data dicatat (audit log sederhana: siapa, apa, kapan).

---

## 6. Kebutuhan Fungsional (Fitur)

### 6.1 Autentikasi & Akun
- Registrasi & login (email + password). Opsional: login Google.
- Reset password via email.
- Verifikasi email.
- Manajemen profil (nama, foto, mata uang default, zona waktu).

**Acceptance criteria:** pengguna baru bisa daftar, verifikasi, login, dan langsung punya 1 workspace default.

### 6.2 Modul Transaksi Harian (semua workspace)
- Tambah transaksi: tipe (Pemasukan/Pengeluaran), jumlah, kategori, tanggal, catatan, metode (cash/transfer/e-wallet), lampiran struk (opsional).
- Kategori dapat dikustomisasi (mis. Makan, Transport, Gaji, Penjualan).
- Dukungan transaksi berulang (recurring) — mingguan/bulanan.
- Multi-akun/dompet (Cash, Bank, E-wallet) dengan saldo otomatis terhitung.
- Filter & pencarian (tanggal, kategori, akun, nominal).
- Impor CSV & ekspor CSV/Excel.

**Acceptance criteria:** menambah transaksi memperbarui saldo dompet & dashboard secara real-time.

### 6.3 Modul Bisnis / UMKM (workspace tipe Business)
- **Produk/Jasa:** nama, harga jual, HPP (modal per unit), stok (opsional).
- **Penjualan:** catat penjualan → otomatis hitung omzet, HPP, laba kotor.
- **Biaya operasional:** sewa, gaji, listrik, marketing, dll.
- **Perhitungan profit:**
  - Laba Kotor = Omzet − HPP
  - Laba Bersih = Laba Kotor − Biaya Operasional
  - Margin (%) = Laba Bersih / Omzet × 100
- Laporan: produk terlaris, produk paling menguntungkan, tren omzet vs biaya.

**Acceptance criteria:** mencatat 1 penjualan langsung mengubah laba kotor & bersih di dashboard bisnis.

### 6.4 Modul Investasi (workspace tipe Investment)
- **Portofolio & holding:** aset (saham/kripto), jumlah unit/lot, harga beli (cost basis), tanggal.
- **Harga pasar terkini** via API (lihat §10) untuk hitung nilai sekarang.
- **Perhitungan untung-rugi:**
  - Unrealized P/L = (Harga sekarang − Harga beli) × jumlah
  - Realized P/L = dihitung saat aset dijual
  - Return (%) per aset & per portofolio
- Grafik alokasi aset (pie) & pergerakan nilai portofolio (line).
- Catatan: hanya monitoring & pencatatan, bukan eksekusi order.

**Acceptance criteria:** nilai portofolio ter-update saat harga pasar di-refresh; P/L terhitung benar.

### 6.5 Dashboard (per workspace)
- Kartu ringkasan: Total Saldo, Pemasukan bulan ini, Pengeluaran bulan ini, Laba/Net (sesuai tipe workspace).
- Grafik arus kas (cash flow) bulanan.
- Grafik pengeluaran per kategori (donut/bar).
- Transaksi terbaru.
- Untuk Business: kartu Laba Bersih & Margin. Untuk Investment: kartu Nilai Portofolio & Total Return.

### 6.6 Laporan
- Rentang waktu fleksibel (harian/mingguan/bulanan/kustom).
- Laporan laba-rugi (untuk bisnis), arus kas, ringkasan kategori.
- Unduh laporan PDF & ekspor data CSV/Excel.

### 6.7 Halaman Berita Keuangan (gaya Bloomberg)
- Feed berita keuangan terbaru (pasar saham, kripto, ekonomi, bisnis).
- Tiap kartu berita: judul, sumber, waktu, ringkasan, thumbnail, link ke sumber asli.
- Filter kategori berita (Pasar, Kripto, Ekonomi, Teknologi, Bisnis).
- **Ticker harga berjalan** di atas halaman (indeks/saham/kripto pilihan).
- Cache berita di server (refresh tiap 15–30 menit) untuk hemat kuota API & cepat.
- **Penting:** tampilkan hanya judul + ringkasan singkat + link sumber (jangan salin penuh artikel — hormati hak cipta).

### 6.8 Notifikasi (opsional v1.1)
- Pengingat pencatatan harian.
- Peringatan saat pengeluaran melampaui budget.

### 6.9 Pengaturan
- Mata uang: **multi-currency penuh** (base currency per workspace + konversi tampilan via API kurs).
- Tema terang/gelap.
- Kelola kategori, dompet, anggota tim.

---

## 7. Kebutuhan Non-Fungsional

- **Responsif:** mobile-first, breakpoint 360 / 768 / 1024 / 1440 px.
- **Performa:** dashboard < 2 dtk; lazy-load data berat & berita.
- **Keamanan:** password di-hash (bcrypt/argon2), proteksi otorisasi per workspace, validasi input, rate limiting di endpoint auth, HTTPS.
- **Privasi:** data antar-workspace & antar-pengguna terisolasi ketat.
- **Reliability:** validasi & error handling jelas; tidak crash saat API berita/harga gagal (tampilkan fallback).
- **Aksesibilitas:** kontras cukup, label form, navigasi keyboard.
- **i18n:** siapkan struktur teks agar mudah diterjemahkan (default Bahasa Indonesia).

---

## 8. Rekomendasi Tech Stack

| Lapisan | Rekomendasi |
|---|---|
| Framework | **Next.js (App Router) + TypeScript** |
| Styling/UI | **Tailwind CSS + shadcn/ui** (komponen profesional, konsisten) |
| Grafik | **Recharts** (atau Chart.js) |
| State/Data | React Query / Server Components |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Auth | **Auth.js (NextAuth)** atau Clerk/Supabase Auth |
| Backend | Next.js API Routes / Route Handlers |
| Deploy | Vercel (frontend) + Neon/Supabase (Postgres) |
| Validasi | Zod |

> Boleh diganti, tapi stack ini cepat dibangun, modern, dan rapi untuk tampilan profesional.

---

## 9. Model Data (ringkas)

```
User           (id, name, email, passwordHash, avatar, defaultCurrency, timezone)
Workspace      (id, name, type[personal|business|investment], baseCurrency, ownerId)
Membership     (id, userId, workspaceId, role[owner|admin|member|viewer])
Account/Wallet (id, workspaceId, name, type[cash|bank|ewallet], balance)
Category       (id, workspaceId, name, kind[income|expense], color, icon)
Transaction    (id, workspaceId, accountId, categoryId, type, amount, date,
                note, method, attachmentUrl, recurringRule, createdBy)

-- Business
Product        (id, workspaceId, name, sellPrice, cogs, stock)
Sale           (id, workspaceId, productId, qty, unitPrice, date)  // hitung omzet & HPP
OperatingCost  (id, workspaceId, name, amount, date)

-- Investment
Portfolio      (id, workspaceId, name)
Holding        (id, portfolioId, symbol, assetType[stock|crypto],
                quantity, costBasis, buyDate)
PriceCache     (symbol, price, currency, updatedAt)

-- News
NewsCache      (id, title, source, url, summary, imageUrl, category, publishedAt)
AuditLog       (id, workspaceId, userId, action, entity, timestamp)
```

**Aturan kalkulasi**
- Saldo dompet = Σ pemasukan − Σ pengeluaran untuk akun tsb.
- Laba kotor = Σ(Sale.unitPrice − Product.cogs) × qty.
- Laba bersih = Laba kotor − Σ OperatingCost.
- Unrealized P/L holding = (PriceCache.price − costBasis) × quantity.

---

## 10. Integrasi API Eksternal — SEMUA GRATIS ($0)

> Prinsip: aplikasi harus jalan tanpa biaya & tanpa langganan. Semua provider di bawah punya paket gratis (umumnya tanpa kartu kredit). Verifikasi limit terbaru saat implementasi.

| Kebutuhan | Provider (gratis) | Catatan |
|---|---|---|
| **Berita keuangan** | **Marketaux** (utama) | Paket free 100%, tanpa data pembayaran, fokus finansial |
| | APITube (alternatif) | ±200 request/hari tanpa kartu kredit |
| **Harga saham** | **Finnhub** | Daftar cukup email, ada real-time |
| | Alpha Vantage / Twelve Data (alternatif) | Cepat mulai, limit kecil |
| **Harga kripto** | **CoinGecko** | Tier gratis, mudah |
| **Kurs multi-currency** | **Frankfurter.app** | Gratis, tanpa API key, data ECB |

**Prinsip integrasi (wajib agar tetap $0 & cepat):**
- Simpan API key di environment variable (server-side), jangan di klien.
- **Cache agresif di server** (NewsCache, PriceCache, kurs) dengan TTL:
  - Berita: refresh tiap 15–30 menit.
  - Harga pasar: refresh tiap 5–15 menit (atau on-demand saat buka portofolio).
  - Kurs: refresh 1× per hari.
- Selalu sediakan fallback UI bila API gagal/limit (tampilkan data cache terakhir + label "data per [waktu]").
- Untuk berita: tampilkan judul + ringkasan singkat + link sumber, **jangan reproduksi artikel penuh** (hak cipta).

---

## 11. Panduan UI/UX

- **Gaya:** bersih, profesional, "fintech modern" — banyak ruang putih, tipografi tegas, aksen warna untuk angka positif (hijau) & negatif (merah).
- **Layout:** sidebar navigasi (desktop) → bottom nav (mobile). Header dengan workspace switcher + profil.
- **Komponen kunci:** kartu metrik, tabel transaksi yang bisa difilter, grafik interaktif, ticker harga, kartu berita.
- **Mode gelap & terang.**
- **Mobile-first**, semua tabel bisa di-scroll/responsif jadi kartu di layar kecil.
- Konsistensi: gunakan design token (warna, spacing, radius) lewat Tailwind config.

---

## 12. Struktur Halaman

```
/ (landing + berita keuangan + ticker)   ← publik
/login, /register
/app/dashboard
/app/transactions
/app/wallets
/app/business   (produk, penjualan, biaya, laba)   ← workspace business
/app/investment (portofolio, holding, P/L)          ← workspace investment
/app/reports
/app/news
/app/team       (anggota & peran)
/app/settings
```

---

## 13. Rencana Bertahap (Milestones)

**Fase 1 — Fondasi (MVP)**
- Auth + workspace + membership + peran.
- Transaksi harian + dompet + kategori + dashboard dasar.
- Responsif + tema terang/gelap.

**Fase 2 — Modul Bisnis & Investasi**
- Produk, penjualan, biaya, laba/margin.
- Portofolio, holding, harga pasar, P/L.

**Fase 3 — Berita & Laporan**
- Feed berita + ticker.
- Laporan PDF/CSV, grafik lanjutan.

**Fase 4 — Penyempurnaan**
- Notifikasi/budget, audit log, recurring, impor CSV, optimasi performa.

---

## 14. Acceptance Criteria Global (Definition of Done)

- Semua fitur inti tiap fase berfungsi & teruji di mobile + desktop.
- Otorisasi: pengguna hanya bisa akses data workspace yang diizinkan sesuai peran.
- Tidak ada error fatal saat API eksternal gagal.
- Lighthouse memenuhi target di §2.
- Data kalkulasi (saldo, laba, P/L) akurat & konsisten.

---

## 15. Keputusan Final

1. **Mata uang:** **Multi-currency penuh.** Setiap workspace punya base currency; nilai bisa ditampilkan/dikonversi ke mata uang lain via API kurs gratis (Frankfurter). Default tampilan mengikuti preferensi pengguna.
2. **Monetisasi:** **Tidak ada langganan / tidak ada paket berbayar.** Semua fitur gratis untuk semua pengguna.
3. **Biaya API:** **$0** — gunakan provider gratis di §10 dengan caching server agresif agar tidak melewati limit.
4. **Provider final:** Berita = Marketaux, Saham = Finnhub, Kripto = CoinGecko, Kurs = Frankfurter.

### Keputusan yang masih bisa ditentukan saat build
- Apakah lampiran struk (upload gambar) masuk MVP atau ditunda ke Fase 4 — *rekomendasi: tunda* agar MVP cepat & tetap $0 (hindari biaya storage; jika perlu, pakai storage gratis seperti Supabase Storage tier free).

---

*Catatan: PRD ini sudah siap dipakai Claude Code sebagai acuan. Mulai dari Fase 1 untuk MVP, lalu lanjut bertahap.*
