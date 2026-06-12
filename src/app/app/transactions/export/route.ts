import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveContext } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

function csvCell(v: string | number | null | undefined) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const ctx = await getActiveContext();
  if (!ctx?.workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const where: Prisma.TransactionWhereInput = { workspaceId: ctx.workspace.id };
  const type = sp.get("type");
  if (type === "INCOME" || type === "EXPENSE") where.type = type;
  if (sp.get("category")) where.categoryId = sp.get("category")!;
  if (sp.get("wallet")) where.walletId = sp.get("wallet")!;
  if (sp.get("q")) where.note = { contains: sp.get("q")! };
  if (sp.get("from") || sp.get("to")) {
    where.date = {};
    if (sp.get("from")) where.date.gte = new Date(sp.get("from")!);
    if (sp.get("to")) where.date.lte = new Date(`${sp.get("to")}T23:59:59`);
  }

  const txs = await db.transaction.findMany({
    where,
    include: { category: true, wallet: true, createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const header = "tanggal,tipe,jumlah,kategori,dompet,metode,catatan,dibuat_oleh";
  const rows = txs.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type === "INCOME" ? "pemasukan" : "pengeluaran",
      t.amount,
      t.category?.name ?? "",
      t.wallet.name,
      t.method,
      t.note ?? "",
      t.createdBy?.name ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = "﻿" + [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi-${ctx.workspace.name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
