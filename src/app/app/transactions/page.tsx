import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deleteTransaction, importTransactionsCsv } from "@/actions/finance";
import {
  ActionForm,
  Badge,
  Button,
  Card,
  ConfirmForm,
  EmptyState,
  Field,
  Input,
  Modal,
  Money,
  Select,
  SubmitButton,
} from "@/components/ui";
import { TransactionModal } from "@/components/transaction-form";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Transaksi" };

const METHOD_LABEL = { CASH: "Tunai", TRANSFER: "Transfer", EWALLET: "E-Wallet" } as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { workspace, role, user } = await requireWorkspace("VIEWER");
  const sp = await searchParams;
  const cur = workspace.baseCurrency;
  const canWrite = role !== "VIEWER";
  const isAdmin = role === "ADMIN" || role === "OWNER";

  const where: Prisma.TransactionWhereInput = { workspaceId: workspace.id };
  if (sp.type === "INCOME" || sp.type === "EXPENSE") where.type = sp.type;
  if (sp.category) where.categoryId = sp.category;
  if (sp.wallet) where.walletId = sp.wallet;
  if (sp.q) where.note = { contains: sp.q };
  if (sp.from || sp.to) {
    where.date = {};
    if (sp.from) where.date.gte = new Date(sp.from);
    if (sp.to) where.date.lte = new Date(`${sp.to}T23:59:59`);
  }
  if (sp.min || sp.max) {
    where.amount = {};
    if (sp.min) where.amount.gte = Number(sp.min);
    if (sp.max) where.amount.lte = Number(sp.max);
  }

  const [txs, wallets, categories] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true, wallet: true, createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 200,
    }),
    db.wallet.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    db.category.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
  ]);

  const walletOpts = wallets.map((w) => ({ id: w.id, name: w.name }));
  const categoryOpts = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Transaksi</h1>
        <div className="flex flex-wrap gap-2">
          <a href={`/app/transactions/export?${exportQs}`}>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" /> Ekspor CSV
            </Button>
          </a>
          {canWrite && (
            <Modal
              title="Impor CSV"
              trigger={
                <Button variant="outline" size="sm">
                  <Upload className="h-3.5 w-3.5" /> Impor CSV
                </Button>
              }
            >
              {
                <ActionForm action={importTransactionsCsv}>
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Format kolom: <code>tanggal,tipe,jumlah,kategori,dompet,catatan</code>
                    <br />
                    Contoh: <code>2026-06-01,pengeluaran,25000,Makan & Minum,Cash,nasi goreng</code>
                  </p>
                  <Field label="File CSV">
                    <Input name="file" type="file" accept=".csv,text/csv" required className="pt-1.5" />
                  </Field>
                  <SubmitButton className="w-full">Impor</SubmitButton>
                </ActionForm>
              }
            </Modal>
          )}
          {canWrite && (
            <TransactionModal
              wallets={walletOpts}
              categories={categoryOpts}
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> Transaksi
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Filter */}
      <Card className="p-3">
        <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <Input name="q" placeholder="Cari catatan…" defaultValue={sp.q} className="col-span-2 sm:col-span-1" />
          <Select name="type" defaultValue={sp.type ?? ""}>
            <option value="">Semua tipe</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
          </Select>
          <Select name="category" defaultValue={sp.category ?? ""}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select name="wallet" defaultValue={sp.wallet ?? ""}>
            <option value="">Semua dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
          <Input name="from" type="date" defaultValue={sp.from} aria-label="Dari tanggal" />
          <Input name="to" type="date" defaultValue={sp.to} aria-label="Sampai tanggal" />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" /> Filter
          </Button>
        </form>
      </Card>

      {/* Daftar */}
      <Card>
        {txs.length === 0 ? (
          <EmptyState title="Tidak ada transaksi" hint="Ubah filter atau tambahkan transaksi baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Kategori / Catatan</th>
                  <th className="px-4 py-3 font-medium">Dompet</th>
                  <th className="px-4 py-3 font-medium">Metode</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                  {canWrite && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txs.map((tx) => {
                  const editable = isAdmin || tx.createdById === user.id;
                  return (
                    <tr key={tx.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tx.category?.color ?? "#94a3b8" }}
                          />
                          <span className="font-medium">{tx.category?.name ?? "Tanpa kategori"}</span>
                          {tx.recurring !== "NONE" && <Badge>berulang</Badge>}
                        </div>
                        {tx.note && <p className="mt-0.5 text-xs text-muted-foreground">{tx.note}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{tx.wallet.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {METHOD_LABEL[tx.method]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Money
                          amount={tx.type === "INCOME" ? tx.amount : -tx.amount}
                          currency={cur}
                          signed
                          className="font-semibold"
                        />
                      </td>
                      {canWrite && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {editable && (
                            <span className="inline-flex items-center gap-1">
                              <TransactionModal
                                wallets={walletOpts}
                                categories={categoryOpts}
                                tx={{
                                  id: tx.id,
                                  type: tx.type,
                                  amount: tx.amount,
                                  walletId: tx.walletId,
                                  categoryId: tx.categoryId,
                                  date: tx.date,
                                  note: tx.note,
                                  method: tx.method,
                                  recurring: tx.recurring,
                                }}
                                trigger={
                                  <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ubah">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                }
                              />
                              <ConfirmForm action={deleteTransaction} className="inline">
                                <input type="hidden" name="id" value={tx.id} />
                                <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </ConfirmForm>
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-muted-foreground">Menampilkan maks. 200 transaksi terbaru sesuai filter.</p>
    </div>
  );
}
