import "server-only";
import { db } from "./db";

const NEWS_TTL = 20 * 60 * 1000; // 20 menit

const CATEGORY_MAP: Record<string, string> = {
  finance: "Pasar",
  markets: "Pasar",
  crypto: "Kripto",
  economy: "Ekonomi",
  tech: "Teknologi",
  business: "Bisnis",
};

function mapCategory(industries: string[] | undefined, entities: { type?: string }[] | undefined) {
  if (entities?.some((e) => e.type === "cryptocurrency")) return "Kripto";
  const ind = industries?.[0]?.toLowerCase() ?? "";
  if (ind.includes("tech")) return "Teknologi";
  if (ind.includes("financial")) return "Pasar";
  if (ind.includes("energy") || ind.includes("industrials")) return "Ekonomi";
  return CATEGORY_MAP[ind] ?? "Bisnis";
}

/**
 * Feed berita keuangan. Sumber: Marketaux (gratis), cache server 20 menit di NewsCache.
 * Tanpa API token / saat API gagal → tampilkan cache terakhir (seed menyediakan contoh).
 */
export async function getNews(category?: string, limit = 24) {
  const newest = await db.newsCache.findFirst({ orderBy: { fetchedAt: "desc" } });
  const isFresh = newest && Date.now() - newest.fetchedAt.getTime() < NEWS_TTL;
  const token = process.env.MARKETAUX_API_TOKEN;

  if (!isFresh && token) {
    try {
      const url = `https://api.marketaux.com/v1/news/all?api_token=${token}&language=en&filter_entities=true&limit=12`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const json = (await res.json()) as {
          data: {
            title: string;
            url: string;
            source: string;
            description: string;
            image_url?: string;
            published_at: string;
            industries?: string[];
            entities?: { type?: string }[];
          }[];
        };
        for (const a of json.data ?? []) {
          if (!a.url || !a.title) continue;
          await db.newsCache.upsert({
            where: { url: a.url.slice(0, 500) },
            create: {
              title: a.title.slice(0, 500),
              url: a.url.slice(0, 500),
              source: a.source ?? "—",
              summary: (a.description ?? "").slice(0, 1000),
              imageUrl: a.image_url?.slice(0, 500) || null,
              category: mapCategory(a.industries, a.entities),
              publishedAt: new Date(a.published_at),
            },
            update: { fetchedAt: new Date() },
          });
        }
      }
    } catch {
      // gunakan cache terakhir
    }
  }

  return db.newsCache.findMany({
    where: category && category !== "Semua" ? { category } : undefined,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export const NEWS_CATEGORIES = ["Semua", "Pasar", "Kripto", "Ekonomi", "Teknologi", "Bisnis"];
