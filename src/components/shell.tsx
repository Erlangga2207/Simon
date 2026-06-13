"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight,
  Briefcase,
  Building2,
  ChartPie,
  Check,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Moon,
  Newspaper,
  Plus,
  Settings,
  Sun,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionForm, Button, Field, Input, Modal, Select, SubmitButton } from "./ui";
import { createWorkspace, switchWorkspace } from "@/actions/workspace";
import { logout } from "@/actions/auth";

type WsInfo = { id: string; name: string; type: "PERSONAL" | "BUSINESS" | "INVESTMENT" };

const WS_TYPE_LABEL = { PERSONAL: "Pribadi", BUSINESS: "Bisnis", INVESTMENT: "Investasi" } as const;
const WS_TYPE_ICON = { PERSONAL: User, BUSINESS: Building2, INVESTMENT: LineChart } as const;

function navItems(type: WsInfo["type"]) {
  const items = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/transactions", label: "Transaksi", icon: ArrowLeftRight },
    { href: "/app/wallets", label: "Dompet", icon: Wallet },
  ];
  if (type === "BUSINESS") items.push({ href: "/app/business", label: "Bisnis", icon: Briefcase });
  if (type === "INVESTMENT") items.push({ href: "/app/investment", label: "Investasi", icon: ChartPie });
  items.push(
    { href: "/app/reports", label: "Laporan", icon: FileText },
    { href: "/app/news", label: "Berita", icon: Newspaper },
    { href: "/app/team", label: "Tim", icon: Users },
    { href: "/app/settings", label: "Pengaturan", icon: Settings }
  );
  return items;
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Abaikan klik di dalam modal yang di-portal ke <body> (bukan turunan DOM dropdown ini),
      // agar membuka/mengisi modal tidak menutup dropdown & meng-unmount modal-nya.
      if (target?.closest("[role='dialog']")) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

function WorkspaceSwitcher({ current, all }: { current: WsInfo; all: WsInfo[] }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useClickOutside(() => setOpen(false));
  const Icon = WS_TYPE_ICON[current.type];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[180px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted sm:max-w-[240px]"
        aria-label="Ganti workspace"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{current.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          {all.map((ws) => {
            const WsIcon = WS_TYPE_ICON[ws.type];
            return (
              <button
                key={ws.id}
                onClick={() => {
                  setOpen(false);
                  startTransition(() => {
                    void switchWorkspace(ws.id);
                  });
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <WsIcon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground">{WS_TYPE_LABEL[ws.type]}</span>
                {ws.id === current.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
          <div className="mt-1 border-t border-border pt-1">
            <Modal
              title="Workspace Baru"
              trigger={
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary hover:bg-muted">
                  <Plus className="h-4 w-4" /> Workspace baru
                </button>
              }
            >
              {(close) => (
                <ActionForm action={createWorkspace} close={close}>
                  <Field label="Nama workspace">
                    <Input name="name" placeholder="cth. Toko Berkah" required />
                  </Field>
                  <Field label="Tipe">
                    <Select name="type" defaultValue="PERSONAL">
                      <option value="PERSONAL">Pribadi — catatan harian</option>
                      <option value="BUSINESS">Bisnis — laba usaha/UMKM</option>
                      <option value="INVESTMENT">Investasi — portofolio saham/kripto</option>
                    </Select>
                  </Field>
                  <Field label="Mata uang dasar">
                    <Select name="baseCurrency" defaultValue="IDR">
                      {["IDR", "USD", "EUR", "SGD", "JPY", "MYR"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <SubmitButton className="w-full">Buat Workspace</SubmitButton>
                </ActionForm>
              )}
            </Modal>
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
      aria-label="Ganti tema"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function UserMenu({ name, email, avatar }: { name: string; email: string; avatar?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        aria-label="Menu profil"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
          <div className="border-b border-border px-2 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <Link
            href="/app/settings"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted"
          >
            <Settings className="h-4 w-4 text-muted-foreground" /> Pengaturan
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-negative hover:bg-muted">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AppShell({
  user,
  workspace,
  workspaces,
  children,
}: {
  user: { name: string; email: string; avatar?: string | null };
  workspace: WsInfo;
  workspaces: WsInfo[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = navItems(workspace.type);

  // Bottom nav mobile: 4 menu utama + tombol "Lainnya".
  // Sisanya (Berita, Tim, Pengaturan, dan Bisnis/Investasi) masuk ke drawer.
  const PRIMARY_MOBILE = ["/app/dashboard", "/app/transactions", "/app/wallets", "/app/reports"];
  const primaryItems = PRIMARY_MOBILE.map((href) => items.find((i) => i.href === href)).filter(
    (i): i is (typeof items)[number] => Boolean(i)
  );
  const moreItems = items.filter((i) => !PRIMARY_MOBILE.includes(i.href));
  const moreActive = moreItems.some((i) => pathname.startsWith(i.href));

  const [moreOpen, setMoreOpen] = useState(false);
  // Tutup drawer saat pindah halaman.
  useEffect(() => setMoreOpen(false), [pathname]);
  // Kunci scroll & dukung Escape selama drawer terbuka.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">S</span>
          <span className="text-lg font-bold tracking-tight">Simon</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="px-5 py-4 text-[11px] text-muted-foreground">Simon v1.0 — gratis selamanya</p>
      </aside>

      {/* Header */}
      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur lg:pl-64">
        <Link href="/" className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground lg:hidden">
          S
        </Link>
        <WorkspaceSwitcher current={workspace} all={workspaces} />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} avatar={user.avatar} />
        </div>
      </header>

      {/* Konten */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pl-[17rem] print:p-0 print:lg:pl-0">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card lg:hidden">
        {primaryItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
              pathname.startsWith(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Menu lainnya"
          aria-expanded={moreOpen}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="h-5 w-5" />
          Lainnya
        </button>
      </nav>

      {/* Drawer "Lainnya" — menu yang tidak muat di bottom nav */}
      {moreOpen && (
        <div
          className="no-print fixed inset-0 z-40 flex items-end bg-black/50 lg:hidden"
          onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Menu Lainnya</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {moreItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
