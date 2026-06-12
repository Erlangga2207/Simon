import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  ChartPie,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import {
  getBudgetAlerts,
  getBusinessStats,
  getCashflowSeries,
  getExpenseByCategory,
  getInvestmentStats,
  getRangeSummary,
  getWalletBalances,
  usdToBase,
} from "@/lib/finance";
import { applyRecurringTransactions } from "@/actions/finance";
import { endOfMonth, formatCurrency, formatDate, startOfMonth } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Badge, Button, Card, CardHeader, EmptyState, Money } from "@/components/ui";
import { CashflowChart, DonutChart } from "@/components/charts";
import { TransactionModal } from "@/components/transaction-form";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { workspace, role } = await requireWorkspace("VIEWER");
  await applyRecurringTransactions(workspace.id);

  const cur = workspace.baseCurrency;
  const from = startOfMonth();
  const to = endOfMonth();

  const [wallets, summary, cashflow, byCategory, alerts, recent, categories] = await Promise.all([
    getWalletBalances(workspace.id),
    getRangeSummary(workspace.id, from, to),
    getCashflowSeries(workspace.id, 6),
    getExpenseByCategory(workspace.id, from, to),
    getBudgetAlerts(workspace.id),
    db.transaction.findMany({
      where: { workspaceId: workspace.id },
      include: { category: true, wallet: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
    db.category.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
  ]);

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const canWrite = role !== "VIEWER";

  // Kartu khusus sesuai tipe workspace
  let bizStats: Awaited<ReturnType<typeof getBusinessStats>> | null = null;
  let invStats: { value: number; returnPct: number } | null = null;
  if (workspace.type === "BUSINESS") {
    bizStats = await getBusinessStats(workspace.id, from, to);
  } else if (workspace.type === "INVESTMENT") {
    const s = await getInvestmentStats(workspace.id);
    invStats = { value: await usdToBase(s.totalValue, cur), returnPct: s.returnPct };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {workspace.name} · {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())}
          </p>
        </div>
        {canWrite && (
          <TransactionModal
            wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Transaksi
              </Button>
            }
          />
        )}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.category}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Pengeluaran <b>{a.category}</b> sudah {Math.round(a.pct)}% dari budget (
                {formatCurrency(a.used, cur)} / {formatCurrency(a.budget, cur)})
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Saldo"
          value={formatCurrency(totalBalance, cur)}
          sub={`${wallets.length} dompet`}
          icon={<WalletIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Pemasukan Bulan Ini"
          value={formatCurrency(summary.income, cur)}
          tone="positive"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <StatCard
          label="Pengeluaran Bulan Ini"
          value={formatCurrency(summary.expense, cur)}
          tone="negative"
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
        {workspace.type === "BUSINESS" && bizStats ? (
          <StatCard
            label="Laba Bersih Bulan Ini"
            value={formatCurrency(bizStats.netProfit, cur)}
            sub={`Margin ${bizStats.margin.toFixed(1)}%`}
            tone={bizStats.netProfit >= 0 ? "positive" : "negative"}
            icon={<Briefcase className="h-4 w-4" />}
          />
        ) : workspace.type === "INVESTMENT" && invStats ? (
          <StatCard
            label="Nilai Portofolio"
            value={formatCurrency(invStats.value, cur)}
            sub={`Return ${invStats.returnPct >= 0 ? "+" : ""}${invStats.returnPct.toFixed(2)}%`}
            tone={invStats.returnPct >= 0 ? "positive" : "negative"}
            icon={<ChartPie className="h-4 w-4" />}
          />
        ) : (
          <StatCard
            label="Selisih Bulan Ini"
            value={formatCurrency(summary.net, cur)}
            tone={summary.net >= 0 ? "positive" : "negative"}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Arus Kas 6 Bulan" />
          <div className="p-3">
            <CashflowChart data={cashflow} currency={cur} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Pengeluaran per Kategori (bulan ini)" />
          <div className="p-3">
            {byCategory.length === 0 ? (
              <EmptyState title="Belum ada pengeluaran bulan ini" hint="Catat transaksi pertama Anda." />
            ) : (
              <DonutChart data={byCategory.map((c) => ({ name: c.name, value: c.value, color: c.color }))} currency={cur} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Transaksi Terbaru"
          action={
            <Link href="/app/transactions" className="text-xs font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState title="Belum ada transaksi" hint="Klik tombol + Transaksi untuk mulai mencatat." />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tx.category?.color ?? "#94a3b8" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {tx.category?.name ?? "Tanpa kategori"}
                    {tx.note && <span className="font-normal text-muted-foreground"> · {tx.note}</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(tx.date)} · {tx.wallet.name}
                  </p>
                </div>
                {tx.recurring !== "NONE" && <Badge>berulang</Badge>}
                <Money
                  amount={tx.type === "INCOME" ? tx.amount : -tx.amount}
                  currency={cur}
                  signed
                  className="text-sm font-semibold"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
