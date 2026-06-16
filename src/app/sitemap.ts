import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://simon.example.com";

// Hanya halaman PUBLIK. JANGAN masukkan /app/* (privat).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily", // landing menampilkan berita yang sering berubah
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
