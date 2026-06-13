"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit, requireWorkspace, roleAtLeast, type RoleName } from "@/lib/auth";

/* =================== Dompet =================== */

const walletSchema = z.object({
  name: z.string().min(1, "Nama dompet wajib diisi").max(50),
  type: z.enum(["CASH", "BANK", "EWALLET"]),
});

export async function createWallet(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const parsed = walletSchema.safeParse({ name: formData.get("name"), type: formData.get("type") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.wallet.create({ data: { ...parsed.data, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menambah", `dompet "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function updateWallet(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const parsed = walletSchema.safeParse({ name: formData.get("name"), type: formData.get("type") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.wallet.update({ where: { id, workspaceId: workspace.id }, data: parsed.data });
  await logAudit(workspace.id, user.id, user.name, "mengubah", `dompet "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function deleteWallet(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const count = await db.wallet.count({ where: { workspaceId: workspace.id } });
  if (count <= 1) return { error: "Minimal harus ada satu dompet." };
  const w = await db.wallet.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `dompet "${w.name}"`);
  revalidatePath("/app", "layout");
}

/* =================== Kategori =================== */

const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  kind: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
});

export async function createCategory(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color") || "#10b981",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.category.create({ data: { ...parsed.data, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menambah", `kategori "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function updateCategory(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color") || "#10b981",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.category.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return { error: "Kategori tidak ditemukan." };
  await db.category.update({ where: { id }, data: parsed.data });
  await logAudit(workspace.id, user.id, user.name, "mengubah", `kategori "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function deleteCategory(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const c = await db.category.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `kategori "${c.name}"`);
  revalidatePath("/app", "layout");
}

/* =================== Budget =================== */

export async function upsertBudget(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const categoryId = String(formData.get("categoryId"));
  const amount = Number(formData.get("amount"));
  if (!categoryId || !Number.isFinite(amount) || amount < 0) return { error: "Data budget tidak valid." };
  if (amount === 0) {
    await db.budget.deleteMany({ where: { workspaceId: workspace.id, categoryId } });
  } else {
    await db.budget.upsert({
      where: { workspaceId_categoryId: { workspaceId: workspace.id, categoryId } },
      create: { workspaceId: workspace.id, categoryId, amount },
      update: { amount },
    });
  }
  await logAudit(workspace.id, user.id, user.name, "mengatur", "budget kategori");
  revalidatePath("/app", "layout");
}

/* =================== Transaksi =================== */

const txSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  walletId: z.string().min(1, "Pilih dompet"),
  categoryId: z.string().optional(),
  date: z.coerce.date(),
  note: z.string().max(200).optional(),
  method: z.enum(["CASH", "TRANSFER", "EWALLET"]),
  recurring: z.enum(["NONE", "WEEKLY", "MONTHLY"]).default("NONE"),
});

function nextRunAfter(date: Date, rule: "WEEKLY" | "MONTHLY") {
  const d = new Date(date);
  if (rule === "WEEKLY") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function parseTx(formData: FormData) {
  return txSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    walletId: formData.get("walletId"),
    categoryId: formData.get("categoryId") || undefined,
    date: formData.get("date"),
    note: formData.get("note") || undefined,
    method: formData.get("method"),
    recurring: formData.get("recurring") || "NONE",
  });
}

export async function createTransaction(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const wallet = await db.wallet.findFirst({ where: { id: d.walletId, workspaceId: workspace.id } });
  if (!wallet) return { error: "Dompet tidak ditemukan." };
  await db.transaction.create({
    data: {
      workspaceId: workspace.id,
      walletId: d.walletId,
      categoryId: d.categoryId || null,
      type: d.type,
      amount: d.amount,
      date: d.date,
      note: d.note,
      method: d.method,
      recurring: d.recurring,
      nextRun: d.recurring !== "NONE" ? nextRunAfter(d.date, d.recurring) : null,
      createdById: user.id,
    },
  });
  await logAudit(workspace.id, user.id, user.name, "menambah", `transaksi ${d.type === "INCOME" ? "pemasukan" : "pengeluaran"}`);
  revalidatePath("/app", "layout");
}

async function getEditableTx(id: string, workspaceId: string, userId: string, role: RoleName) {
  const tx = await db.transaction.findFirst({ where: { id, workspaceId } });
  if (!tx) return null;
  if (!roleAtLeast(role, "ADMIN") && tx.createdById !== userId) return null;
  return tx;
}

export async function updateTransaction(formData: FormData) {
  const { user, workspace, role } = await requireWorkspace("MEMBER");
  const id = String(formData.get("id"));
  const tx = await getEditableTx(id, workspace.id, user.id, role);
  if (!tx) return { error: "Transaksi tidak ditemukan atau bukan milik Anda." };
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await db.transaction.update({
    where: { id },
    data: {
      type: d.type,
      amount: d.amount,
      walletId: d.walletId,
      categoryId: d.categoryId || null,
      date: d.date,
      note: d.note,
      method: d.method,
      recurring: d.recurring,
      nextRun: d.recurring !== "NONE" ? (tx.nextRun ?? nextRunAfter(d.date, d.recurring)) : null,
    },
  });
  await logAudit(workspace.id, user.id, user.name, "mengubah", "transaksi");
  revalidatePath("/app", "layout");
}

export async function deleteTransaction(formData: FormData) {
  const { user, workspace, role } = await requireWorkspace("MEMBER");
  const id = String(formData.get("id"));
  const tx = await getEditableTx(id, workspace.id, user.id, role);
  if (!tx) return { error: "Transaksi tidak ditemukan atau bukan milik Anda." };
  await db.transaction.delete({ where: { id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", "transaksi");
  revalidatePath("/app", "layout");
}

/** Terapkan transaksi berulang yang sudah jatuh tempo (dipanggil saat dashboard dibuka). */
export async function applyRecurringTransactions(workspaceId: string) {
  const due = await db.transaction.findMany({
    where: { workspaceId, recurring: { not: "NONE" }, nextRun: { lte: new Date() } },
  });
  for (const tx of due) {
    let next = tx.nextRun!;
    // buat instance untuk setiap periode yang terlewat (maks. 24 untuk jaga-jaga)
    for (let i = 0; i < 24 && next <= new Date(); i++) {
      await db.transaction.create({
        data: {
          workspaceId: tx.workspaceId,
          walletId: tx.walletId,
          categoryId: tx.categoryId,
          type: tx.type,
          amount: tx.amount,
          date: next,
          note: tx.note ? `${tx.note} (berulang)` : "Transaksi berulang",
          method: tx.method,
          createdById: tx.createdById,
        },
      });
      next = nextRunAfter(next, tx.recurring as "WEEKLY" | "MONTHLY");
    }
    await db.transaction.update({ where: { id: tx.id }, data: { nextRun: next } });
  }
}

/* =================== Impor CSV =================== */

export async function importTransactionsCsv(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Pilih file CSV terlebih dahulu." };
  if (file.size > 1024 * 1024) return { error: "File terlalu besar (maks. 1 MB)." };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "CSV kosong. Format: tanggal,tipe,jumlah,kategori,dompet,catatan" };

  const wallets = await db.wallet.findMany({ where: { workspaceId: workspace.id } });
  const categories = await db.category.findMany({ where: { workspaceId: workspace.id } });
  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [dateStr, typeStr, amountStr, catName, walletName, note] = cols;
    const date = new Date(dateStr);
    const amount = Number(amountStr);
    const type = /^(income|pemasukan)$/i.test(typeStr) ? "INCOME" : /^(expense|pengeluaran)$/i.test(typeStr) ? "EXPENSE" : null;
    if (isNaN(date.getTime()) || !Number.isFinite(amount) || amount <= 0 || !type) {
      errors.push(`Baris ${i + 1} dilewati`);
      continue;
    }
    const wallet = wallets.find((w) => w.name.toLowerCase() === (walletName ?? "").toLowerCase()) ?? wallets[0];
    let category = categories.find(
      (c) => c.name.toLowerCase() === (catName ?? "").toLowerCase() && c.kind === type
    );
    if (!category && catName) {
      category = await db.category.create({
        data: { workspaceId: workspace.id, name: catName, kind: type, color: "#64748b" },
      });
      categories.push(category);
    }
    await db.transaction.create({
      data: {
        workspaceId: workspace.id,
        walletId: wallet.id,
        categoryId: category?.id ?? null,
        type,
        amount,
        date,
        note: note || null,
        method: "CASH",
        createdById: user.id,
      },
    });
    imported++;
  }

  await logAudit(workspace.id, user.id, user.name, "mengimpor", `${imported} transaksi dari CSV`);
  revalidatePath("/app", "layout");
  if (imported === 0) return { error: "Tidak ada baris valid. Format: tanggal,tipe,jumlah,kategori,dompet,catatan" };
}
