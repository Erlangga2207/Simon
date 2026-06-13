import { AlertTriangle, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { changePassword, resendVerification, updateProfile } from "@/actions/auth";
import { deleteWorkspace, updateWorkspace } from "@/actions/workspace";
import { createCategory, deleteCategory, updateCategory, upsertBudget } from "@/actions/finance";
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

export const metadata = { title: "Pengaturan" };

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "JPY", "MYR"];
const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
];

export default async function SettingsPage() {
  const { workspace, role, user } = await requireWorkspace("VIEWER");
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const isOwner = role === "OWNER";
  const cur = workspace.baseCurrency;

  const [categories, budgets] = await Promise.all([
    db.category.findMany({ where: { workspaceId: workspace.id }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    db.budget.findMany({ where: { workspaceId: workspace.id } }),
  ]);
  const budgetOf = (categoryId: string) => budgets.find((b) => b.categoryId === categoryId)?.amount ?? 0;
  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Pengaturan</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profil */}
        <Card>
          <CardHeader title="Profil" />
          <div className="p-4 sm:p-5">
            <ActionForm action={updateProfile}>
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt="Foto profil"
                    className="h-14 w-14 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Field label="Foto profil">
                    <Input
                      name="avatar"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="h-auto py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG, atau WEBP — maks. 2 MB.</p>
                </div>
              </div>
              <Field label="Nama">
                <Input name="name" defaultValue={user.name} required minLength={2} maxLength={60} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mata uang pilihan">
                  <Select name="defaultCurrency" defaultValue={user.defaultCurrency}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Zona waktu">
                  <Select name="timezone" defaultValue={user.timezone}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email: {user.email}{" "}
                {user.emailVerifiedAt ? (
                  <Badge color="#059669">terverifikasi</Badge>
                ) : (
                  <Badge color="#ca8a04">belum terverifikasi</Badge>
                )}
              </p>
              <SubmitButton>Simpan Profil</SubmitButton>
            </ActionForm>
            {!user.emailVerifiedAt && (
              <ActionForm action={resendVerification} className="mt-3">
                <SubmitButton variant="outline" size="sm">Kirim Ulang Email Verifikasi</SubmitButton>
              </ActionForm>
            )}
          </div>
        </Card>

        {/* Ganti password */}
        <Card>
          <CardHeader title="Ganti Password" />
          <div className="p-4 sm:p-5">
            <ActionForm action={changePassword}>
              <Field label="Password saat ini">
                <Input name="current" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Password baru (min. 8 karakter)">
                <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
              </Field>
              <SubmitButton>Ubah Password</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>

      {/* Workspace */}
      <Card>
        <CardHeader title={`Workspace — ${workspace.name}`} />
        <div className="space-y-4 p-4 sm:p-5">
          {isAdmin ? (
            <ActionForm action={updateWorkspace}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama workspace">
                  <Input name="name" defaultValue={workspace.name} required minLength={2} maxLength={50} />
                </Field>
                <Field label="Mata uang dasar">
                  <Select name="baseCurrency" defaultValue={workspace.baseCurrency}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mengubah mata uang dasar tidak mengonversi nominal transaksi yang sudah tercatat.
              </p>
              <SubmitButton>Simpan Workspace</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted-foreground">
              Mata uang dasar: <b>{workspace.baseCurrency}</b>. Hanya Admin/Pemilik yang bisa mengubah
              pengaturan workspace.
            </p>
          )}

          {isOwner && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/30 bg-negative/5 px-4 py-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-negative">
                  <AlertTriangle className="h-4 w-4" /> Hapus workspace
                </p>
                <p className="text-xs text-muted-foreground">
                  Seluruh transaksi, dompet, dan data lain di workspace ini ikut terhapus permanen.
                </p>
              </div>
              <ConfirmForm
                action={deleteWorkspace}
                message={`Hapus workspace "${workspace.name}" beserta SELURUH datanya? Tindakan ini tidak bisa dibatalkan.`}
              >
                <Button type="submit" variant="danger" size="sm">Hapus Workspace</Button>
              </ConfirmForm>
            </div>
          )}
        </div>
      </Card>

      {/* Kategori */}
      <Card>
        <CardHeader
          title="Kategori"
          action={
            isAdmin && (
              <Modal title="Kategori Baru" trigger={<Button size="sm"><Plus className="h-3.5 w-3.5" /> Kategori</Button>}>
                {
                  <ActionForm action={createCategory}>
                    <Field label="Nama kategori">
                      <Input name="name" placeholder="cth. Pendidikan" required maxLength={50} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jenis">
                        <Select name="kind" defaultValue="EXPENSE">
                          <option value="EXPENSE">Pengeluaran</option>
                          <option value="INCOME">Pemasukan</option>
                        </Select>
                      </Field>
                      <Field label="Warna">
                        <Input name="color" type="color" defaultValue="#10b981" className="h-10 p-1" />
                      </Field>
                    </div>
                    <SubmitButton className="w-full">Tambah Kategori</SubmitButton>
                  </ActionForm>
                }
              </Modal>
            )
          }
        />
        {categories.length === 0 ? (
          <EmptyState icon={<Tags className="h-8 w-8" />} title="Belum ada kategori" />
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <Badge>{c.kind === "INCOME" ? "Pemasukan" : "Pengeluaran"}</Badge>
                {isAdmin && (
                  <Modal
                    title="Ubah Kategori"
                    trigger={
                      <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ubah">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    }
                  >
                    {
                      <ActionForm action={updateCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <Field label="Nama kategori">
                          <Input name="name" defaultValue={c.name} required maxLength={50} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Jenis">
                            <Select name="kind" defaultValue={c.kind}>
                              <option value="EXPENSE">Pengeluaran</option>
                              <option value="INCOME">Pemasukan</option>
                            </Select>
                          </Field>
                          <Field label="Warna">
                            <Input name="color" type="color" defaultValue={c.color} className="h-10 p-1" />
                          </Field>
                        </div>
                        <SubmitButton className="w-full">Simpan Perubahan</SubmitButton>
                      </ActionForm>
                    }
                  </Modal>
                )}
                {isAdmin && (
                  <ConfirmForm
                    action={deleteCategory}
                    message={`Hapus kategori "${c.name}"? Transaksi yang memakainya menjadi "Tanpa kategori".`}
                    className="inline"
                  >
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

      {/* Budget per kategori */}
      {isAdmin && (
        <Card>
          <CardHeader title="Budget Bulanan per Kategori" />
          {expenseCategories.length === 0 ? (
            <EmptyState title="Belum ada kategori pengeluaran" hint="Tambahkan kategori pengeluaran dulu." />
          ) : (
            <ul className="divide-y divide-border">
              {expenseCategories.map((c) => {
                const amount = budgetOf(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                    {amount > 0 && (
                      <span className="text-xs text-muted-foreground">{formatCurrency(amount, cur)}/bln</span>
                    )}
                    <ActionForm action={upsertBudget} className="flex items-center gap-2 space-y-0">
                      <input type="hidden" name="categoryId" value={c.id} />
                      <Input
                        name="amount"
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={amount || ""}
                        placeholder="0 = tanpa budget"
                        className="h-8 w-36 text-xs"
                        aria-label={`Budget ${c.name}`}
                      />
                      <SubmitButton variant="outline" size="sm">Simpan</SubmitButton>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
            Dashboard menampilkan peringatan saat pengeluaran kategori mencapai ≥ 80% budget bulanannya.
            Isi 0 untuk menghapus budget.
          </p>
        </Card>
      )}
    </div>
  );
}
