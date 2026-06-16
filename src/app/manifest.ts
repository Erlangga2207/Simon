import type { MetadataRoute } from "next";

// Web App Manifest via Metadata API — Next.js menyajikannya di /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simon — Pengelola Keuangan",
    short_name: "Simon",
    description:
      "Catat keuangan pribadi, hitung laba usaha, dan pantau portofolio investasi dalam satu aplikasi. Gratis.",
    start_url: "/app/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#059669",
    lang: "id",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tambah Transaksi",
        short_name: "Transaksi Baru",
        description: "Catat pemasukan atau pengeluaran baru",
        url: "/app/transactions?action=new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Lihat ringkasan keuangan Anda",
        url: "/app/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
