import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/auth-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  if (await getCurrentUser()) redirect("/app/dashboard");
  const { reset } = await searchParams;
  return (
    <AuthCard
      mode="login"
      title="Masuk ke Simon"
      subtitle="Kelola keuangan pribadi, bisnis, dan investasi Anda."
      notice={reset ? "Password berhasil diubah. Silakan masuk dengan password baru." : undefined}
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Daftar gratis
          </Link>
        </>
      }
    />
  );
}
