import { Briefcase, Package, Pencil, Percent, Plus, Receipt, ShoppingCart, Trash2, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { getBusinessStats, getBusinessTrend, getTopProducts } from "@/lib/finance";
import { endOfMonth, formatCurrency, formatDate, formatNumber, startOfMonth, toDateInput } from "@/lib/utils";
import {
  createCost,
  createProduct,
  createSale,
  deleteCost,
  deleteProduct,
  deleteSale,
  updateProduct,
} from "@/actions/business";
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
  Money,
  Select,
  SubmitButton,
} from "@/components/ui";
import { TrendChart } from "@/components/charts";

export const metadata = { title: "Bisnis" };

function ProductForm({
  defaults,
}: {
  defaults?: { id: string; name: string; sellPrice: number; cogs: number; stock: number | null };
}) {
  return (
    <>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Nama produk/jasa">
        <Input name="name" placeholder="cth. Kopi Susu" defaultValue={defaults?.name} required maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Harga jual / unit">
          <Input name="sellPrice" type="number" min={0} step="any" defaultValue={defaults?.sellPrice} required />
        </Field>
        <Field label="HPP (modal) / unit">
          <Input name="cogs" type="number" min={0} step="any" defaultValue={defaults?.cogs} required />
        </Field>
      </div>
      <Field label="Stok (opsional, kosongkan jika jasa)">
        <Input name="stock" type="number" min={0} defaultValue={defaults?.stock ?? ""} placeholder="—" />
      </Field>
      <SubmitButton className="w-full">{defaults ? "Simpan" : "Tambah Produk"}</SubmitButton>
    </>
  );
}

export default async function BusinessPage() {
  const { workspace, role } = await requireWorkspace("VIEWER");
  const cur = workspace.baseCurrency;
  const canWrite = role !== "VIEWER";
  const isAdmin = role === "ADMIN" || role === "OWNER";

  if (workspace.type !== "BUSINESS") {
    return (
      <Card>
        <EmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="Modul bisnis hanya untuk workspace tipe Bisnis"
          hint="Buat workspace baru bertipe Bisnis lewat menu workspace di pojok kiri atas."
        />
      </Card>
    );
  }

  const from = startOfMonth();
  const to = endOfMonth();
  const [stats, top, trend, products, sales, costs] = await Promise.all([
    getBusinessStats(workspace.id, from, to),
    getTopProducts(workspace.id, from, to),
    getBusinessTrend(workspace.id, 6),
    db.product.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    db.sale.findMany({
      where: { workspaceId: workspace.id },
      include: { product: true },
      orderBy: { date: "desc" },
      take: 20,
    }),
    db.operatingCost.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bisnis</h1>
          <p className="text-xs text-muted-foreground">
            Ringkasan bulan ini · {stats.salesCount} penjualan
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Modal
              title="Catat Penjualan"
              trigger={
                <Button size="sm">
                  <ShoppingCart className="h-3.5 w-3.5" /> Penjualan
                </Button>
              }
            >
              {
                products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tambahkan produk terlebih dahulu.</p>
                ) : (
                  <ActionForm action={createSale}>
                    <Field label="Produk">
                      <Select name="productId" required>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatCurrency(p.sellPrice, cur)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jumlah">
                        <Input name="qty" type="number" min={1} defaultValue={1} required />
                      </Field>
                      <Field label="Harga/unit (0 = harga jual)">
                        <Input name="unitPrice" type="number" min={0} step="any" defaultValue={0} />
                      </Field>
                    </div>
                    <Field label="Tanggal">
                      <Input name="date" type="date" defaultValue={toDateInput(new Date())} required />
                    </Field>
                    <SubmitButton className="w-full">Catat Penjualan</SubmitButton>
                  </ActionForm>
                )
              }
            </Modal>
            <Modal
              title="Biaya Operasional"
              trigger={
                <Button variant="outline" size="sm">
                  <Receipt className="h-3.5 w-3.5" /> Biaya
                </Button>
              }
            >
              {
                <ActionForm action={createCost}>
                  <Field label="Nama biaya">
                    <Input name="name" placeholder="cth. Sewa kios, Listrik" required maxLength={80} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Jumlah">
                      <Input name="amount" type="number" min={0} step="any" required />
                    </Field>
                    <Field label="Tanggal">
                      <Input name="date" type="date" defaultValue={toDateInput(new Date())} required />
                    </Field>
                  </div>
                  <SubmitButton className="w-full">Simpan Biaya</SubmitButton>
                </ActionForm>
              }
            </Modal>
            <Modal
              title="Produk Baru"
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Produk
                </Button>
              }
            >
              {
                <ActionForm action={createProduct}>
                  <ProductForm />
                </ActionForm>
              }
            </Modal>
          </div>
        )}
      </div>

      {/* Kartu metrik bulan ini */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Omzet"
          value={formatCurrency(stats.omzet, cur)}
          sub={`HPP ${formatCurrency(stats.hpp, cur)}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard label="Laba Kotor" value={formatCurrency(stats.grossProfit, cur)} />
        <StatCard
          label="Laba Bersih"
          value={formatCurrency(stats.netProfit, cur)}
          sub={`Biaya operasional ${formatCurrency(stats.opCost, cur)}`}
          tone={stats.netProfit >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Margin"
          value={`${formatNumber(stats.margin, 1)}%`}
          icon={<Percent className="h-4 w-4" />}
          tone={stats.margin >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Tren omzet vs biaya */}
      <Card>
        <CardHeader title="Omzet vs Biaya — 6 Bulan Terakhir" />
        <div className="p-4 sm:p-5">
          <TrendChart
            data={trend}
            currency={cur}
            series={[
              { key: "omzet", name: "Omzet", color: "var(--positive)" },
              { key: "biaya", name: "Biaya (HPP + operasional)", color: "var(--negative)" },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Produk terlaris & menguntungkan */}
        <Card>
          <CardHeader title="Produk Teratas Bulan Ini" />
          {top.bestSelling.length === 0 ? (
            <EmptyState title="Belum ada penjualan bulan ini" />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Terlaris
                </p>
                <ol className="space-y-1.5">
                  {top.bestSelling.map((p, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {i + 1}. {p.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.qty}×</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Paling Menguntungkan
                </p>
                <ol className="space-y-1.5">
                  {top.mostProfitable.map((p, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {i + 1}. {p.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-positive">
                        {formatCurrency(p.profit, cur)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </Card>

        {/* Produk */}
        <Card>
          <CardHeader title={`Produk (${products.length})`} />
          {products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="Belum ada produk"
              hint="Tambahkan produk/jasa beserta harga jual dan HPP-nya."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Produk</th>
                    <th className="px-4 py-3 text-right font-medium">Harga</th>
                    <th className="px-4 py-3 text-right font-medium">HPP</th>
                    <th className="px-4 py-3 text-right font-medium">Stok</th>
                    {canWrite && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          laba/unit {formatCurrency(p.sellPrice - p.cogs, cur)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatCurrency(p.sellPrice, cur)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(p.cogs, cur)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {p.stock === null ? <Badge>jasa</Badge> : <span className="tabular-nums">{p.stock}</span>}
                      </td>
                      {canWrite && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Modal
                              title="Ubah Produk"
                              trigger={
                                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ubah">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              }
                            >
                              {
                                <ActionForm action={updateProduct}>
                                  <ProductForm
                                    defaults={{
                                      id: p.id,
                                      name: p.name,
                                      sellPrice: p.sellPrice,
                                      cogs: p.cogs,
                                      stock: p.stock,
                                    }}
                                  />
                                </ActionForm>
                              }
                            </Modal>
                            {isAdmin && (
                              <ConfirmForm
                                action={deleteProduct}
                                message={`Hapus produk "${p.name}" beserta riwayat penjualannya?`}
                                className="inline"
                              >
                                <input type="hidden" name="id" value={p.id} />
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Penjualan terbaru */}
        <Card>
          <CardHeader title="Penjualan Terbaru" />
          {sales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-8 w-8" />}
              title="Belum ada penjualan"
              hint='Catat penjualan dengan tombol "Penjualan" di atas.'
            />
          ) : (
            <ul className="divide-y divide-border">
              {sales.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.qty}× {s.product.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(s.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(s.qty * s.unitPrice, cur)}
                    </p>
                    <p className="text-[11px] tabular-nums text-positive">
                      laba {formatCurrency(s.qty * (s.unitPrice - s.product.cogs), cur)}
                    </p>
                  </div>
                  {isAdmin && (
                    <ConfirmForm action={deleteSale} message="Hapus data penjualan ini?" className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </ConfirmForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Biaya operasional */}
        <Card>
          <CardHeader title="Biaya Operasional Terbaru" />
          {costs.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="Belum ada biaya operasional"
              hint="Catat sewa, gaji, listrik, marketing, dan biaya lain di sini."
            />
          ) : (
            <ul className="divide-y divide-border">
              {costs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(c.date)}</p>
                  </div>
                  <Money amount={-c.amount} currency={cur} signed className="text-sm font-semibold" />
                  {isAdmin && (
                    <ConfirmForm action={deleteCost} message={`Hapus biaya "${c.name}"?`} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </ConfirmForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
