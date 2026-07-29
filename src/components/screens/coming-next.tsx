import { Hammer } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";

/**
 * Stand-in for screens delivered in the next module. It exists so no tab or
 * link in the demo ever dead-ends into a 404 — a broken route reads as a bug,
 * an honest placeholder reads as a roadmap.
 */
export function ComingNext({ title, note }: { title: string; note: string }) {
  return (
    <PageTransition>
      <AppHeader title={title} hazard />
      <main className="flex flex-1 items-center justify-center overflow-y-auto">
        <EmptyState
          icon={<Hammer className="size-6" strokeWidth={1.7} />}
          title={title}
          body={note}
        />
      </main>
    </PageTransition>
  );
}
