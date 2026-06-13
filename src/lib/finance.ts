import "server-only";
import { db } from "./db";
import { getPrices, convert } from "./market";
import { endOfMonth, monthLabel, startOfMonth } from "./utils";

/** Saldo per dompet = Σ pemasukan − Σ pengeluaran. */
export async function getWalletBalances(workspaceId: string) {
  const wallets = await db.wallet.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  const sums = await db.transaction.groupBy({
    by: ["walletId", "type"],
    where: { workspaceId },
    _sum: { amount: true },
  });
  return wallets.map((w) => {
    const income = sums.find((s) => s.walletId === w.id && s.type === "INCOME")?._sum.amount ?? 0;
    const expense = sums.find((s) => s.walletId === w.id && s.type === "EXPENSE")?._sum.amount ?? 0;
    return { ...w, balance: income - expense };
  });
}

/** Pemasukan & pengeluaran dalam rentang tanggal. */
export async function getRangeSummary(workspaceId: string, from: Date, to: Date) {
  const sums = await db.transaction.groupBy({
    by: ["type"],
    where: { workspaceId, date: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const income = sums.find((s) => s.type === "INCOME")?._sum.amount ?? 0;
  const expense = sums.find((s) => s.type === "EXPENSE")?._sum.amount ?? 0;
  return { income, expense, net: income - expense };
}

/** Seri arus kas n bulan terakhir untuk grafik. */
export async function getCashflowSeries(workspaceId: string, months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const txs = await db.transaction.findMany({
    where: { workspaceId, date: { gte: start } },
    select: { type: true, amount: true, date: true },
  });
  const series: { label: string; pemasukan: number; pengeluaran: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    series.push({ label: monthLabel(d), pemasukan: 0, pengeluaran: 0 });
  }
  for (const tx of txs) {
    const idx =
      (tx.date.getFullYear() - start.getFullYear()) * 12 + (tx.date.getMonth() - start.getMonth());
    if (idx < 0 || idx >= months) continue;
    if (tx.type === "INCOME") series[idx].pemasukan += tx.amount;
    else series[idx].pengeluaran += tx.amount;
  }
  return series;
}

/** Pengeluaran per kategori dalam rentang tanggal (untuk donut). */
export async function getExpenseByCategory(workspaceId: string, from: Date, to: Date) {
  const sums = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { workspaceId, type: "EXPENSE", date: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const categories = await db.category.findMany({ where: { workspaceId } });
  return sums
    .map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId);
      return {
        categoryId: s.categoryId,
        name: cat?.name ?? "Tanpa kategori",
        color: cat?.color ?? "#94a3b8",
        value: s._sum.amount ?? 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Peringatan budget: kategori yang pengeluarannya melampaui budget bulan ini. */
export async function getBudgetAlerts(workspaceId: string) {
  const budgets = await db.budget.findMany({ where: { workspaceId }, include: { category: true } });
  if (budgets.length === 0) return [];
  const spent = await getExpenseByCategory(workspaceId, startOfMonth(), endOfMonth());
  return budgets
    .map((b) => {
      const used = spent.find((s) => s.categoryId === b.categoryId)?.value ?? 0;
      return { category: b.category.name, budget: b.amount, used, pct: b.amount > 0 ? (used / b.amount) * 100 : 0 };
    })
    .filter((b) => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct);
}

/** Statistik bisnis: omzet, HPP, laba kotor/bersih, margin. */
export async function getBusinessStats(workspaceId: string, from: Date, to: Date) {
  const sales = await db.sale.findMany({
    where: { workspaceId, date: { gte: from, lte: to } },
    include: { product: true },
  });
  const costs = await db.operatingCost.aggregate({
    where: { workspaceId, date: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const omzet = sales.reduce((s, x) => s + x.qty * x.unitPrice, 0);
  const hpp = sales.reduce((s, x) => s + x.qty * x.product.cogs, 0);
  const grossProfit = omzet - hpp;
  const opCost = costs._sum.amount ?? 0;
  const netProfit = grossProfit - opCost;
  const margin = omzet > 0 ? (netProfit / omzet) * 100 : 0;
  return { omzet, hpp, grossProfit, opCost, netProfit, margin, salesCount: sales.length };
}

/** Produk terlaris & paling menguntungkan. */
export async function getTopProducts(workspaceId: string, from: Date, to: Date) {
  const sales = await db.sale.findMany({
    where: { workspaceId, date: { gte: from, lte: to } },
    include: { product: true },
  });
  const byProduct = new Map<string, { name: string; qty: number; omzet: number; profit: number }>();
  for (const s of sales) {
    const cur = byProduct.get(s.productId) ?? { name: s.product.name, qty: 0, omzet: 0, profit: 0 };
    cur.qty += s.qty;
    cur.omzet += s.qty * s.unitPrice;
    cur.profit += s.qty * (s.unitPrice - s.product.cogs);
    byProduct.set(s.productId, cur);
  }
  const list = [...byProduct.values()];
  return {
    bestSelling: [...list].sort((a, b) => b.qty - a.qty).slice(0, 5),
    mostProfitable: [...list].sort((a, b) => b.profit - a.profit).slice(0, 5),
  };
}

/** Tren omzet vs biaya (HPP + operasional) per bulan. */
export async function getBusinessTrend(workspaceId: string, months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const [sales, costs] = await Promise.all([
    db.sale.findMany({ where: { workspaceId, date: { gte: start } }, include: { product: true } }),
    db.operatingCost.findMany({ where: { workspaceId, date: { gte: start } } }),
  ]);
  const series: { label: string; omzet: number; biaya: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    series.push({ label: monthLabel(d), omzet: 0, biaya: 0 });
  }
  const idxOf = (date: Date) =>
    (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  for (const s of sales) {
    const i = idxOf(s.date);
    if (i >= 0 && i < months) {
      series[i].omzet += s.qty * s.unitPrice;
      series[i].biaya += s.qty * s.product.cogs;
    }
  }
  for (const c of costs) {
    const i = idxOf(c.date);
    if (i >= 0 && i < months) series[i].biaya += c.amount;
  }
  return series;
}

export type HoldingWithPL = {
  id: string;
  portfolioId: string;
  portfolioName: string;
  symbol: string;
  name: string | null;
  assetType: "STOCK" | "CRYPTO";
  quantity: number;
  costBasis: number;
  buyDate: Date;
  currentPrice: number | null;
  value: number;
  pl: number;
  plPct: number;
  priceUpdatedAt: Date | null;
};

/** Statistik investasi: nilai portofolio, P/L belum & sudah direalisasi (USD). */
export async function getInvestmentStats(workspaceId: string) {
  const portfolios = await db.portfolio.findMany({
    where: { workspaceId },
    include: { holdings: true },
    orderBy: { createdAt: "asc" },
  });
  const active = portfolios.flatMap((p) =>
    p.holdings.filter((h) => !h.soldAt).map((h) => ({ ...h, portfolioName: p.name }))
  );
  const sold = portfolios.flatMap((p) => p.holdings.filter((h) => h.soldAt));

  const prices = await getPrices(
    active.map((h) => ({ symbol: h.symbol, assetType: h.assetType }))
  );

  const holdings: HoldingWithPL[] = active.map((h) => {
    const q = prices.get(h.symbol.toUpperCase());
    const price = q?.price ?? null;
    const value = (price ?? h.costBasis) * h.quantity;
    const cost = h.costBasis * h.quantity;
    const pl = value - cost;
    return {
      id: h.id,
      portfolioId: h.portfolioId,
      portfolioName: h.portfolioName,
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      quantity: h.quantity,
      costBasis: h.costBasis,
      buyDate: h.buyDate,
      currentPrice: price,
      value,
      pl,
      plPct: cost > 0 ? (pl / cost) * 100 : 0,
      priceUpdatedAt: q?.updatedAt ?? null,
    };
  });

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis * h.quantity, 0);
  const unrealizedPL = totalValue - totalCost;
  const realizedPL = sold.reduce((s, h) => s + ((h.sellPrice ?? 0) - h.costBasis) * h.quantity, 0);
  const returnPct = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;
  const lastUpdate = holdings.reduce<Date | null>(
    (acc, h) => (h.priceUpdatedAt && (!acc || h.priceUpdatedAt > acc) ? h.priceUpdatedAt : acc),
    null
  );

  // Tren nilai portofolio 6 bulan terakhir (USD). Tier gratis tidak menyediakan harga
  // historis, jadi tiap bulan dinilai dengan harga TERKINI untuk aset yang masih dipegang
  // pada akhir bulan itu (aset aktif → harga pasar kini; aset terjual → harga jualnya).
  // Tujuannya memperlihatkan pertumbuhan nilai saat aset ditambah/dijual, bukan valuasi
  // historis presisi. Titik bulan terakhir = nilai portofolio saat ini.
  const trendMonths = 6;
  const tNow = new Date();
  const valueTrend: { label: string; nilai: number }[] = [];
  for (let i = 0; i < trendMonths; i++) {
    const d = new Date(tNow.getFullYear(), tNow.getMonth() - (trendMonths - 1 - i), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    let nilai = 0;
    for (const h of active) {
      if (h.buyDate <= monthEnd) {
        const price = prices.get(h.symbol.toUpperCase())?.price ?? h.costBasis;
        nilai += price * h.quantity;
      }
    }
    for (const h of sold) {
      if (h.buyDate <= monthEnd && h.soldAt && h.soldAt > monthEnd) {
        nilai += (h.sellPrice ?? h.costBasis) * h.quantity;
      }
    }
    valueTrend.push({ label: monthLabel(d), nilai });
  }

  return { portfolios, holdings, sold, totalValue, totalCost, unrealizedPL, realizedPL, returnPct, lastUpdate, valueTrend };
}

/** Konversi nilai USD investasi ke mata uang dasar workspace (untuk kartu dashboard). */
export async function usdToBase(amountUsd: number, baseCurrency: string) {
  try {
    return await convert(amountUsd, "USD", baseCurrency);
  } catch {
    return amountUsd;
  }
}
