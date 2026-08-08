import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One figure.
 *
 * The number is the point, so it is the largest thing in the tile and nothing
 * competes with it. `hint` is for what the figure means, not for a second
 * figure — two numbers in one tile and neither gets read.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "plain",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  /** `attention` for a figure that is a to-do rather than a fact. */
  tone?: "plain" | "attention";
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        {icon}
      </div>
      <p
        className={cn(
          "font-display tabular mt-2 text-2xl leading-none font-extrabold",
          tone === "attention" && Number(value) > 0 && "text-primary",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-subtle-foreground mt-1.5 text-[0.6875rem]">{hint}</p>}
    </>
  );

  const className = cn(
    "bg-card border-border block rounded-xl border p-4",
    href && "transition-colors hover:border-primary/50",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
