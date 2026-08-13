"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Screen-to-screen transition. Keyed on the pathname so each navigation
 * remounts and replays: a short rise-and-fade that reads as a native push
 * without delaying interaction.
 *
 * A CSS animation rather than Framer Motion. This wraps every screen in the
 * app, so importing an animation library here put that library in the bundle
 * of every page — a hundred kilobytes of JavaScript a phone downloads and
 * parses before anything is interactive, to fade one element in. The two
 * places that genuinely need Framer — the onboarding carousel and the panel's
 * drawer — are routes of their own and load it only when opened.
 *
 * `prefers-reduced-motion` is honoured by the global override in globals.css.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      // flex-1 + min-h-0 rather than min-h-full: on every other screen this is
      // the only child, so flex-1 fills the frame exactly as min-h-full did.
      // On the listing screen it is not — a sticky contact bar follows it as a
      // sibling — and min-height:100% forced this to claim the whole frame
      // regardless, pushing that bar out past the bottom nav where nobody
      // could see or tap it. min-h-0 is what lets it actually give the
      // sibling room, the same fix already used on the frame one level up.
      className="page-enter flex min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}
