import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[26px] border border-[var(--line)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
