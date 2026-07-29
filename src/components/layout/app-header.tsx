"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { HazardDivider } from "@/components/brand/hazard-divider";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Sticky screen header. `back` renders the platform-standard chevron and pops
 * history, matching the swipe-back gesture users expect on a phone.
 */
export function AppHeader({
  title,
  back,
  action,
  hazard,
  transparent,
  className,
}: {
  title?: ReactNode;
  back?: boolean;
  action?: ReactNode;
  /** The brand stripe — used on top-level screens, not on pushed detail views. */
  hazard?: boolean;
  transparent?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const t = useT();

  return (
    <header className={cn("z-40 shrink-0", transparent ? "bg-transparent" : "glass", className)}>
      <div className="flex h-12 items-center gap-1 px-2">
        {back && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("common.back")}
            className="text-foreground hover:bg-muted grid size-9 shrink-0 place-items-center rounded-full transition-colors active:scale-90"
          >
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </button>
        )}

        <div className={cn("min-w-0 flex-1", !back && "pl-2")}>
          {typeof title === "string" ? (
            <h1 className="font-display truncate text-base font-extrabold">{title}</h1>
          ) : (
            title
          )}
        </div>

        {action && <div className="flex shrink-0 items-center gap-1 pr-1">{action}</div>}
      </div>
      {hazard && <HazardDivider />}
    </header>
  );
}
