// Seed data contoh untuk Simon.
// Jalankan: npm run db:seed  (setelah npm run db:push)
// Idempoten: jika user demo sudah ada, seed dilewati.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@simon.id";
const DEMO_PASSWORD = "demo1234";

// Kategori default per tipe workspace — selaras dengan src/actions/workspace.ts
const DEFAULT_CATEGORIES = {
  PERSONAL: [
    { name: "Gaji", kind: "INCOME", color: "#059669" },
    { name: "Bonus", kind: "INCOME", color: "#0d9488" },
    { name: "Pendapatan Lain", kind: "INCOME", color: "#0891b2" },
    { name: "Makan & Minum", kind: "EXPENSE", color: "#ea580c" },
    { name: "Transport", kind: "EXPENSE", color: "#2563eb" },
    { name: "Belanja", kind: "EXPENSE", color: "#db2777" },
    { name: "Tagihan", kind: "EXPENSE", color: "#7c3aed" },
    { name: "Hiburan", kind: "EXPENSE", color: "#ca8a04" },
    { name: "Kesehatan", kind: "EXPENSE", color: "#dc2626" },
  ],
  BUSINESS: [
    { name: "Penjualan", kind: "INCOME", color: "#059669" },
    { name: "Pendapatan Lain", kind: "INCOME", color: "#0891b2" },
    { name: "Bahan Baku", kind: "EXPENSE", color: "#ea580c" },
    { name: "Sewa", kind: "EXPENSE", color: "#7c3aed" },
    { name: "Gaji Karyawan", kind: "EXPENSE", color: "#2563eb" },
    { name: "Listrik & Air", kind: "EXPENSE", color: "#ca8a04" },
    { name: "Marketing", kind: "EXPENSE", color: "#db2777" },
    { name: "Operasional Lain", kind: "EXPENSE", color: "#64748b" },
  ],
  INVESTMENT: [
    { name: "Dividen", kind: "INCOME", color: "#059669" },
    { name: "Penjualan Aset", kind: "INCOME", color: "#0891b2" },
    { name: "Setoran Modal", kind: "INCOME", color: "#0d9488" },
    { name: "Fee & Pajak", kind: "EXPENSE", color: "#dc2626" },
  ],
};

/** Tanggal `day` pada `monthsAgo` bulan lalu. */
function dateAt(monthsAgo, day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12, 0, 0);
}

async function createWorkspace(userId, name, type, baseCurrency) {
  const ws = await db.workspace.create({
    data: {
      name,
      type,
      baseCurrency,
      memberships: { create: { userId, role: "OWNER" } },
      wallets: {
        create: [
          { name: "Cash", type: "CASH" },
          { name: "Bank", type: "BANK" },
        ],
      },
      categories: { create: DEFAULT_CATEGORIES[type] },
    },
    include: { wallets: true, categories: true },
  });
  return ws;
}

async function main() {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Seed dilewati — user demo (${DEMO_EMAIL}) sudah ada.`);
    return;
  }

  console.log("Membuat user demo & workspace contoh…");
  const user = await db.user.create({
    data: {
      name: "Demo Simon",
      email: DEMO_EMAIL,
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      defaultCurrency: "IDR",
      timezone: "Asia/Jakarta",
    },
  });

  /* ---------- Workspace Personal ---------- */
  const personal = await createWorkspace(user.id, "Keuangan Pribadi", "PERSONAL", "IDR");
  const cat = (name) => personal.categories.find((c) => c.name === name);
  const cash = personal.wallets.find((w) => w.name === "Cash");
  const bank = personal.wallets.find((w) => w.name === "Bank");

  const personalTx = [];
  for (let m = 3; m >= 0; m--) {
    personalTx.push(
      { type: "INCOME", amount: 8_500_000, categoryId: cat("Gaji").id, walletId: bank.id, date: dateAt(m, 1), note: "Gaji bulanan", method: "TRANSFER" },
      { type: "EXPENSE", amount: 1_250_000, categoryId: cat("Tagihan").id, walletId: bank.id, date: dateAt(m, 5), note: "Listrik, air, internet", method: "TRANSFER" },
      { type: "EXPENSE", amount: 900_000 + m * 50_000, categoryId: cat("Makan & Minum").id, walletId: cash.id, date: dateAt(m, 10), note: "Belanja mingguan", method: "CASH" },
      { type: "EXPENSE", amount: 350_000, categoryId: cat("Transport").id, walletId: cash.id, date: dateAt(m, 14), note: "Bensin & parkir", method: "CASH" },
      { type: "EXPENSE", amount: 420_000, categoryId: cat("Hiburan").id, walletId: bank.id, date: dateAt(m, 20), note: "Nonton & langganan streaming", method: "EWALLET" }
    );
  }
  await db.transaction.createMany({
    data: personalTx.map((t) => ({ ...t, workspaceId: personal.id, createdById: user.id })),
  });
  await db.budget.create({
    data: { workspaceId: personal.id, categoryId: cat("Makan & Minum").id, amount: 1_000_000 },
  });

  /* ---------- Workspace Business ---------- */
  const business = await createWorkspace(user.id, "Toko Berkah", "BUSINESS", "IDR");
  const kopi = await db.product.create({
    data: { workspaceId: business.id, name: "Kopi Susu", sellPrice: 22_000, cogs: 9_000, stock: 120 },
  });
  const roti = await db.product.create({
    data: { workspaceId: business.id, name: "Roti Bakar", sellPrice: 18_000, cogs: 7_500, stock: 80 },
  });
  const jasa = await db.product.create({
    data: { workspaceId: business.id, name: "Jasa Desain Menu", sellPrice: 250_000, cogs: 50_000, stock: null },
  });

  const sales = [];
  for (let m = 3; m >= 0; m--) {
    sales.push(
      { productId: kopi.id, qty: 60 + m * 5, unitPrice: 22_000, date: dateAt(m, 8) },
      { productId: kopi.id, qty: 45, unitPrice: 22_000, date: dateAt(m, 18) },
      { productId: roti.id, qty: 35 + m * 3, unitPrice: 18_000, date: dateAt(m, 12) },
      { productId: jasa.id, qty: 1, unitPrice: 250_000, date: dateAt(m, 22) }
    );
  }
  await db.sale.createMany({ data: sales.map((s) => ({ ...s, workspaceId: business.id })) });
  const costs = [];
  for (let m = 3; m >= 0; m--) {
    costs.push(
      { name: "Sewa kios", amount: 1_500_000, date: dateAt(m, 2) },
      { name: "Gaji karyawan", amount: 1_800_000, date: dateAt(m, 28) },
      { name: "Listrik & air", amount: 350_000, date: dateAt(m, 15) }
    );
  }
  await db.operatingCost.createMany({ data: costs.map((c) => ({ ...c, workspaceId: business.id })) });

  /* ---------- Workspace Investment ---------- */
  const investment = await createWorkspace(user.id, "Portofolio Saya", "INVESTMENT", "IDR");
  const portfolio = await db.portfolio.create({
    data: { workspaceId: investment.id, name: "Portofolio Utama" },
  });
  await db.holding.createMany({
    data: [
      { portfolioId: portfolio.id, symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO", quantity: 0.05, costBasis: 62_000, buyDate: dateAt(5, 10) },
      { portfolioId: portfolio.id, symbol: "ETH", name: "Ethereum", assetType: "CRYPTO", quantity: 1.2, costBasis: 2_900, buyDate: dateAt(4, 3) },
      { portfolioId: portfolio.id, symbol: "SOL", name: "Solana", assetType: "CRYPTO", quantity: 10, costBasis: 145, buyDate: dateAt(2, 21) },
      { portfolioId: portfolio.id, symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", quantity: 5, costBasis: 215, buyDate: dateAt(3, 7) },
      // contoh aset yang sudah terjual (realized P/L)
      { portfolioId: portfolio.id, symbol: "DOGE", name: "Dogecoin", assetType: "CRYPTO", quantity: 1000, costBasis: 0.12, buyDate: dateAt(6, 1), soldAt: dateAt(1, 15), sellPrice: 0.19 },
    ],
  });

  /* ---------- Berita contoh (agar halaman berita tidak kosong tanpa API) ---------- */
  await db.newsCache.createMany({
    data: [
      {
        title: "Pasar saham Asia menguat di tengah ekspektasi pemangkasan suku bunga",
        source: "Contoh Finansial",
        url: "https://example.com/berita/pasar-asia-menguat",
        summary: "Indeks utama kawasan Asia ditutup menguat setelah pelaku pasar memperkirakan bank sentral akan melonggarkan kebijakan moneter pada kuartal mendatang.",
        category: "Pasar",
        publishedAt: dateAt(0, Math.max(1, new Date().getDate() - 1)),
      },
      {
        title: "Bitcoin bertahan di atas level psikologis, investor pantau arus dana ETF",
        source: "Contoh Kripto",
        url: "https://example.com/berita/bitcoin-bertahan",
        summary: "Harga Bitcoin relatif stabil dalam sepekan terakhir. Analis menyoroti arus masuk ETF spot sebagai penopang utama permintaan.",
        category: "Kripto",
        publishedAt: dateAt(0, Math.max(1, new Date().getDate() - 1)),
      },
      {
        title: "UMKM didorong digitalisasi pencatatan keuangan untuk akses pembiayaan",
        source: "Contoh Ekonomi",
        url: "https://example.com/berita/umkm-digitalisasi",
        summary: "Pencatatan keuangan yang rapi dinilai memperbesar peluang UMKM memperoleh pembiayaan formal dengan bunga lebih rendah.",
        category: "Ekonomi",
        publishedAt: dateAt(0, Math.max(1, new Date().getDate() - 2)),
      },
      {
        title: "Perusahaan teknologi besar umumkan rencana investasi pusat data baru",
        source: "Contoh Teknologi",
        url: "https://example.com/berita/investasi-pusat-data",
        summary: "Investasi pusat data baru diumumkan untuk mendukung permintaan layanan komputasi awan dan kecerdasan buatan yang terus tumbuh.",
        category: "Teknologi",
        publishedAt: dateAt(0, Math.max(1, new Date().getDate() - 2)),
      },
    ],
  });

  console.log("Seed selesai ✔");
  console.log(`  Login demo : ${DEMO_EMAIL}`);
  console.log(`  Password   : ${DEMO_PASSWORD}`);
  console.log("  Workspace  : Keuangan Pribadi (Personal), Toko Berkah (Business), Portofolio Saya (Investment)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
