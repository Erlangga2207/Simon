"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker (public/sw.js).
 * Hanya berjalan di production dan jika browser mendukung service worker.
 */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("Pendaftaran service worker gagal:", err));
    };

    // Daftar setelah load agar tidak mengganggu first paint
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
