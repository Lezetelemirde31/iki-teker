import { cn } from "@/lib/utils";

/**
 * The yellow/black diagonal stripe that separates the app header from content.
 * It is the strongest brand signal in the source design, so it stays purely
 * decorative and never carries meaning.
 */
export function HazardDivider({ className }: { className?: string }) {
  return <div className={cn("hazard-stripe h-1 w-full shrink-0", className)} aria-hidden />;
}
