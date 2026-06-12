"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit, requireWorkspace } from "@/lib/auth";

const productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(80),
  sellPrice: z.coerce.number().min(0, "Harga jual tidak valid"),
  cogs: z.coerce.number().min(0, "HPP tidak valid"),
  stock: z.coerce.number().int().min(0).optional(),
});

export async function createProduct(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sellPrice: formData.get("sellPrice"),
    cogs: formData.get("cogs"),
    stock: formData.get("stock") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.product.create({ data: { ...parsed.data, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menambah", `produk "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function updateProduct(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const id = String(formData.get("id"));
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sellPrice: formData.get("sellPrice"),
    cogs: formData.get("cogs"),
    stock: formData.get("stock") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.product.update({ where: { id, workspaceId: workspace.id }, data: parsed.data });
  await logAudit(workspace.id, user.id, user.name, "mengubah", `produk "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function deleteProduct(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const p = await db.product.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `produk "${p.name}"`);
  revalidatePath("/app", "layout");
}

const saleSchema = z.object({
  productId: z.string().min(1, "Pilih produk"),
  qty: z.coerce.number().int().positive("Jumlah minimal 1"),
  unitPrice: z.coerce.number().min(0),
  date: z.coerce.date(),
});

export async function createSale(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const parsed = saleSchema.safeParse({
    productId: formData.get("productId"),
    qty: formData.get("qty"),
    unitPrice: formData.get("unitPrice"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const product = await db.product.findFirst({
    where: { id: parsed.data.productId, workspaceId: workspace.id },
  });
  if (!product) return { error: "Produk tidak ditemukan." };
  const unitPrice = parsed.data.unitPrice > 0 ? parsed.data.unitPrice : product.sellPrice;
  await db.sale.create({
    data: {
      workspaceId: workspace.id,
      productId: product.id,
      qty: parsed.data.qty,
      unitPrice,
      date: parsed.data.date,
    },
  });
  if (product.stock !== null) {
    await db.product.update({
      where: { id: product.id },
      data: { stock: Math.max(0, product.stock - parsed.data.qty) },
    });
  }
  await logAudit(workspace.id, user.id, user.name, "mencatat", `penjualan ${parsed.data.qty}× ${product.name}`);
  revalidatePath("/app", "layout");
}

export async function deleteSale(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  await db.sale.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", "data penjualan");
  revalidatePath("/app", "layout");
}

const costSchema = z.object({
  name: z.string().min(1, "Nama biaya wajib diisi").max(80),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  date: z.coerce.date(),
});

export async function createCost(formData: FormData) {
  const { user, workspace } = await requireWorkspace("MEMBER");
  const parsed = costSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.operatingCost.create({ data: { ...parsed.data, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menambah", `biaya "${parsed.data.name}"`);
  revalidatePath("/app", "layout");
}

export async function deleteCost(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  const c = await db.operatingCost.delete({ where: { id, workspaceId: workspace.id } });
  await logAudit(workspace.id, user.id, user.name, "menghapus", `biaya "${c.name}"`);
  revalidatePath("/app", "layout");
}
