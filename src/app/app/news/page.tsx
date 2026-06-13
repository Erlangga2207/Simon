import Link from "next/link";
import { Suspense } from "react";
import { Newspaper } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { getNews, NEWS_CATEGORIES } from "@/lib/news";
import { cn, formatDateTime } from "@/lib/utils";
import { NewsCard } from "@/components/news-card";
import { PriceTicker } from "@/components/ticker";
import { Card, EmptyState } from "@/components/ui";

export const metadata = { title: "Berita" };

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  await requireWorkspace("VIEWER");
  const { cat } = await searchParams;
  const active = NEWS_CATEGORIES.includes(cat ?? "") ? cat! : "Semua";
  const news = await getNews(active, 24).catch(() => []);
  const lastFetched = news[0]?.fetchedAt;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Berita Keuangan</h1>
          {lastFetched && (
            <p className="text-xs text-muted-foreground">Data per {formatDateTime(lastFetched)}</p>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="h-9 rounded-lg border border-border bg-card" />}>
        <div className="overflow-hidden rounded-lg">
          <PriceTicker />
        </div>
      </Suspense>

      {/* Filter kategori */}
      <div className="flex flex-wrap gap-2">
        {NEWS_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={c === "Semua" ? "/app/news" : `/app/news?cat=${encodeURIComponent(c)}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {news.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Newspaper className="h-8 w-8" />}
            title="Belum ada berita"
            hint="Berita akan muncul setelah server berhasil mengambil data dari penyedia berita (perlu MARKETAUX_API_TOKEN), atau jalankan seed untuk contoh."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {news.map((n) => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Ringkasan berita disajikan dari sumber aslinya — buka tautan untuk membaca artikel penuh.
        Berita diperbarui otomatis tiap ±20 menit.
      </p>
    </div>
  );
}
