import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Rendered per request rather than prerendered at build.
 *
 * These screens read the catalogue, and the data source is decided from the
 * environment at runtime. Prerendering would bake whichever source was active
 * during the build into the HTML — so attaching a database would change
 * nothing until the next deploy, and the pages would quietly keep serving
 * build-time data. Server rendering is still fully indexable; only the caching
 * changes.
 */
export const dynamic = "force-dynamic";

/**
 * Shell for the tabbed part of the app.
 *
 * A flex column — screen content scrolls in its own region while the tab bar
 * stays pinned as a sibling, never `position: fixed`. That keeps behaviour
 * identical on a phone and inside the desktop device frame.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <BottomNav />
    </>
  );
}
