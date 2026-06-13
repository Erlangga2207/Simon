import Link from "next/link";
import { KeyRound } from "lucide-react";
import { db } from "@/lib/db";
import { resetPassword } from "@/actions/auth";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui";

export const metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await db.authToken.findUnique({ where: { token } });
  const valid = record && record.type === "RESET" && !record.usedAt && record.expiresAt > new Date();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            S
          </span>
          <span className="text-2xl font-bold tracking-tight">Simon</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {!valid ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Tautan tidak valid</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tautan reset ini sudah dipakai atau kedaluwarsa (berlaku 1 jam).
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
              >
                Minta tautan baru
              </Link>
            </div>
          ) : (
            <>
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="h-5 w-5 text-primary" /> Buat password baru
              </h1>
              <p className="mb-5 mt-1 text-xs text-muted-foreground">
                Masukkan password baru untuk akun Anda.
              </p>
              <ActionForm action={resetPassword}>
                <input type="hidden" name="token" value={token} />
                <Field label="Password baru (min. 8 karakter)">
                  <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
                </Field>
                <SubmitButton className="w-full">Simpan Password Baru</SubmitButton>
              </ActionForm>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
