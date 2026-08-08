import { BadgeCheck, MapPin, Star, Truck } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/common/category-icon";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatNumber, formatRating, localized } from "@/lib/format";
import type { Workshop } from "@/types";

/**
 * One workshop in the directory.
 *
 * The two badges are the only claims made here, and they are different kinds of
 * claim: `verified` is the platform vouching for a shop it has checked, and
 * `mobileService` is a fact about how the shop works. Neither is a rating — the
 * rating is its own number, next to the count that gives it weight, because
 * "4.9" from three people and "4.9" from ninety are not the same statement.
 */
export function WorkshopCard({
  workshop,
  locale,
  messages,
}: {
  workshop: Workshop;
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const cover = workshop.photos[0];

  return (
    <Link
      href={`/${locale}/services/${workshop.slug}`}
      className="bg-card border-border flex items-start gap-3 rounded-xl border p-3 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
    >
      <span className="bg-muted text-foreground grid size-12 shrink-0 place-items-center rounded-lg">
        {cover?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={workshop.name}
            className="size-full rounded-lg object-cover"
          />
        ) : (
          <CategoryIcon slug="services" className="size-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{workshop.name}</p>
          {workshop.verified && (
            <BadgeCheck className="text-rental size-3.5 shrink-0" strokeWidth={2.4} />
          )}
        </div>

        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          <Star className="fill-primary text-primary size-3.5 shrink-0" />
          {formatRating(workshop.rating, locale)}
          <span className="text-subtle-foreground truncate">
            · {t("services.reviews", { count: formatNumber(workshop.reviewsCount, locale) })}
          </span>
        </p>

        <p className="text-subtle-foreground mt-1 flex items-center gap-1 truncate text-[0.6875rem]">
          <MapPin className="size-3 shrink-0" />
          {localized(workshop.address, locale)}
        </p>

        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="muted" size="md">
            {t("services.hours", { open: workshop.hours.open, close: workshop.hours.close })}
          </Badge>
          {workshop.mobileService && (
            <Badge variant="rentalSoft" size="md">
              <Truck className="size-3" /> {t("services.mobileService")}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
