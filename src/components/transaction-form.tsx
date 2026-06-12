"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Modal, Select, SubmitButton, Textarea } from "./ui";
import { createTransaction, updateTransaction } from "@/actions/finance";
import { toDateInput } from "@/lib/utils";

type Wallet = { id: string; name: string };
type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

export type TxDefaults = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  walletId: string;
  categoryId: string | null;
  date: Date | string;
  note: string | null;
  method: "CASH" | "TRANSFER" | "EWALLET";
  recurring: "NONE" | "WEEKLY" | "MONTHLY";
};

export function TransactionModal({
  wallets,
  categories,
  tx,
  trigger,
}: {
  wallets: Wallet[];
  categories: Category[];
  tx?: TxDefaults;
  trigger: React.ReactNode;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(tx?.type ?? "EXPENSE");
  const filtered = categories.filter((c) => c.kind === type);

  return (
    <Modal title={tx ? "Ubah Transaksi" : "Transaksi Baru"} trigger={trigger}>
      {(close) => (
        <ActionForm action={tx ? updateTransaction : createTransaction} close={close}>
          {tx && <input type="hidden" name="id" value={tx.id} />}
          <div className="grid grid-cols-2 gap-2">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === t
                    ? t === "INCOME"
                      ? "border-positive bg-positive/10 text-positive"
                      : "border-negative bg-negative/10 text-negative"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                {t === "INCOME" ? "Pemasukan" : "Pengeluaran"}
              </label>
            ))}
          </div>
          <Field label="Jumlah">
            <Input
              name="amount"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0"
              defaultValue={tx?.amount}
              required
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dompet">
              <Select name="walletId" defaultValue={tx?.walletId} required>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Kategori">
              <Select name="categoryId" defaultValue={tx?.categoryId ?? ""}>
                <option value="">Tanpa kategori</option>
                {filtered.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <Input name="date" type="date" defaultValue={toDateInput(tx?.date ?? new Date())} required />
            </Field>
            <Field label="Metode">
              <Select name="method" defaultValue={tx?.method ?? "CASH"}>
                <option value="CASH">Tunai</option>
                <option value="TRANSFER">Transfer</option>
                <option value="EWALLET">E-Wallet</option>
              </Select>
            </Field>
          </div>
          <Field label="Berulang">
            <Select name="recurring" defaultValue={tx?.recurring ?? "NONE"}>
              <option value="NONE">Tidak berulang</option>
              <option value="WEEKLY">Setiap minggu</option>
              <option value="MONTHLY">Setiap bulan</option>
            </Select>
          </Field>
          <Field label="Catatan (opsional)">
            <Textarea name="note" rows={2} placeholder="cth. makan siang" defaultValue={tx?.note ?? ""} />
          </Field>
          <SubmitButton className="w-full">{tx ? "Simpan Perubahan" : "Simpan Transaksi"}</SubmitButton>
        </ActionForm>
      )}
    </Modal>
  );
}
