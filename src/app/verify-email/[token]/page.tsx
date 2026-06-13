import Link from "next/link";
import { MailCheck, MailX } from "lucide-react";
import { db } from "@/lib/db";

export const metadata = { title: "Verifikasi Email" };

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await db.authToken.findUnique({ where: { token }, include: { user: true } });

  let status: "ok" | "already" | "invalid" = "invalid";
  if (record && record.type === "VERIFY" && record.expiresAt > new Date()) {
    if (record.user.emailVerifiedAt) {
      status = "already";
    } else if (!record.usedAt) {
      await db.$transaction([
        db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
        db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      ]);
      status = "ok";
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          S
        </span>
        {status === "invalid" ? (
          <>
            <MailX className="mx-auto h-10 w-10 text-negative" />
            <h1 className="mt-3 text-lg font-semibold">Tautan verifikasi tidak valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tautan sudah dipakai atau kedaluwarsa. Kirim ulang email verifikasi dari halaman
              Pengaturan setelah masuk.
            </p>
          </>
        ) : (
          <>
            <MailCheck className="mx-auto h-10 w-10 text-positive" />
            <h1 className="mt-3 text-lg font-semibold">
              {status === "ok" ? "Email terverifikasi!" : "Email sudah terverifikasi"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "ok"
                ? `Terima kasih, ${record!.user.name}. Akun Anda sudah aktif sepenuhnya.`
                : "Akun Anda sudah aktif — tidak perlu verifikasi ulang."}
            </p>
          </>
        )}
        <Link
          href="/app/dashboard"
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Buka Aplikasi
        </Link>
      </div>
    </div>
  );
}
