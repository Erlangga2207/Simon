import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvitation } from "@/actions/team";

export const metadata = { title: "Undangan Tim" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const invite = await db.invitation.findUnique({
    where: { token },
    include: { workspace: true },
  });
  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          S
        </span>
        {!valid ? (
          <>
            <h1 className="text-lg font-semibold">Undangan tidak valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tautan undangan ini sudah dipakai atau kedaluwarsa.
            </p>
            <Link href="/" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
              Kembali ke beranda
            </Link>
          </>
        ) : !user ? (
          <>
            <h1 className="text-lg font-semibold">Anda diundang ke {invite.workspace.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Masuk atau daftar dengan email <b>{invite.email}</b>, lalu buka tautan ini lagi untuk bergabung.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Masuk
              </Link>
              <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Daftar
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Gabung ke {invite.workspace.name}?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Anda akan bergabung sebagai <b>{invite.role}</b> dengan akun {user.email}.
            </p>
            <form
              action={async () => {
                "use server";
                await acceptInvitation(token);
              }}
              className="mt-5"
            >
              <button className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Terima Undangan
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
