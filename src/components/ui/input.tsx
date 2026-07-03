import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] shadow-[0_1px_0_oklch(1_0_0_/_0.8)_inset] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
