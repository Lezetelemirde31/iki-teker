import { Skeleton } from "@/components/ui/skeleton";

/**
 * A listing while it is being fetched.
 *
 * The photo comes first and is most of the screen, so that is what the
 * placeholder is: anything else would rearrange itself the moment the real
 * page arrives.
 */
export default function ListingLoading() {
  return (
    <main className="web-page no-scrollbar flex-1 overflow-y-auto">
      <Skeleton className="aspect-[4/3] w-full rounded-none md:mt-4 md:rounded-xl" />

      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-3.5 w-1/2" />

        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>

        <div className="space-y-2 pt-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
    </main>
  );
}
