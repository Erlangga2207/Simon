"use server";

import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { createWorkspaceWithDefaults } from "./workspace";

const RESET_TTL = 60 * 60 * 1000; // 1 jam
const VERIFY_TTL = 24 * 60 * 60 * 1000; // 24 jam

async function createAuthToken(userId: string, type: "RESET" | "VERIFY", ttlMs: number) {
  const token = randomBytes(24).toString("hex");
  await db.authToken.create({
    data: { userId, type, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

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
  // Kirim email verifikasi — kegagalan email tidak boleh menggagalkan registrasi.
  try {
    const token = await createAuthToken(user.id, "VERIFY", VERIFY_TTL);
    await sendVerificationEmail(email, token);
  } catch (e) {
    console.error("[register] Gagal mengirim email verifikasi:", e);
  }
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

const AVATAR_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    defaultCurrency: formData.get("defaultCurrency"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { error: "Data profil tidak valid." };

  const data: { name: string; defaultCurrency: string; timezone: string; avatar?: string } = parsed.data;

  // Foto profil opsional: simpan ke public/avatars/<userId>.<ext>, path-nya disimpan di User.avatar.
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const ext = AVATAR_EXT[file.type];
    if (!ext) return { error: "Foto harus berformat JPG, PNG, atau WEBP." };
    if (file.size > 2 * 1024 * 1024) return { error: "Ukuran foto maksimal 2 MB." };
    try {
      const dir = path.join(process.cwd(), "public", "avatars");
      await mkdir(dir, { recursive: true });
      const filename = `${user.id}.${ext}`;
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
      data.avatar = `/avatars/${filename}?v=${Date.now()}`; // query mencegah cache lama
    } catch (e) {
      console.error("[profile] Gagal menyimpan foto:", e);
      return { error: "Gagal menyimpan foto. Coba lagi." };
    }
  }

  await db.user.update({ where: { id: user.id }, data });
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

/* =================== Reset password & verifikasi email =================== */

export async function requestPasswordReset(formData: FormData) {
  if (!(await rateLimit("reset", 5))) {
    return { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." };
  }
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Email tidak valid." };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user) {
    const token = await createAuthToken(user.id, "RESET", RESET_TTL);
    await sendPasswordResetEmail(user.email, token);
  }
  // Pesan selalu sama agar alamat email terdaftar tidak bisa ditebak.
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData) {
  if (!(await rateLimit("reset-confirm", 10))) {
    return { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  }
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password baru minimal 8 karakter." };

  const record = await db.authToken.findUnique({ where: { token }, include: { user: true } });
  if (!record || record.type !== "RESET" || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru." };
  }
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  redirect("/login?reset=1");
}

/** Kirim ulang email verifikasi untuk user yang sedang login. */
export async function resendVerification() {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { error: "Email Anda sudah terverifikasi." };
  if (!(await rateLimit("verify-resend", 3))) {
    return { error: "Terlalu sering. Coba lagi sebentar lagi." };
  }
  const token = await createAuthToken(user.id, "VERIFY", VERIFY_TTL);
  await sendVerificationEmail(user.email, token);
  revalidatePath("/app", "layout");
}
