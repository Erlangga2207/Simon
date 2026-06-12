"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit, requireWorkspace } from "@/lib/auth";

export async function createPortfolio(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama portofolio wajib diisi." };
  await db.portfolio.create({ data: { workspaceId: workspace.id, name } });
  await logAudit(workspace.id, user.id, user.name, "menambah", `portofolio "${name}"`);
  revalidatePath("/app", "layout");
}

export async function deletePortfolio(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const p = await db.portfolio.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `portofolio "${p.name}"`);
  revalidatePath("/app", "layout");
}

const holdingSchema = z.object({
  portfolioId: z.string().min(1, "Pilih portofolio"),
  symbol: z.string().min(1, "Simbol wajib diisi").max(15),
  name: z.string().max(60).optional(),
  assetType: z.enum(["STOCK", "CRYPTO"]),
  quantity: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  costBasis: z.coerce.number().positive("Harga beli harus lebih dari 0"),
  buyDate: z.coerce.date(),
});

export async function addHolding(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const parsed = holdingSchema.safeParse({
    portfolioId: formData.get("portfolioId"),
    symbol: formData.get("symbol"),
    name: formData.get("name") || undefined,
    assetType: formData.get("assetType"),
    quantity: formData.get("quantity"),
    costBasis: formData.get("costBasis"),
    buyDate: formData.get("buyDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const portfolio = await db.portfolio.findFirst({
    where: { id: parsed.data.portfolioId, workspaceId: workspace.id },
  });
  if (!portfolio) return { error: "Portofolio tidak ditemukan." };
  await db.holding.create({
    data: { ...parsed.data, symbol: parsed.data.symbol.toUpperCase() },
  });
  await logAudit(workspace.id, user.id, user.name, "menambah", `aset ${parsed.data.symbol.toUpperCase()}`);
  revalidatePath("/app", "layout");
}

export async function sellHolding(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const id = String(formData.get("id"));
  const sellPrice = Number(formData.get("sellPrice"));
  if (!Number.isFinite(sellPrice) || sellPrice <= 0) return { error: "Harga jual tidak valid." };
  const holding = await db.holding.findFirst({
    where: { id, portfolio: { workspaceId: workspace.id }, soldAt: null },
  });
  if (!holding) return { error: "Aset tidak ditemukan." };
  await db.holding.update({ where: { id }, data: { soldAt: new Date(), sellPrice } });
  await logAudit(workspace.id, user.id, user.name, "menjual", `aset ${holding.symbol}`);
  revalidatePath("/app", "layout");
}

export async function deleteHolding(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const holding = await db.holding.findFirst({
    where: { id, portfolio: { workspaceId: workspace.id } },
  });
  if (!holding) return { error: "Aset tidak ditemukan." };
  await db.holding.delete({ where: { id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `aset ${holding.symbol}`);
  revalidatePath("/app", "layout");
}

/** Paksa refresh harga: hapus umur cache agar fetch ulang saat halaman dimuat. */
export async function forceRefreshPrices() {
  await requireWorkspace("VIEWER");
  await db.priceCache.updateMany({ data: { updatedAt: new Date(0) } });
  revalidatePath("/app", "layout");
}
