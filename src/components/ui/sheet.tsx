"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";

/**
 * Bottom sheet — the native pattern for filters and pickers on mobile.
 * Drag-to-dismiss, a grab handle, and a scrollable body that stops the page
 * behind it from scrolling.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  action,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional trailing control in the header, e.g. a Reset link. */
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="absolute inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "bg-card absolute inset-x-0 bottom-0 z-50 flex max-h-[88%] flex-col rounded-t-[1.75rem]",
            "shadow-[var(--shadow-sheet)] outline-none",
          )}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="bg-border h-1 w-9 rounded-full" />
          </div>

          <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1 pb-3">
            <Drawer.Title className="font-display text-lg font-extrabold">{title}</Drawer.Title>
            <div className="flex items-center gap-1">
              {action}
              <Drawer.Close
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground hover:bg-muted grid size-8 place-items-center rounded-full transition-colors"
              >
                <X className="size-4" strokeWidth={2.4} />
              </Drawer.Close>
            </div>
          </header>

          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>

          {footer && (
            <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
