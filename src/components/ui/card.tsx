import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
