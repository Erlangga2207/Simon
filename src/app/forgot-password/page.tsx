import Link from "next/link";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui";

export const metadata = { title: "Lupa Password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

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
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10 text-positive" />
              <h1 className="mt-3 text-lg font-semibold">Periksa email Anda</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Jika email tersebut terdaftar, kami sudah mengirim tautan reset password.
                Tautan berlaku 1 jam. Cek juga folder spam.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold">Lupa password?</h1>
              <p className="mb-5 mt-1 text-xs text-muted-foreground">
                Masukkan email akun Anda — kami kirimkan tautan untuk membuat password baru.
              </p>
              <ActionForm action={requestPasswordReset}>
                <Field label="Email">
                  <Input name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
                </Field>
                <SubmitButton className="w-full">Kirim Tautan Reset</SubmitButton>
              </ActionForm>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ingat password Anda?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
