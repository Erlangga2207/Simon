/* Simon — Service Worker
 * Naikkan CACHE_VERSION setiap rilis baru agar cache lama dibersihkan.
 * Lihat PWA-SEO-NOTES.md untuk panduan.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `simon-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `simon-dynamic-${CACHE_VERSION}`;

// Aset penting yang di-precache saat install
const PRECACHE_URLS = ["/", "/offline.html", "/manifest.webmanifest"];

// ---------------------------------------------------------------------------
// Install: precache + aktifkan SW baru langsung
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate: hapus cache versi lama + ambil alih semua tab
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(
    url.pathname
  );
}

// Network-first: coba jaringan, simpan ke dynamic cache, fallback ke cache saat offline
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback halaman offline untuk navigasi HTML
    if (request.mode === "navigate") {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    throw err;
  }
}

// Cache-first: untuk aset statis yang jarang berubah
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// ---------------------------------------------------------------------------
// Fetch strategy
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Abaikan non-GET dan cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Auth: NETWORK-ONLY — jangan pernah cache (keamanan)
  if (url.pathname.startsWith("/api/auth/")) {
    return; // biarkan browser menangani secara default (langsung ke jaringan)
  }

  // Area privat & API lain: NETWORK-FIRST (data harus fresh, fallback cache saat offline)
  if (url.pathname.startsWith("/app/") || url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Aset statis: CACHE-FIRST
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigasi HTML & sisanya: NETWORK-FIRST dengan fallback offline
  event.respondWith(networkFirst(request));
});

// ---------------------------------------------------------------------------
// Pesan dari aplikasi (mis. saat logout untuk membersihkan data privat)
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  // KEAMANAN: bersihkan cache dinamis saat user logout agar respons /app/*
  // milik user sebelumnya tidak terlihat oleh user lain di perangkat yang sama.
  if (data.type === "CLEAR_DYNAMIC_CACHE") {
    event.waitUntil(caches.delete(DYNAMIC_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Push notification (untuk fitur reminder anggaran di masa depan)
// Belum diaktifkan — handler siap pakai.
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let payload = { title: "Simon", body: "Anda punya pemberitahuan baru." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/app/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
