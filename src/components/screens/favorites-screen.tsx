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
import { getCatalogItem, getOfferForListing } from "@/lib/queries";
import { useFavorites } from "@/stores/favorites";

/**
 * Saved listings.
 *
 * The store is persisted to localStorage, so nothing is known until after
 * hydration — the skeleton covers that first frame rather than flashing an
 * empty state at someone who has saved a dozen bikes.
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="space-y-2 px-4 py-3">
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </div>
    );
  }

  const items = ids.map((id) => getCatalogItem(id)).filter((item) => item !== undefined);

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
          rentalOffer={
            item.kind === "vehicle" && item.rentalOfferId
              ? getOfferForListing(item.id)
              : undefined
          }
        />
      ))}
    </div>
  );
}
