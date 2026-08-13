import { ListingCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * What a screen shows while the next one is being fetched.
 *
 * Every screen here reads the catalogue at request time, which from Baku is
 * roughly half a second on a good connection. Without this, that half second
 * is spent on the previous screen with nothing happening: the tap appears to
 * have done nothing, so people tap again, and the app is described — correctly
 * — as freezing.
 *
 * A skeleton also makes the router's prefetching worth something: for a
 * dynamically rendered route Next prefetches this shell, so the frame arrives
 * instantly and only the content waits.
 *
 * Deliberately generic. The two screens where the shape matters enough to be
 * worth its own file — search results and a listing — have one.
 */
export default function AppLoading() {
  return (
    <main className="web-page no-scrollbar flex-1 overflow-y-auto px-4 pt-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3.5 w-56" />

      <div className="mt-5 space-y-2.5">
        {Array.from({ length: 5 }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    </main>
  );
}
