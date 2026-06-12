import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";

const SESSION_COOKIE = "simon_session";
const WS_COOKIE = "simon_ws";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(WS_COOKIE);
}

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.uid as string) ?? null;
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return db.user.findUnique({ where: { id: uid } });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const jar = await cookies();
  jar.set(WS_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Resolve active workspace from cookie, validated against the user's memberships. */
export const getActiveContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return { user, membership: null, workspace: null, memberships };
  const jar = await cookies();
  const wsId = jar.get(WS_COOKIE)?.value;
  const active = memberships.find((m) => m.workspaceId === wsId) ?? memberships[0];
  return { user, membership: active, workspace: active.workspace, memberships };
});

const ROLE_LEVEL = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 } as const;
export type RoleName = keyof typeof ROLE_LEVEL;

export function roleAtLeast(role: RoleName, min: RoleName) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[min];
}

/** For server actions: ensure logged-in user has at least `min` role in active workspace. */
export async function requireWorkspace(min: RoleName = "VIEWER") {
  const ctx = await getActiveContext();
  if (!ctx || !ctx.user) redirect("/login");
  if (!ctx.membership || !ctx.workspace) redirect("/app/dashboard");
  if (!roleAtLeast(ctx.membership.role as RoleName, min)) {
    throw new Error("Anda tidak punya izin untuk aksi ini.");
  }
  return { user: ctx.user, workspace: ctx.workspace, role: ctx.membership.role as RoleName };
}

export async function logAudit(
  workspaceId: string,
  userId: string,
  userName: string,
  action: string,
  entity: string
) {
  try {
    await db.auditLog.create({ data: { workspaceId, userId, userName, action, entity } });
  } catch {
    // audit log must never break the main flow
  }
}

// --- Simple in-memory rate limiter for auth endpoints ---
const attempts = new Map<string, { count: number; reset: number }>();

export async function rateLimit(action: string, max = 10, windowMs = 60_000) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}
