import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { getActiveContext } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");
  if (!ctx.workspace || !ctx.membership) redirect("/login");

  return (
    <AppShell
      user={{ name: ctx.user.name, email: ctx.user.email, avatar: ctx.user.avatar }}
      workspace={{ id: ctx.workspace.id, name: ctx.workspace.name, type: ctx.workspace.type }}
      workspaces={ctx.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        type: m.workspace.type,
      }))}
    >
      {children}
    </AppShell>
  );
}
