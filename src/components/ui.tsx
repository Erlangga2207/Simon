"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

/* ---------- Button ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border border-border bg-card hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "bg-negative text-white hover:opacity-90",
        className
      )}
      {...props}
    />
  );
});

export function SubmitButton({ children, className, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

/* ---------- Form fields ---------- */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
          className
        )}
        {...props}
      />
    );
  }
);

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ---------- Card ---------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  className,
  color,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        !color && "bg-muted text-muted-foreground",
        className
      )}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
      {...props}
    />
  );
}

/* ---------- Money ---------- */
export function Money({
  amount,
  currency = "IDR",
  signed = false,
  className,
}: {
  amount: number;
  currency?: string;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        signed && amount > 0 && "text-positive",
        signed && amount < 0 && "text-negative",
        className
      )}
    >
      {signed && amount > 0 ? "+" : ""}
      {formatCurrency(amount, currency)}
    </span>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  trigger,
  title,
  children,
  wide,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            className={cn(
              "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-md"
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Form hapus dengan konfirmasi ---------- */
export function ConfirmForm({
  action,
  message = "Hapus data ini? Tindakan tidak bisa dibatalkan.",
  children,
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  message?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

/* ---------- Form wrapper untuk server action + auto close modal ---------- */
export function ActionForm({
  action,
  close,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  close?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={cn("space-y-3", className)}
      action={async (fd) => {
        setError(null);
        const res = await action(fd);
        if (res?.error) setError(res.error);
        else close?.();
      }}
    >
      {error && (
        <p className="rounded-lg bg-negative/10 px-3 py-2 text-xs font-medium text-negative">{error}</p>
      )}
      {children}
    </form>
  );
}
