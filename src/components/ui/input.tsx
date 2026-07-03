import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 text-sm text-[var(--paper)] shadow-[0_1px_0_rgb(255_255_255_/_0.08)_inset] transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
