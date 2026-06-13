import { Briefcase, ChartPie, LineChart, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { getInvestmentStats, usdToBase } from "@/lib/finance";
import { formatCurrency, formatDate, formatDateTime, formatNumber, toDateInput } from "@/lib/utils";
import {
  addHolding,
  createPortfolio,
  deleteHolding,
  deletePortfolio,
  forceRefreshPrices,
  sellHolding,
} from "@/actions/investment";
import { StatCard } from "@/components/stat-card";
import {
  ActionForm,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmForm,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  SubmitButton,
} from "@/components/ui";
import { DonutChart, ValueAreaChart } from "@/components/charts";

export const metadata = { title: "Investasi" };

const ALLOC_COLORS = ["#059669", "#2563eb", "#7c3aed", "#ea580c", "#db2777", "#ca8a04", "#0891b2", "#64748b"];

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

export default async function InvestmentPage() {
  const { workspace, role } = await requireWorkspace("VIEWER");
  const canWrite = role !== "VIEWER";
  const isAdmin = role === "ADMIN" || role === "OWNER";

  if (workspace.type !== "INVESTMENT") {
    return (
      <Card>
        <EmptyState
          icon={<LineChart className="h-8 w-8" />}
          title="Modul investasi hanya untuk workspace tipe Investasi"
          hint="Buat workspace baru bertipe Investasi lewat menu workspace di pojok kiri atas."
        />
      </Card>
    );
  }

  const stats = await getInvestmentStats(workspace.id);
  const cur = workspace.baseCurrency;
  const totalValueBase =
    cur === "USD" ? stats.totalValue : await usdToBase(stats.totalValue, cur);

  // Alokasi nilai per simbol untuk pie chart
  const allocation = stats.holdings
    .map((h, i) => ({ name: h.symbol, value: h.value, color: ALLOC_COLORS[i % ALLOC_COLORS.length] }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Investasi</h1>
          <p className="text-xs text-muted-foreground">
            {stats.lastUpdate
              ? `Harga per ${formatDateTime(stats.lastUpdate)} (USD)`
              : "Harga pasar belum tersedia — coba refresh"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={forceRefreshPrices}>
            <Button type="submit" variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Harga
            </Button>
          </form>
          {canWrite && (
            <>
              <Modal
                title="Portofolio Baru"
                trigger={
                  <Button variant="outline" size="sm">
                    <Briefcase className="h-3.5 w-3.5" /> Portofolio
                  </Button>
                }
              >
                {
                  <ActionForm action={createPortfolio}>
                    <Field label="Nama portofolio">
                      <Input name="name" placeholder="cth. Saham US, Kripto Jangka Panjang" required />
                    </Field>
                    <SubmitButton className="w-full">Buat Portofolio</SubmitButton>
                  </ActionForm>
                }
              </Modal>
              <Modal
                title="Tambah Aset"
                trigger={
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" /> Aset
                  </Button>
                }
              >
                {
                  stats.portfolios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Buat portofolio terlebih dahulu.</p>
                  ) : (
                    <ActionForm action={addHolding}>
                      <Field label="Portofolio">
                        <Select name="portfolioId" required>
                          {stats.portfolios.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Jenis aset">
                          <Select name="assetType" defaultValue="CRYPTO">
                            <option value="CRYPTO">Kripto</option>
                            <option value="STOCK">Saham</option>
                          </Select>
                        </Field>
                        <Field label="Simbol (BTC, AAPL, …)">
                          <Input name="symbol" placeholder="BTC" required maxLength={15} className="uppercase" />
                        </Field>
                      </div>
                      <Field label="Nama aset (opsional)">
                        <Input name="name" placeholder="cth. Bitcoin" maxLength={60} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Jumlah unit/lot">
                          <Input name="quantity" type="number" min={0} step="any" required />
                        </Field>
                        <Field label="Harga beli / unit (USD)">
                          <Input name="costBasis" type="number" min={0} step="any" required />
                        </Field>
                      </div>
                      <Field label="Tanggal beli">
                        <Input name="buyDate" type="date" defaultValue={toDateInput(new Date())} required />
                      </Field>
                      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Harga pasar diambil otomatis: kripto dari CoinGecko, saham dari Finnhub (perlu
                        FINNHUB_API_KEY). Semua nilai dalam USD.
                      </p>
                      <SubmitButton className="w-full">Tambah Aset</SubmitButton>
                    </ActionForm>
                  )
                }
              </Modal>
            </>
          )}
        </div>
      </div>

      {/* Kartu metrik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Nilai Portofolio"
          value={usd(stats.totalValue)}
          sub={cur !== "USD" ? `≈ ${formatCurrency(totalValueBase, cur)}` : `modal ${usd(stats.totalCost)}`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Total Return"
          value={`${stats.returnPct >= 0 ? "+" : ""}${formatNumber(stats.returnPct, 2)}%`}
          tone={stats.returnPct >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="P/L Belum Direalisasi"
          value={usd(stats.unrealizedPL)}
          tone={stats.unrealizedPL >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="P/L Direalisasi"
          value={usd(stats.realizedPL)}
          sub={`${stats.sold.length} aset terjual`}
          tone={stats.realizedPL >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Tren nilai portofolio */}
      {(stats.holdings.length > 0 || stats.sold.length > 0) && (
        <Card>
          <CardHeader title="Pergerakan Nilai Portofolio — 6 Bulan Terakhir (USD)" />
          <div className="p-4 sm:p-5">
            <ValueAreaChart data={stats.valueTrend} currency="USD" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tier data gratis tidak menyediakan harga historis, jadi tiap bulan dinilai memakai
              harga terkini untuk aset yang dipegang saat itu — memperlihatkan pertumbuhan nilai
              seiring aset ditambah/dijual, bukan valuasi historis presisi.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Alokasi aset */}
        <Card className="lg:col-span-2">
          <CardHeader title="Alokasi Aset" />
          {allocation.length === 0 ? (
            <EmptyState icon={<ChartPie className="h-8 w-8" />} title="Belum ada aset aktif" />
          ) : (
            <div className="p-4 sm:p-5">
              <DonutChart data={allocation} currency="USD" />
            </div>
          )}
        </Card>

        {/* Holdings */}
        <Card className="lg:col-span-3">
          <CardHeader title={`Aset Aktif (${stats.holdings.length})`} />
          {stats.holdings.length === 0 ? (
            <EmptyState
              icon={<LineChart className="h-8 w-8" />}
              title="Belum ada aset"
              hint='Tambahkan aset pertama dengan tombol "Aset" di atas.'
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Aset</th>
                    <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                    <th className="px-4 py-3 text-right font-medium">Harga Beli</th>
                    <th className="px-4 py-3 text-right font-medium">Harga Kini</th>
                    <th className="px-4 py-3 text-right font-medium">Nilai</th>
                    <th className="px-4 py-3 text-right font-medium">P/L</th>
                    {canWrite && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{h.symbol}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.name ?? (h.assetType === "CRYPTO" ? "Kripto" : "Saham")} ·{" "}
                          {h.portfolioName} · beli {formatDate(h.buyDate)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatNumber(h.quantity, 8)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {usd(h.costBasis)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {h.currentPrice !== null ? usd(h.currentPrice) : <Badge>n/a</Badge>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                        {usd(h.value)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <p className={`font-semibold tabular-nums ${h.pl >= 0 ? "text-positive" : "text-negative"}`}>
                          {h.pl >= 0 ? "+" : ""}{usd(h.pl)}
                        </p>
                        <p className={`text-[11px] tabular-nums ${h.pl >= 0 ? "text-positive" : "text-negative"}`}>
                          {h.plPct >= 0 ? "+" : ""}{formatNumber(h.plPct, 2)}%
                        </p>
                      </td>
                      {canWrite && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Modal
                              title={`Jual ${h.symbol}`}
                              trigger={
                                <Button variant="outline" size="sm">Jual</Button>
                              }
                            >
                              {
                                <ActionForm action={sellHolding}>
                                  <input type="hidden" name="id" value={h.id} />
                                  <Field label="Harga jual / unit (USD)">
                                    <Input
                                      name="sellPrice"
                                      type="number"
                                      min={0}
                                      step="any"
                                      defaultValue={h.currentPrice ?? ""}
                                      required
                                    />
                                  </Field>
                                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                                    Seluruh {formatNumber(h.quantity, 8)} unit ditandai terjual dan P/L
                                    direalisasi dihitung dari harga ini.
                                  </p>
                                  <SubmitButton className="w-full">Konfirmasi Jual</SubmitButton>
                                </ActionForm>
                              }
                            </Modal>
                            {isAdmin && (
                              <ConfirmForm
                                action={deleteHolding}
                                message={`Hapus aset ${h.symbol} dari catatan? (bukan menjual)`}
                                className="inline"
                              >
                                <input type="hidden" name="id" value={h.id} />
                                <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </ConfirmForm>
                            )}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Riwayat penjualan aset */}
      {stats.sold.length > 0 && (
        <Card>
          <CardHeader title="Aset Terjual (P/L Direalisasi)" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Aset</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                  <th className="px-4 py-3 text-right font-medium">Beli</th>
                  <th className="px-4 py-3 text-right font-medium">Jual</th>
                  <th className="px-4 py-3 text-right font-medium">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.sold.map((h) => {
                  const pl = ((h.sellPrice ?? 0) - h.costBasis) * h.quantity;
                  return (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{h.symbol}</p>
                        <p className="text-[11px] text-muted-foreground">
                          terjual {h.soldAt ? formatDate(h.soldAt) : "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatNumber(h.quantity, 8)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {usd(h.costBasis)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {usd(h.sellPrice ?? 0)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                          pl >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {pl >= 0 ? "+" : ""}{usd(pl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Kelola portofolio */}
      {isAdmin && stats.portfolios.length > 0 && (
        <Card>
          <CardHeader title="Portofolio" />
          <ul className="divide-y divide-border">
            {stats.portfolios.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.holdings.length} aset</span>
                <ConfirmForm
                  action={deletePortfolio}
                  message={`Hapus portofolio "${p.name}" beserta seluruh asetnya?`}
                  className="inline"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </ConfirmForm>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Simon hanya mencatat & memantau — tidak mengeksekusi order trading. Harga kripto dari
        CoinGecko, saham dari Finnhub, di-cache ±10 menit.
      </p>
    </div>
  );
}
