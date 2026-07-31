"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ListingRow } from "@/components/listing/listing-cards";
import { Button } from "@/components/ui/button";
import { ListingCardSkeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatNumber } from "@/lib/format";
import { useFavorites } from "@/stores/favorites";
import type { CatalogItem, RentalOffer } from "@/types";

/**
 * Saved listings.
 *
 * The ids live in localStorage, so the server cannot render this screen — it
 * does not know what was saved until the browser tells it. Hence the fetch, and
 * hence the skeleton: it covers the first frame rather than flashing an empty
 * state at someone who has saved a dozen bikes.
 *
 * Resolved listings are cached by id, so removing a favourite is instant and
 * adding one only asks about the new id.
 */
export function FavoritesScreen({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const ids = useFavorites((state) => state.ids);
  const [known, setKnown] = useState<Record<string, CatalogItem>>({});
  const [offers, setOffers] = useState<Record<string, RentalOffer>>({});
  const [loaded, setLoaded] = useState(false);

  const key = ids.join(",");

  useEffect(() => {
    const wanted = key ? key.split(",") : [];
    const missing = wanted.filter((id) => !(id in known));

    if (missing.length === 0) {
      setLoaded(true);
      return;
    }

    const controller = new AbortController();
    fetch("/api/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: missing }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: CatalogItem[]; offers?: Record<string, RentalOffer> } | null) => {
        if (!data) return;
        // Merging by id, so replies arriving out of order cannot clobber each
        // other — each one only fills in the keys it was asked about.
        setKnown((current) => {
          const next = { ...current };
          for (const item of data.items ?? []) next[item.id] = item;
          return next;
        });
        setOffers((current) => ({ ...current, ...data.offers }));
      })
      .catch(() => {
        // Offline or aborted: whatever resolved earlier stays on screen.
      })
      .finally(() => setLoaded(true));

    return () => controller.abort();
    // `known` is deliberately not a dependency: it is what this effect writes,
    // and re-running on its own result would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!loaded) {
    return (
      <div className="space-y-2 px-4 py-3">
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </div>
    );
  }

  const items = ids.map((id) => known[id]).filter((item) => item !== undefined);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-6" strokeWidth={1.7} />}
        title={t("favorites.empty")}
        body={t("favorites.emptyBody")}
        action={
          <Button asChild>
            <Link href={`/${locale}/search`}>{t("favorites.browse")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <p className="text-muted-foreground px-0.5 pb-1 text-xs font-semibold">
        {t("favorites.count", { count: formatNumber(items.length, locale) })}
      </p>
      {items.map((item) => (
        <ListingRow
          key={item.id}
          item={item}
          locale={locale}
          messages={messages}
          href={`/${locale}/listing/${item.id}`}
          rentalOffer={item.kind === "vehicle" ? offers[item.id] : undefined}
        />
      ))}
    </div>
  );
}
