"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit, requireUser, requireWorkspace, setActiveWorkspaceCookie } from "@/lib/auth";

const inviteSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function createInvitation(formData: FormData) {
  const { user, workspace, role } = await requireWorkspace("ADMIN");
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.role === "ADMIN" && role !== "OWNER") {
    return { error: "Hanya Owner yang bisa mengundang Admin." };
  }
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    const member = await db.membership.findUnique({
      where: { userId_workspaceId: { userId: existing.id, workspaceId: workspace.id } },
    });
    if (member) return { error: "Pengguna itu sudah menjadi anggota." };
  }
  const token = randomBytes(24).toString("hex");
  await db.invitation.create({
    data: {
      workspaceId: workspace.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await logAudit(workspace.id, user.id, user.name, "mengundang", parsed.data.email);
  revalidatePath("/app/team");
}

export async function revokeInvitation(formData: FormData) {
  const { workspace } = await requireWorkspace("ADMIN");
  const id = String(formData.get("id"));
  await db.invitation.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/team");
}

export async function acceptInvitation(token: string) {
  const user = await requireUser();
  const invite = await db.invitation.findUnique({ where: { token }, include: { workspace: true } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { error: "Undangan tidak valid atau sudah kedaluwarsa." };
  }
  const existing = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
  });
  if (!existing) {
    await db.membership.create({
      data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
    });
    await logAudit(invite.workspaceId, user.id, user.name, "bergabung", `sebagai ${invite.role}`);
  }
  await db.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await setActiveWorkspaceCookie(invite.workspaceId);
  redirect("/app/dashboard");
}

export async function changeMemberRole(formData: FormData) {
  const { user, workspace } = await requireWorkspace("OWNER");
  const membershipId = String(formData.get("membershipId"));
  const role = String(formData.get("role"));
  if (!["ADMIN", "MEMBER", "VIEWER"].includes(role)) return { error: "Peran tidak valid." };
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id },
    include: { user: true },
  });
  if (!member) return { error: "Anggota tidak ditemukan." };
  if (member.role === "OWNER") return { error: "Peran Owner tidak bisa diubah." };
  await db.membership.update({ where: { id: membershipId }, data: { role: role as never } });
  await logAudit(workspace.id, user.id, user.name, "mengubah peran", `${member.user.name} → ${role}`);
  revalidatePath("/app/team");
}

export async function removeMember(formData: FormData) {
  const { user, workspace } = await requireWorkspace("ADMIN");
  const membershipId = String(formData.get("membershipId"));
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id },
    include: { user: true },
  });
  if (!member) return { error: "Anggota tidak ditemukan." };
  if (member.role === "OWNER") return { error: "Owner tidak bisa dikeluarkan." };
  await db.membership.delete({ where: { id: membershipId } });
  await logAudit(workspace.id, user.id, user.name, "mengeluarkan", member.user.name);
  revalidatePath("/app/team");
}
