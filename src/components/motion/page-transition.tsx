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
      className="flex min-h-full flex-col"
    >
      {children}
    </motion.div>
  );
}
