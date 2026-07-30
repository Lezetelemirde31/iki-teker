import { Search, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HazardDivider } from "@/components/brand/hazard-divider";
import { Logo } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/common/category-icon";
import { Rail } from "@/components/common/rail";
import { LocalePicker } from "@/components/i18n/locale-picker";
import { CityPicker } from "@/components/layout/city-picker";
import { RailCard, RentalRailCard } from "@/components/listing/listing-cards";
import { PageTransition } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { MessageKey } from "@/i18n/types";
import { demoISODate } from "@/lib/demo-clock";
import { formatRating, localized } from "@/lib/format";
import { getHomeFeed } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { categories, cities } from "@/mocks";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const feed = getHomeFeed();
  const today = demoISODate(0);

  return (
    <PageTransition>
      <header className="glass z-40 shrink-0">
        <div className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-3">
          <Logo />
          <div className="flex shrink-0 items-center gap-1.5">
            <CityPicker cities={cities} />
            <LocalePicker />
          </div>
        </div>
        <HazardDivider />
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain pb-6">
        {/* Search entry — tapping opens the search screen, as on a native app. */}
        <div className="px-4 pt-4">
          <Link
            href={`/${locale}/search`}
            className="bg-card border-border text-subtle-foreground flex h-12 items-center gap-2.5 rounded-xl border px-3.5 text-sm shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
          >
            <Search className="size-4.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{t("home.searchPlaceholder")}</span>
          </Link>
        </div>

        {/* Seven vehicle sections plus a dedicated rental entry point. */}
        <nav className="mt-4 grid grid-cols-4 gap-2 px-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={
                category.slug === "rental"
                  ? `/${locale}/search?hasRental=true`
                  : `/${locale}/search?category=${category.slug}`
              }
              className="bg-card border-border flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 shadow-[var(--shadow-card)] transition-transform active:scale-95"
            >
              {/* The two motorised vehicle sections carry the green accent;
                  the service and rental entry points keep the brand yellow. */}
              <CategoryIcon
                slug={category.slug}
                className={cn(
                  "size-5",
                  category.slug === "motorcycles" || category.slug === "scooters"
                    ? "text-rental"
                    : category.slug === "rental" || category.slug === "services"
                      ? "text-primary"
                      : "text-foreground",
                )}
              />
              <span className="text-center text-[0.625rem] leading-tight font-medium">
                {t(category.labelKey as MessageKey)}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-7 space-y-7">
          {/* Rental sits above the for-sale listings — the platform's priority. */}
          <Rail
            title={t("home.availableToRent")}
            hint={t("home.availableToRentHint")}
            href={`/${locale}/search?hasRental=true`}
            seeAllLabel={t("common.all")}
          >
            {feed.rentals.map(({ listing, offer }) => (
              <RentalRailCard
                key={offer.id}
                listing={listing}
                offer={offer}
                locale={locale}
                messages={messages}
                today={today}
                href={`/${locale}/listing/${listing.id}`}
              />
            ))}
          </Rail>

          <Rail
            title={t("home.vip")}
            href={`/${locale}/search?vipOnly=true`}
            seeAllLabel={t("common.all")}
          >
            {feed.vip.map((listing) => (
              <RailCard
                key={listing.id}
                item={listing}
                locale={locale}
                href={`/${locale}/listing/${listing.id}`}
              />
            ))}
          </Rail>

          <Rail title={t("home.fresh")} href={`/${locale}/search`} seeAllLabel={t("common.all")}>
            {feed.fresh.map((listing) => (
              <RailCard
                key={listing.id}
                item={listing}
                locale={locale}
                href={`/${locale}/listing/${listing.id}`}
              />
            ))}
          </Rail>

          <Rail
            title={t("home.parts")}
            href={`/${locale}/search?category=parts`}
            seeAllLabel={t("common.all")}
          >
            {feed.parts.map((part) => (
              <RailCard
                key={part.id}
                item={part}
                locale={locale}
                href={`/${locale}/listing/${part.id}`}
              />
            ))}
          </Rail>

          {/* Workshops — the directory entry, with paid placement marked. */}
          <section className="space-y-3">
            <h2 className="font-display px-4 text-lg leading-tight font-extrabold">
              {t("home.workshops")}
            </h2>
            <div className="space-y-2 px-4">
              {feed.workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 shadow-[var(--shadow-card)]"
                >
                  <span className="bg-muted text-foreground grid size-11 shrink-0 place-items-center rounded-lg">
                    <CategoryIcon slug="services" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{workshop.name}</p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <Star className="fill-primary text-primary size-3" />
                      {formatRating(workshop.rating, locale)}
                      <span className="text-subtle-foreground">· {workshop.distanceKm} km</span>
                    </p>
                    <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                      {localized(workshop.summary, locale)}
                    </p>
                  </div>
                  {workshop.promoted && <Badge variant="warning">★</Badge>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
