"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  rateLimit,
  requireUser,
  setActiveWorkspaceCookie,
  verifyPassword,
} from "@/lib/auth";
import { createWorkspaceWithDefaults } from "./workspace";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(60),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function register(formData: FormData) {
  if (!(await rateLimit("register", 5))) {
    return { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  }
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email sudah terdaftar. Silakan login." };

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  const ws = await createWorkspaceWithDefaults(user.id, `Keuangan ${name.split(" ")[0]}`, "PERSONAL", "IDR");
  await createSession(user.id);
  await setActiveWorkspaceCookie(ws.id);
  redirect("/app/dashboard");
}

export async function login(formData: FormData) {
  if (!(await rateLimit("login", 10))) {
    return { error: "Terlalu banyak percobaan login. Coba lagi sebentar lagi." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email atau password salah." };
  }
  await createSession(user.id);
  redirect("/app/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

const profileSchema = z.object({
  name: z.string().min(2).max(60),
  defaultCurrency: z.string().length(3),
  timezone: z.string().min(1).max(50),
});

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    defaultCurrency: formData.get("defaultCurrency"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { error: "Data profil tidak valid." };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/app", "layout");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "Password baru minimal 8 karakter." };
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: "Password saat ini salah." };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
}
