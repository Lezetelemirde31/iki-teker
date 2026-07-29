"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Selectable pill used for filter rows and category switches. Renders as a
 * button with `aria-pressed` so screen readers announce the toggle state.
 */
export function Chip({
  selected,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors active:scale-[0.97]",
        selected
          ? "bg-secondary text-secondary-foreground"
          : "bg-card border-border text-muted-foreground hover:text-foreground border",
        className,
      )}
      {...props}
    />
  );
}
