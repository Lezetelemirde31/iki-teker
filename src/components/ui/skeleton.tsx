import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded-md", className)} />;
}

/** Placeholder matching the shape of a search result row. */
export function ListingCardSkeleton() {
  return (
    <div className="bg-card border-border flex gap-3 rounded-lg border p-3">
      <Skeleton className="size-24 shrink-0 rounded-md" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Placeholder matching a horizontal rail card. */
export function RailCardSkeleton() {
  return (
    <div className="bg-card border-border w-44 shrink-0 space-y-2 rounded-lg border p-2.5">
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
