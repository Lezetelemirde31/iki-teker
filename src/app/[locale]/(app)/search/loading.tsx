import { ListingCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * The search screen while its results are being fetched.
 *
 * Shaped like the real thing — a filter bar, then rows in the same one, two
 * and three column arrangement — so nothing jumps when the results land.
 */
export default function SearchLoading() {
  return (
    <>
      <div className="border-border bg-card app-only border-b px-4 py-2.5">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>

      <main className="web-page no-scrollbar flex-1 overflow-y-auto">
        <div className="space-y-2 px-4 py-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <ListingCardSkeleton key={index} />
          ))}
        </div>
      </main>
    </>
  );
}
