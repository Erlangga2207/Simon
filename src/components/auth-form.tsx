"use client";

import Link from "next/link";
import { ActionForm, Field, Input, SubmitButton } from "./ui";
import { login, register } from "@/actions/auth";

export function AuthCard({
  mode,
  title,
  subtitle,
  footer,
  notice,
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  notice?: string;
}) {
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
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mb-5 mt-1 text-xs text-muted-foreground">{subtitle}</p>
          {notice && (
            <p className="mb-4 rounded-lg bg-positive/10 px-3 py-2 text-xs font-medium text-positive">
              {notice}
            </p>
          )}
          <ActionForm action={mode === "login" ? login : register}>
            {mode === "register" && (
              <Field label="Nama lengkap">
                <Input name="name" placeholder="Nama Anda" autoComplete="name" required />
              </Field>
            )}
            <Field label="Email">
              <Input name="email" type="email" placeholder="nama@email.com" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input
                name="password"
                type="password"
                placeholder={mode === "register" ? "Minimal 8 karakter" : "Password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </Field>
            <SubmitButton className="w-full">
              {mode === "login" ? "Masuk" : "Daftar & Mulai"}
            </SubmitButton>
            {mode === "login" && (
              <p className="text-right text-xs">
                <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                  Lupa password?
                </Link>
              </p>
            )}
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
