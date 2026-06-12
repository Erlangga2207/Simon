import { Banknote, CreditCard, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { getWalletBalances } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { createWallet, deleteWallet, updateWallet } from "@/actions/finance";
import {
  ActionForm,
  Badge,
  Button,
  Card,
  ConfirmForm,
  Field,
  Input,
  Modal,
  Select,
  SubmitButton,
} from "@/components/ui";

export const metadata = { title: "Dompet" };

const TYPE_META = {
  CASH: { label: "Tunai", icon: Banknote },
  BANK: { label: "Bank", icon: CreditCard },
  EWALLET: { label: "E-Wallet", icon: Smartphone },
} as const;

function WalletForm({ defaults }: { defaults?: { id: string; name: string; type: string } }) {
  return (
    <>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Nama dompet">
        <Input name="name" placeholder="cth. BCA, GoPay" defaultValue={defaults?.name} required />
      </Field>
      <Field label="Tipe">
        <Select name="type" defaultValue={defaults?.type ?? "CASH"}>
          <option value="CASH">Tunai</option>
          <option value="BANK">Bank</option>
          <option value="EWALLET">E-Wallet</option>
        </Select>
      </Field>
      <SubmitButton className="w-full">{defaults ? "Simpan" : "Tambah Dompet"}</SubmitButton>
    </>
  );
}

export default async function WalletsPage() {
  const { workspace, role } = await requireWorkspace("VIEWER");
  const wallets = await getWalletBalances(workspace.id);
  const cur = workspace.baseCurrency;
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const total = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dompet</h1>
          <p className="text-xs text-muted-foreground">Total saldo: {formatCurrency(total, cur)}</p>
        </div>
        {isAdmin && (
          <Modal title="Dompet Baru" trigger={<Button><Plus className="h-4 w-4" /> Dompet</Button>}>
            {(close) => (
              <ActionForm action={createWallet} close={close}>
                <WalletForm />
              </ActionForm>
            )}
          </Modal>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => {
          const meta = TYPE_META[w.type];
          const Icon = meta.icon;
          return (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {isAdmin && (
                  <span className="flex gap-1">
                    <Modal
                      title="Ubah Dompet"
                      trigger={
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ubah">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    >
                      {(close) => (
                        <ActionForm action={updateWallet} close={close}>
                          <WalletForm defaults={{ id: w.id, name: w.name, type: w.type }} />
                        </ActionForm>
                      )}
                    </Modal>
                    <ConfirmForm
                      action={deleteWallet}
                      message={`Hapus dompet "${w.name}" beserta seluruh transaksinya?`}
                      className="inline"
                    >
                      <input type="hidden" name="id" value={w.id} />
                      <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </ConfirmForm>
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium">{w.name}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(w.balance, cur)}</p>
              <Badge className="mt-2">{meta.label}</Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
