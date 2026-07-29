import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Section heading plus a horizontally snapping row — the home screen's primary
 * building block. The rail bleeds to the screen edges while the heading keeps
 * the page gutter, which is what makes it read as native rather than as a grid
 * that happens to overflow.
 */
export function Rail({
  title,
  hint,
  href,
  seeAllLabel,
  children,
  className,
}: {
  title: string;
  hint?: string;
  href?: string;
  seeAllLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2 className="font-display truncate text-lg leading-tight font-extrabold">{title}</h2>
          {hint && <p className="text-subtle-foreground mt-0.5 truncate text-xs">{hint}</p>}
        </div>
        {href && seeAllLabel && (
          <Link
            href={href}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-semibold transition-colors"
          >
            {seeAllLabel} →
          </Link>
        )}
      </div>

      <div className="no-scrollbar snap-rail flex gap-3 overflow-x-auto px-4 pb-1">{children}</div>
    </section>
  );
}
