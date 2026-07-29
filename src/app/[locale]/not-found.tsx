import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Locale-scoped 404. It cannot read the route params (Next renders it outside
 * the segment), so the copy stays in English and the action returns to the
 * locale-negotiating root rather than guessing a language.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<SearchX className="size-6" strokeWidth={1.7} />}
        title="Page not found"
        body="This listing may have been sold, rented out, or taken down by a moderator."
        action={
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
    </main>
  );
}
