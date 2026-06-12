"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit, requireUser, requireWorkspace, setActiveWorkspaceCookie } from "@/lib/auth";
import type { WorkspaceType } from "@prisma/client";

const DEFAULT_CATEGORIES: Record<WorkspaceType, { name: string; kind: "INCOME" | "EXPENSE"; color: string }[]> = {
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

export async function createWorkspaceWithDefaults(
  userId: string,
  name: string,
  type: WorkspaceType,
  baseCurrency: string
) {
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
  });
  if (type === "INVESTMENT") {
    await db.portfolio.create({ data: { workspaceId: ws.id, name: "Portofolio Utama" } });
  }
  return ws;
}

const wsSchema = z.object({
  name: z.string().min(2, "Nama workspace minimal 2 karakter").max(50),
  type: z.enum(["PERSONAL", "BUSINESS", "INVESTMENT"]),
  baseCurrency: z.string().length(3),
});

export async function createWorkspace(formData: FormData) {
  const user = await requireUser();
  const parsed = wsSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    baseCurrency: formData.get("baseCurrency") || "IDR",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ws = await createWorkspaceWithDefaults(
    user.id,
    parsed.data.name,
    parsed.data.type,
    parsed.data.baseCurrency.toUpperCase()
  );
  await setActiveWorkspaceCookie(ws.id);
  await logAudit(ws.id, user.id, user.name, "membuat", `workspace "${ws.name}"`);
  redirect("/app/dashboard");
}

export async function switchWorkspace(workspaceId: string) {
  const user = await requireUser();
  const member = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (!member) return { error: "Anda bukan anggota workspace itu." };
  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath("/app", "layout");
  redirect("/app/dashboard");
}

export async function updateWorkspace(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const baseCurrency = String(formData.get("baseCurrency") ?? "IDR").toUpperCase();
  if (name.length < 2) return { error: "Nama workspace minimal 2 karakter." };
  if (!/^[A-Z]{3}$/.test(baseCurrency)) return { error: "Kode mata uang harus 3 huruf." };
  await db.workspace.update({ where: { id: workspace.id }, data: { name, baseCurrency } });
  await logAudit(workspace.id, user.id, user.name, "mengubah", "pengaturan workspace");
  revalidatePath("/app", "layout");
}

export async function deleteWorkspace() {
  const { user, workspace } = await requireWorkspace("OWNER");
  const count = await db.membership.count({ where: { userId: user.id } });
  if (count <= 1) return { error: "Tidak bisa menghapus workspace terakhir Anda." };
  await db.workspace.delete({ where: { id: workspace.id } });
  revalidatePath("/app", "layout");
  redirect("/app/dashboard");
}
