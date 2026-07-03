import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variant === "primary" && "bg-[var(--accent)] text-[var(--paper)] shadow-[0_16px_32px_-22px_var(--accent)] hover:bg-[var(--accent-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-[var(--surface-elevated)] text-[var(--ink)] shadow-[0_1px_0_oklch(1_0_0_/_0.7)_inset] hover:border-[var(--accent-soft)] hover:bg-[var(--surface)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface-warm)] hover:text-[var(--ink)]",
        variant === "danger" && "border border-[var(--danger-soft)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger-bg-strong)]",
        className,
      )}
      {...props}
    />
  );
}
