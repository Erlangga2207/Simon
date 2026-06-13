import { History, Mail, Plus, Trash2, UserCog, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { changeMemberRole, createInvitation, removeMember, revokeInvitation } from "@/actions/team";
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
import { CopyLinkButton } from "@/components/copy-button";

export const metadata = { title: "Tim" };

const ROLE_LABEL = { OWNER: "Pemilik", ADMIN: "Admin", MEMBER: "Anggota", VIEWER: "Viewer" } as const;
const ROLE_COLOR = { OWNER: "#7c3aed", ADMIN: "#2563eb", MEMBER: "#059669", VIEWER: "#64748b" } as const;

export default async function TeamPage() {
  const { workspace, role, user } = await requireWorkspace("VIEWER");
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const isOwner = role === "OWNER";

  const [members, invitations, logs] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    isAdmin
      ? db.invitation.findMany({
          where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    isAdmin
      ? db.auditLog.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tim</h1>
          <p className="text-xs text-muted-foreground">
            {members.length} anggota di workspace {workspace.name}
          </p>
        </div>
        {isAdmin && (
          <Modal title="Undang Anggota" trigger={<Button><Plus className="h-4 w-4" /> Undang</Button>}>
            {
              <ActionForm action={createInvitation}>
                <Field label="Email">
                  <Input name="email" type="email" placeholder="nama@email.com" required />
                </Field>
                <Field label="Peran">
                  <Select name="role" defaultValue="MEMBER">
                    {isOwner && <option value="ADMIN">Admin — kelola data & anggota</option>}
                    <option value="MEMBER">Anggota — catat transaksi</option>
                    <option value="VIEWER">Viewer — hanya melihat</option>
                  </Select>
                </Field>
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Setelah dibuat, salin tautan undangan dan kirimkan ke email tersebut. Tautan
                  berlaku 7 hari.
                </p>
                <SubmitButton className="w-full">Buat Undangan</SubmitButton>
              </ActionForm>
            }
          </Modal>
        )}
      </div>

      {/* Anggota */}
      <Card>
        <CardHeader title="Anggota" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Bergabung</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {m.user.name}
                      {m.userId === user.id && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge color={ROLE_COLOR[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {m.role !== "OWNER" && (
                        <span className="inline-flex items-center gap-1">
                          {isOwner && (
                            <Modal
                              title={`Ubah Peran — ${m.user.name}`}
                              trigger={
                                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Ubah peran">
                                  <UserCog className="h-3.5 w-3.5" />
                                </button>
                              }
                            >
                              {
                                <ActionForm action={changeMemberRole}>
                                  <input type="hidden" name="membershipId" value={m.id} />
                                  <Field label="Peran baru">
                                    <Select name="role" defaultValue={m.role}>
                                      <option value="ADMIN">Admin — kelola data & anggota</option>
                                      <option value="MEMBER">Anggota — catat transaksi</option>
                                      <option value="VIEWER">Viewer — hanya melihat</option>
                                    </Select>
                                  </Field>
                                  <SubmitButton className="w-full">Simpan</SubmitButton>
                                </ActionForm>
                              }
                            </Modal>
                          )}
                          <ConfirmForm
                            action={removeMember}
                            message={`Keluarkan ${m.user.name} dari workspace ini?`}
                            className="inline"
                          >
                            <input type="hidden" name="membershipId" value={m.id} />
                            <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Keluarkan">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </ConfirmForm>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Undangan pending */}
      {isAdmin && (
        <Card>
          <CardHeader title="Undangan Menunggu" />
          {invitations.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-8 w-8" />}
              title="Tidak ada undangan aktif"
              hint="Undang anggota baru dengan tombol di atas."
            />
          ) : (
            <ul className="divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[inv.role]} · berlaku s.d. {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                  <CopyLinkButton path={`/invite/${inv.token}`} />
                  <ConfirmForm
                    action={revokeInvitation}
                    message={`Batalkan undangan untuk ${inv.email}?`}
                    className="inline"
                  >
                    <input type="hidden" name="id" value={inv.id} />
                    <button className="rounded-lg p-1.5 text-negative hover:bg-muted" aria-label="Batalkan undangan">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </ConfirmForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Audit log */}
      {isAdmin && (
        <Card>
          <CardHeader title="Riwayat Aktivitas" />
          {logs.length === 0 ? (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="Belum ada aktivitas"
              hint="Setiap perubahan data di workspace ini akan tercatat di sini."
            />
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
                  <p className="min-w-0 text-sm">
                    <span className="font-medium">{log.userName}</span>{" "}
                    <span className="text-muted-foreground">{log.action}</span> {log.entity}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!isAdmin && (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="Akses terbatas"
            hint="Undangan dan riwayat aktivitas hanya bisa dilihat Admin atau Pemilik."
          />
        </Card>
      )}
    </div>
  );
}
