"use client";

import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * The panel's navigation on a phone.
 *
 * The sidebar is the only way between sections, and below `md` it is hidden —
 * which left anyone who opened moderation on their phone with no way to reach
 * anything else short of typing the address. The panel is used from a phone
 * more often than its desktop layout suggests: an approval is the kind of thing
 * somebody does while away from a desk.
 *
 * So the same navigation, in a drawer. It is the very same component the
 * sidebar renders, passed in from the server, rather than a second list that
 * would quietly fall out of step with the first.
 */
export function AdminDrawer({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tapping an entry navigates. Without this the drawer stays open over the
  // page it just opened, which reads as a link that did nothing.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while the drawer is over it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menyu"
        aria-expanded={open}
        className="hover:bg-muted -ml-1 grid size-9 place-items-center rounded-lg transition-colors md:hidden"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>

      {/* Opening is animated; closing is not. An exit animation means the
          drawer outlives the state that says it is shut, and a panel left over
          the page after it was dismissed is a worse fault than an abrupt
          close — particularly on the phone, where it covers the screen. */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
          >
            <button
              type="button"
              aria-label="Bağla"
              onClick={() => setOpen(false)}
              className="bg-foreground/40 absolute inset-0"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card border-border absolute inset-y-0 left-0 flex w-64 max-w-[82%] flex-col border-r shadow-xl"
            >
              <div className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <span className="bg-primary text-primary-foreground font-display grid size-7 place-items-center rounded-lg text-xs font-extrabold">
                  IT
                </span>
                <span className="font-display flex-1 text-sm font-extrabold">Idarəetmə</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Bağla"
                  className="hover:bg-muted -mr-1 grid size-8 place-items-center rounded-lg transition-colors"
                >
                  <X className="size-4" strokeWidth={2.4} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">{children}</div>

              <div className="border-border safe-bottom border-t p-3">{footer}</div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </>
  );
}
