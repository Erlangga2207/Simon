# PWA & SEO — Catatan Operasional Simon

Dokumen ini menjelaskan cara merawat fitur PWA dan SEO yang sudah dipasang.

## 1. Environment variable (WAJIB diisi sebelum deploy)

Tambahkan ke `.env` (dan ke Environment Variables di panel Hostinger):

```env
NEXT_PUBLIC_SITE_URL=https://domain-anda.com
```

Dipakai oleh `metadataBase`, `robots.ts`, `sitemap.ts`, dan JSON-LD untuk membuat
URL absolut (Open Graph, canonical, sitemap). Jika tidak diisi, fallback ke
`https://simon.example.com` (placeholder — JANGAN dibiarkan saat produksi).

## 2. Menaikkan versi cache service worker

Saat rilis baru (perubahan aset/halaman), buka `public/sw.js` dan naikkan:

```js
const CACHE_VERSION = "v1"; // -> "v2", "v3", dst.
```

Saat `CACHE_VERSION` berubah, event `activate` otomatis menghapus cache versi lama
sehingga user mendapat aset terbaru. Header `Cache-Control: no-cache` pada `/sw.js`
(diatur di `next.config.ts`) memastikan browser selalu mengecek SW versi baru.

## 3. HTTPS wajib

Service worker & PWA **hanya jalan di HTTPS** (atau `localhost`). Pastikan **SSL
aktif di Hostinger** untuk domain produksi, jika tidak SW tidak akan terdaftar dan
fitur "install ke homescreen" tidak muncul.

## 4. Strategi cache (ringkas)

- `/api/auth/*` → **network-only** (auth tidak pernah di-cache — keamanan).
- `/app/*` & `/api/*` lain → **network-first** (data fresh, fallback cache saat offline).
- Aset statis (js/css/font/gambar/icon) → **cache-first**.
- Navigasi HTML gagal total → fallback ke `/offline.html`.
- Saat **logout**, aplikasi mengirim `postMessage({ type: "CLEAR_DYNAMIC_CACHE" })`
  ke SW untuk menghapus cache dinamis (lihat `src/components/shell.tsx`), supaya
  data user sebelumnya tidak terbaca user lain di perangkat yang sama.

## 5. Cara test PWA & SEO

**Chrome DevTools** (`F12`) → tab **Application**:
- **Manifest**: cek nama, icon, theme color, shortcuts terbaca.
- **Service Workers**: cek SW terdaftar & aktif. Centang "Offline" lalu reload untuk
  menguji halaman `/offline.html`.

**Lighthouse** (DevTools → tab Lighthouse): jalankan audit kategori **PWA** dan **SEO**.

Catatan: SW & registrasi **hanya aktif di production build**. Untuk menguji lokal:

```bash
npm run build && npm run start
```

## 6. Aset gambar

Semua icon di-generate dari `public/images/simon-logo.jpg` (512×512) via
`scripts/gen-pwa-assets.mjs`. Untuk regenerasi (mis. setelah ganti logo):

```bash
node scripts/gen-pwa-assets.mjs
```

File yang dihasilkan:
- `public/icons/icon-192.png`, `icon-512.png` (purpose: any)
- `public/icons/maskable-192.png`, `maskable-512.png` (purpose: maskable)
- `public/apple-touch-icon.png` (180×180, iOS)
- `src/app/icon.png` (favicon — konvensi App Router)
- `public/og-image.png` (1200×630, Open Graph / Twitter card)

> **Rekomendasi**: icon maskable & OG image saat ini di-generate otomatis dari logo.
> Untuk hasil terbaik, ganti dengan desain khusus — terutama maskable (perhatikan
> *safe zone* 80%) dan OG image yang lebih menjual.

## 7. Privasi & indexing

`robots.ts` mem-blokir `/app/` dan `/api/` dari indeks Google. `sitemap.ts` hanya
memuat halaman publik (`/`, `/register`). Halaman `/login` di-set `index: false`.
Jangan menambahkan rute `/app/*` ke sitemap.
