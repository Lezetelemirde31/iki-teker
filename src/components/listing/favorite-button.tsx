"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "@/i18n/provider";
import { useFavorites } from "@/stores/favorites";
import { cn } from "@/lib/utils";

/**
 * Save toggle. The persisted store only resolves after hydration, so the
 * initial render is always the unsaved state — otherwise the server and client
 * markup disagree and React blows away the tree.
 */
export function FavoriteButton({
  id,
  size = "md",
  className,
}: {
  id: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useT();
  const toggle = useFavorites((state) => state.toggle);
  const saved = useFavorites((state) => state.ids.includes(id));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  const active = hydrated && saved;

  return (
    <button
      type="button"
      aria-label={t("common.favorite")}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(id);
      }}
      className={cn(
        "grid place-items-center rounded-full transition-transform active:scale-90",
        size === "sm" ? "size-8" : "size-9",
        className,
      )}
    >
      <Heart
        className={cn(
          "transition-colors",
          size === "sm" ? "size-4" : "size-5",
          active ? "fill-destructive text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
