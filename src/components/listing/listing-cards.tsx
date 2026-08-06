import Link from "next/link";

import { VehicleArt, type ArtShape } from "@/components/common/vehicle-art";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatDate, formatMileage, formatPrice, localized } from "@/lib/format";
import { getUser, locationOf, placeLabel } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { CatalogItem, Listing, RentalOffer } from "@/types";

/** Spec chips under a title: displacement, mileage, range — whatever the category exposes. */
function specLine(item: CatalogItem, locale: Locale) {
  const parts: string[] = [];
  const { engineCc, mileage, range, motorPower, frameSize } = item.attributes;

  if (typeof engineCc === "number") parts.push(`${engineCc} cm³`);
  if (typeof range === "number") parts.push(`${range} km`);
  if (typeof motorPower === "number") parts.push(`${motorPower} W`);
  if (typeof frameSize === "string") parts.push(frameSize.toUpperCase());
  if (typeof mileage === "number" && mileage > 0) parts.push(formatMileage(mileage, locale));

  return parts.slice(0, 3).join(" · ");
}

function shapeOf(item: CatalogItem): ArtShape {
  return item.kind === "vehicle" ? item.category : item.category;
}

/* -------------------------------------------------------------------------- */
/*  Horizontal rail card                                                       */
/* -------------------------------------------------------------------------- */

export function RailCard({
  item,
  locale,
  href,
}: {
  item: CatalogItem;
  locale: Locale;
  href: string;
}) {
  const cover = item.photos[0];

  return (
    <Link
      href={href}
      // Sized as a share of the viewport so two cards always land fully on
      // screen with the third peeking in, on a 360px Android and a 430px iPhone
      // alike. A fixed width only ever fits one device.
      className="bg-card border-border w-[41%] max-w-44 shrink-0 overflow-hidden rounded-xl border shadow-[var(--shadow-card)] transition-transform active:scale-[0.97]"
    >
      <div className="relative">
        {cover && (
          <VehicleArt
            src={cover.url}
            seed={cover.seed}
            tone={cover.tone}
            shape={shapeOf(item)}
            rounded="rounded-none"
            className="h-24 w-full"
          />
        )}
        {item.promotion.vip && (
          <Badge variant="vip" className="absolute top-2 left-2">
            VIP
          </Badge>
        )}
        <FavoriteButton
          id={item.id}
          size="sm"
          className="glass absolute top-1.5 right-1.5 rounded-full"
        />
      </div>

      <div className="space-y-1 p-2.5">
        <p className="truncate text-xs font-semibold">{item.title}</p>
        <p className="font-display tabular text-base leading-none font-extrabold">
          {formatPrice(item.price, locale)}
        </p>
        <p className="text-subtle-foreground truncate text-[0.625rem]">
          {localized(placeLabel(item), locale)}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Rental rail card                                                           */
/* -------------------------------------------------------------------------- */

export function RentalRailCard({
  listing,
  offer,
  locale,
  messages,
  href,
  today,
}: {
  listing: Listing;
  offer: RentalOffer;
  locale: Locale;
  messages: Messages;
  href: string;
  today: string;
}) {
  const t = createTranslator(messages);
  const cover = listing.photos[0];
  const free = offer.availableFrom <= today;

  return (
    <Link
      href={href}
      className="bg-card border-border w-[43%] max-w-48 shrink-0 overflow-hidden rounded-xl border shadow-[var(--shadow-card)] transition-transform active:scale-[0.97]"
    >
      <div className="relative">
        {cover && (
          <VehicleArt
            src={cover.url}
            seed={cover.seed}
            tone={cover.tone}
            shape={listing.category}
            rounded="rounded-none"
            className="h-24 w-full"
          />
        )}
        <Badge variant={free ? "rental" : "ink"} className="absolute top-2 left-2">
          {free
            ? t("common.today")
            : t("home.availableFrom", { date: formatDate(offer.availableFrom, locale, "dayMonth") })}
        </Badge>
      </div>

      <div className="space-y-1 p-2.5">
        <p className="truncate text-xs font-semibold">{listing.title}</p>
        <p className="flex items-baseline gap-1">
          <span className="font-display tabular text-base leading-none font-extrabold">
            {formatPrice(offer.rates.day, locale)}
          </span>
          <span className="text-subtle-foreground text-[0.625rem]">{t("common.perDay")}</span>
        </p>
        <p className="text-subtle-foreground truncate text-[0.625rem]">
          {localized(placeLabel(listing), locale)} · {t("common.deposit")}{" "}
          {formatPrice(offer.deposit, locale)}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vertical list row — search results                                         */
/* -------------------------------------------------------------------------- */

export function ListingRow({
  item,
  locale,
  messages,
  href,
  rentalOffer,
}: {
  item: CatalogItem;
  locale: Locale;
  messages: Messages;
  href: string;
  rentalOffer?: RentalOffer;
}) {
  const t = createTranslator(messages);
  const cover = item.photos[0];
  const place = locationOf(item);
  const specs = specLine(item, locale);
  // Whether you are buying from a dealer or a private owner changes how you
  // read the listing, so the source design puts it on the card.
  const sellerKind = getUser(item.sellerId)?.kind;

  return (
    <Link
      href={href}
      className="bg-card border-border relative flex gap-3 rounded-xl border p-2.5 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
    >
      <div className="relative shrink-0">
        {cover && (
          <VehicleArt
            src={cover.url}
            seed={cover.seed}
            tone={cover.tone}
            shape={shapeOf(item)}
            className="size-24"
          />
        )}
        {item.promotion.vip && (
          <Badge variant="vip" className="absolute top-1.5 left-1.5">
            VIP
          </Badge>
        )}
        {!item.promotion.vip && rentalOffer && (
          <Badge variant="rental" className="absolute top-1.5 left-1.5">
            {t("categories.rental")}
          </Badge>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5 pr-8">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <p className="font-display tabular mt-0.5 text-lg leading-none font-extrabold">
          {formatPrice(item.price, locale)}
        </p>
        {specs && <p className="text-muted-foreground mt-1.5 truncate text-xs">{specs}</p>}
        <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
          {localized(place.city?.name, locale)}
          {place.district && ` · ${localized(place.district.name, locale)}`}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {rentalOffer && (
            <Badge variant="rentalSoft">
              {formatPrice(rentalOffer.rates.day, locale)} {t("common.perDay")}
            </Badge>
          )}
          {sellerKind && (
            <Badge variant="outline">
              {sellerKind === "shop"
                ? t("listing.shop")
                : sellerKind === "rental"
                  ? t("listing.rentalCompany")
                  : t("listing.private")}
            </Badge>
          )}
          {item.negotiable && <Badge variant="outline">{t("listing.negotiable")}</Badge>}
          {item.delivery && <Badge variant="outline">{t("listing.delivery")}</Badge>}
        </div>
      </div>

      <FavoriteButton id={item.id} className="absolute top-1.5 right-1.5" />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compact grid tile — favorites, seller profile                              */
/* -------------------------------------------------------------------------- */

export function ListingTile({
  item,
  locale,
  href,
  className,
}: {
  item: CatalogItem;
  locale: Locale;
  href: string;
  className?: string;
}) {
  const cover = item.photos[0];

  return (
    <Link
      href={href}
      className={cn(
        "bg-card border-border overflow-hidden rounded-xl border shadow-[var(--shadow-card)] transition-transform active:scale-[0.97]",
        className,
      )}
    >
      <div className="relative">
        {cover && (
          <VehicleArt
            src={cover.url}
            seed={cover.seed}
            tone={cover.tone}
            shape={shapeOf(item)}
            rounded="rounded-none"
            className="h-24 w-full"
          />
        )}
        {item.promotion.vip && (
          <Badge variant="vip" className="absolute top-1.5 left-1.5">
            VIP
          </Badge>
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <p className="truncate text-[0.6875rem] font-semibold">{item.title}</p>
        <p className="font-display tabular text-sm font-extrabold">
          {formatPrice(item.price, locale)}
        </p>
      </div>
    </Link>
  );
}
