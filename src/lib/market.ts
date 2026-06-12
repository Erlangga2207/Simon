import "server-only";
import { db } from "./db";

const RATE_TTL = 24 * 60 * 60 * 1000; // 1 hari
const PRICE_TTL = 10 * 60 * 1000; // 10 menit

/** Kurs dari Frankfurter (ECB, gratis tanpa API key), cache 24 jam. */
export async function getRates(base: string): Promise<Record<string, number>> {
  const cached = await db.rateCache.findUnique({ where: { base } });
  if (cached && Date.now() - cached.updatedAt.getTime() < RATE_TTL) {
    return cached.rates as Record<string, number>;
  }
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = (await res.json()) as { rates: Record<string, number> };
    await db.rateCache.upsert({
      where: { base },
      create: { base, rates: data.rates },
      update: { rates: data.rates },
    });
    return data.rates;
  } catch {
    return (cached?.rates as Record<string, number>) ?? {};
  }
}

export async function convert(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const rates = await getRates(from);
  const rate = rates[to];
  return rate ? amount * rate : amount;
}

// Pemetaan simbol kripto populer -> id CoinGecko
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  LTC: "litecoin",
  USDT: "tether",
  USDC: "usd-coin",
  TON: "the-open-network",
};

type Quote = { symbol: string; price: number; change24h: number };

async function fetchCryptoPrices(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const ids = symbols.map((s) => COINGECKO_IDS[s.toUpperCase()] ?? s.toLowerCase());
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
  return symbols.flatMap((sym, i) => {
    const q = data[ids[i]];
    return q ? [{ symbol: sym.toUpperCase(), price: q.usd, change24h: q.usd_24h_change ?? 0 }] : [];
  });
}

async function fetchStockPrice(symbol: string): Promise<Quote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const d = (await res.json()) as { c: number; dp: number };
  if (!d.c) return null;
  return { symbol, price: d.c, change24h: d.dp ?? 0 };
}

/**
 * Ambil harga terkini (USD) untuk daftar simbol. Cache server 10 menit (PriceCache).
 * Selalu mengembalikan data cache terakhir bila API gagal.
 */
export async function getPrices(
  items: { symbol: string; assetType: "STOCK" | "CRYPTO" }[]
): Promise<Map<string, { price: number; change24h: number; updatedAt: Date }>> {
  const result = new Map<string, { price: number; change24h: number; updatedAt: Date }>();
  if (items.length === 0) return result;

  const symbols = [...new Map(items.map((i) => [i.symbol.toUpperCase(), i])).values()];
  const cached = await db.priceCache.findMany({
    where: { symbol: { in: symbols.map((s) => s.symbol.toUpperCase()) } },
  });
  const cacheMap = new Map(cached.map((c) => [c.symbol, c]));
  const stale = symbols.filter((s) => {
    const c = cacheMap.get(s.symbol.toUpperCase());
    return !c || Date.now() - c.updatedAt.getTime() > PRICE_TTL;
  });

  const fresh: Quote[] = [];
  try {
    const cryptos = stale.filter((s) => s.assetType === "CRYPTO").map((s) => s.symbol);
    fresh.push(...(await fetchCryptoPrices(cryptos)));
  } catch {
    // pakai cache lama
  }
  for (const s of stale.filter((x) => x.assetType === "STOCK")) {
    try {
      const q = await fetchStockPrice(s.symbol.toUpperCase());
      if (q) fresh.push(q);
    } catch {
      // pakai cache lama
    }
  }

  for (const q of fresh) {
    const item = symbols.find((s) => s.symbol.toUpperCase() === q.symbol);
    const row = await db.priceCache.upsert({
      where: { symbol: q.symbol },
      create: {
        symbol: q.symbol,
        assetType: item?.assetType ?? "CRYPTO",
        price: q.price,
        change24h: q.change24h,
      },
      update: { price: q.price, change24h: q.change24h },
    });
    cacheMap.set(q.symbol, row);
  }

  for (const s of symbols) {
    const c = cacheMap.get(s.symbol.toUpperCase());
    if (c) result.set(s.symbol.toUpperCase(), { price: c.price, change24h: c.change24h, updatedAt: c.updatedAt });
  }
  return result;
}

/** Data ticker untuk landing page: kripto utama + kurs USD/IDR. */
export async function getTickerData() {
  const prices = await getPrices([
    { symbol: "BTC", assetType: "CRYPTO" },
    { symbol: "ETH", assetType: "CRYPTO" },
    { symbol: "SOL", assetType: "CRYPTO" },
    { symbol: "BNB", assetType: "CRYPTO" },
    { symbol: "XRP", assetType: "CRYPTO" },
    { symbol: "DOGE", assetType: "CRYPTO" },
  ]);
  const items: { label: string; value: string; change: number }[] = [];
  for (const [sym, q] of prices) {
    items.push({
      label: sym,
      value: `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: q.price < 10 ? 4 : 0 }).format(q.price)}`,
      change: q.change24h,
    });
  }
  try {
    const usd = await getRates("USD");
    if (usd.IDR) {
      items.push({
        label: "USD/IDR",
        value: new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(usd.IDR),
        change: 0,
      });
    }
    if (usd.EUR) {
      items.push({ label: "EUR/USD", value: (1 / usd.EUR).toFixed(4), change: 0 });
    }
  } catch {
    // kurs opsional di ticker
  }
  return items;
}
