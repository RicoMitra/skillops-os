import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variant === "primary" && "bg-[var(--accent)] text-white shadow-[0_18px_38px_-24px_var(--accent)] hover:bg-[var(--accent-strong)]",
        variant === "secondary" && "border border-white/12 bg-white/[0.07] text-white shadow-[0_1px_0_rgb(255_255_255_/_0.10)_inset] hover:border-white/18 hover:bg-white/[0.11]",
        variant === "ghost" && "text-white/58 hover:bg-white/[0.07] hover:text-white",
        variant === "danger" && "border border-[var(--danger-soft)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger-bg-strong)]",
        className,
      )}
      {...props}
    />
  );
}
