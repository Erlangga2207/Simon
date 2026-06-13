import { ArrowDownRight, ArrowUpRight, Download, Scale, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import {
  getBusinessStats,
  getCashflowSeries,
  getExpenseByCategory,
  getRangeSummary,
} from "@/lib/finance";
import { endOfMonth, formatCurrency, formatDate, formatNumber, startOfMonth, toDateInput } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Button, Card, CardHeader, EmptyState, Input, Money } from "@/components/ui";
import { CashflowChart, DonutChart } from "@/components/charts";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Laporan" };

function parseRange(sp: { from?: string; to?: string }) {
  const from = sp.from ? new Date(sp.from) : startOfMonth();
  const to = sp.to ? new Date(`${sp.to}T23:59:59.999`) : endOfMonth();
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return { from: startOfMonth(), to: endOfMonth() };
  return { from, to };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { workspace } = await requireWorkspace("VIEWER");
  const sp = await searchParams;
  const { from, to } = parseRange(sp);
  const cur = workspace.baseCurrency;
  const isBusiness = workspace.type === "BUSINESS";

  const [summary, expenseByCat, incomeSums, cashflow, categories, bizStats] = await Promise.all([
    getRangeSummary(workspace.id, from, to),
    getExpenseByCategory(workspace.id, from, to),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { workspaceId: workspace.id, type: "INCOME", date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    getCashflowSeries(workspace.id, 6),
    db.category.findMany({ where: { workspaceId: workspace.id } }),
    isBusiness ? getBusinessStats(workspace.id, from, to) : Promise.resolve(null),
  ]);

  const incomeByCat = incomeSums
    .map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId);
      return {
        name: cat?.name ?? "Tanpa kategori",
        color: cat?.color ?? "#94a3b8",
        value: s._sum.amount ?? 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  const exportQs = new URLSearchParams({
    ...(sp.from ? { from: sp.from } : {}),
    ...(sp.to ? { to: sp.to } : {}),
  }).toString();

  const pct = (v: number, total: number) => (total > 0 ? `${formatNumber((v / total) * 100, 1)}%` : "—");

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Laporan</h1>
        <div className="flex flex-wrap gap-2">
          <a href={`/app/transactions/export?${exportQs}`}>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" /> Ekspor CSV
            </Button>
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Pilih rentang */}
      <Card className="no-print p-3">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Dari</label>
            <Input name="from" type="date" defaultValue={sp.from ?? toDateInput(from)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sampai</label>
            <Input name="to" type="date" defaultValue={sp.to ?? toDateInput(to)} />
          </div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" /> Terapkan
          </Button>
        </form>
      </Card>

      {/* Judul cetak */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Laporan Keuangan — {workspace.name}</h1>
        <p className="text-sm text-muted-foreground">
          Periode {formatDate(from)} s.d. {formatDate(to)} · mata uang {cur}
        </p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Pemasukan"
          value={formatCurrency(summary.income, cur)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="positive"
        />
        <StatCard
          label="Pengeluaran"
          value={formatCurrency(summary.expense, cur)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          tone="negative"
        />
        <StatCard
          label="Selisih (Net)"
          value={formatCurrency(summary.net, cur)}
          icon={<Scale className="h-4 w-4" />}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Laba-rugi (business) */}
      {bizStats && (
        <Card>
          <CardHeader title="Laporan Laba-Rugi" />
          <div className="px-4 py-2 sm:px-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2.5">Omzet (penjualan)</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{formatCurrency(bizStats.omzet, cur)}</td>
                </tr>
                <tr>
                  <td className="py-2.5">HPP (harga pokok)</td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-negative">
                    − {formatCurrency(bizStats.hpp, cur)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">Laba kotor</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {formatCurrency(bizStats.grossProfit, cur)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5">Biaya operasional</td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-negative">
                    − {formatCurrency(bizStats.opCost, cur)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold">Laba bersih</td>
                  <td className="py-2.5 text-right text-base font-bold tabular-nums">
                    <Money amount={bizStats.netProfit} currency={cur} signed />
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-muted-foreground">Margin laba bersih</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatNumber(bizStats.margin, 1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Arus kas */}
      <Card>
        <CardHeader title="Arus Kas — 6 Bulan Terakhir" />
        <div className="p-4 sm:p-5">
          <CashflowChart data={cashflow} currency={cur} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pengeluaran per kategori */}
        <Card>
          <CardHeader title="Pengeluaran per Kategori" />
          {expenseByCat.length === 0 ? (
            <EmptyState title="Tidak ada pengeluaran di periode ini" />
          ) : (
            <div className="p-4 sm:p-5">
              <DonutChart data={expenseByCat} currency={cur} />
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-border">
                  {expenseByCat.map((c, i) => (
                    <tr key={i}>
                      <td className="flex items-center gap-2 py-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {pct(c.value, summary.expense)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatCurrency(c.value, cur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pemasukan per kategori */}
        <Card>
          <CardHeader title="Pemasukan per Kategori" />
          {incomeByCat.length === 0 ? (
            <EmptyState title="Tidak ada pemasukan di periode ini" />
          ) : (
            <div className="p-4 sm:p-5">
              <DonutChart data={incomeByCat} currency={cur} />
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-border">
                  {incomeByCat.map((c, i) => (
                    <tr key={i}>
                      <td className="flex items-center gap-2 py-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {pct(c.value, summary.income)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatCurrency(c.value, cur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="no-print text-[11px] text-muted-foreground">
        Gunakan "Cetak / PDF" lalu pilih "Save as PDF" di dialog cetak browser untuk mengunduh laporan.
      </p>
    </div>
  );
}
