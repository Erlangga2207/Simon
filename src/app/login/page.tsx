import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/auth-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/app/dashboard");
  return (
    <AuthCard
      mode="login"
      title="Masuk ke Simon"
      subtitle="Kelola keuangan pribadi, bisnis, dan investasi Anda."
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
