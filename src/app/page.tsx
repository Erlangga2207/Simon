import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Briefcase, ChartPie, ShieldCheck, Wallet } from "lucide-react";
import { PriceTicker } from "@/components/ticker";
import { NewsCard } from "@/components/news-card";
import { ThemeToggle } from "@/components/shell";
import { JsonLd } from "@/components/json-ld";
import { getCurrentUser } from "@/lib/auth";
import { getNews } from "@/lib/news";
import { formatDateTime } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://simon.example.com";

export const metadata: Metadata = {
  title: "Simon — Aplikasi Pencatat Keuangan Gratis untuk Pribadi, UMKM & Investasi",
  description:
    "Catat pemasukan & pengeluaran harian, hitung laba bersih UMKM otomatis, dan pantau portofolio saham & kripto real-time. Gratis, tanpa langganan — lengkap dengan berita pasar terkini.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  const news = await getNews(undefined, 9).catch(() => []);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Simon",
      url: SITE_URL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description:
        "Aplikasi pengelola keuangan untuk mencatat keuangan pribadi, menghitung laba usaha UMKM, dan memantau portofolio investasi.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Simon",
      url: SITE_URL,
      publisher: {
        "@type": "Organization",
        name: "Simon",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icons/icon-512.png`,
        },
      },
    },
  ];

  return (
    <div className="min-h-dvh">
      <JsonLd data={jsonLd} />
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/simon-logo.jpg" alt="Logo Simon — aplikasi pengelola keuangan" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight">Simon</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link
                href="/app/dashboard"
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Buka Aplikasi <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted">
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Daftar Gratis
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <Suspense fallback={<div className="h-9 border-b border-border bg-card" />}>
        <PriceTicker />
      </Suspense>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Keuangan pribadi, laba usaha, dan portofolio investasi — <span className="text-primary">dalam satu aplikasi</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Simon membantu Anda mencatat pemasukan-pengeluaran harian, menghitung laba bersih UMKM secara
          otomatis, dan memantau untung-rugi saham & kripto. Gratis, tanpa langganan.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={user ? "/app/dashboard" : "/register"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Mulai Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#berita"
            className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium hover:bg-muted"
          >
            Lihat Berita Pasar
          </a>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Catatan Harian", desc: "Pemasukan & pengeluaran multi-dompet, kategori kustom, transaksi berulang." },
            { icon: Briefcase, title: "Laba UMKM", desc: "Omzet − HPP − biaya operasional. Laba bersih & margin terhitung otomatis." },
            { icon: ChartPie, title: "Portofolio Investasi", desc: "Harga pasar saham & kripto terkini, untung-rugi real-time." },
            { icon: ShieldCheck, title: "Tim & Akses", desc: "Workspace multi-pengguna dengan peran Owner, Admin, Member, Viewer." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Berita */}
      <section id="berita" className="border-t border-border bg-muted/40 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Berita Keuangan Terkini</h2>
              {news[0] && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Data per {formatDateTime(news[0].fetchedAt)}
                </p>
              )}
            </div>
          </div>
          {news.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Berita belum tersedia saat ini. Coba lagi nanti.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((n) => (
                <NewsCard key={n.id} news={n} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Simon — aplikasi pengelola keuangan. Gratis untuk semua pengguna.
      </footer>
    </div>
  );
}
