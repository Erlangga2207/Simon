import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthCard } from "@/components/auth-form";

export const metadata = { title: "Daftar" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app/dashboard");
  return (
    <AuthCard
      mode="register"
      title="Buat Akun Simon"
      subtitle="Gratis selamanya — langsung dapat workspace pribadi."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </>
      }
    />
  );
}
