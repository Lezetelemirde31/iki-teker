import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";

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
