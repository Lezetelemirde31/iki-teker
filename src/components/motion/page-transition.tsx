"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Screen-to-screen transition. Keyed on the pathname so each navigation
 * remounts and replays: a short rise-and-fade that reads as a native push
 * without delaying interaction. Framer Motion honours `prefers-reduced-motion`
 * through the global CSS override.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      // flex-1 + min-h-0 rather than min-h-full: on every other screen this is
      // the only child, so flex-1 fills the frame exactly as min-h-full did.
      // On the listing screen it is not — a sticky contact bar follows it as a
      // sibling — and min-height:100% forced this to claim the whole frame
      // regardless, pushing that bar out past the bottom nav where nobody
      // could see or tap it. min-h-0 is what lets it actually give the
      // sibling room, the same fix already used on the frame one level up.
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
