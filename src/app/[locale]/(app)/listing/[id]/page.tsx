import { BadgeCheck, ChevronRight, KeyRound, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Rail } from "@/components/common/rail";
import { AppHeader } from "@/components/layout/app-header";
import { ContactActions } from "@/components/listing/contact-actions";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { ListingGallery } from "@/components/listing/listing-gallery";
import { RailCard } from "@/components/listing/listing-cards";
import { SpecTable } from "@/components/listing/spec-table";
import { PageTransition } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { demoISODate } from "@/lib/demo-clock";
import {
  formatDate,
  formatMembership,
  formatNumber,
  formatPrice,
  formatRating,
  formatResponseTime,
  localized,
} from "@/lib/format";
import {
  getCatalogItem,
  getOfferForListing,
  getUser,
  locationOf,
  similarListings,
} from "@/lib/queries";
import { conditionLabels } from "@/mocks/taxonomy";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const item = getCatalogItem(id);
  if (!item) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const seller = getUser(item.sellerId);
  const place = locationOf(item);
  const offer = item.kind === "vehicle" ? getOfferForListing(item.id) : undefined;
  const similar = item.kind === "vehicle" ? similarListings(item) : [];
  const today = demoISODate(0);

  const extraRows = [
    ...(item.kind === "vehicle"
      ? [
          { label: t("search.year"), value: String(item.year) },
          {
            label: t("listing.customsCleared"),
            value: item.customsCleared ? "✓" : "—",
          },
        ]
      : []),
    { label: t("search.condition"), value: localized(conditionLabels[item.condition], locale) },
  ];

  return (
    <>
      <PageTransition>
        <AppHeader
          back
          action={<FavoriteButton id={item.id} />}
          title={<span className="sr-only">{item.title}</span>}
        />

        <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
          <ListingGallery
            photos={item.photos}
            shape={item.category}
            vip={item.promotion.vip}
            badge={offer && offer.availableFrom <= today ? t("common.today") : undefined}
          />

          <div className="space-y-6 px-4 pt-4 pb-6">
            <section>
              <h1 className="font-display text-[1.375rem] leading-tight font-extrabold">
                {item.kind === "part" ? localized(item.localizedTitle, locale) : item.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-display tabular text-[1.75rem] leading-none font-extrabold">
                  {formatPrice(item.price, locale)}
                </span>
                {item.negotiable && <Badge variant="muted">{t("listing.negotiable")}</Badge>}
                {item.delivery && <Badge variant="outline">{t("listing.delivery")}</Badge>}
              </div>

              <p className="text-muted-foreground mt-2 text-xs">
                {localized(place.city?.name, locale)}
                {place.district && `, ${localized(place.district.name, locale)}`} ·{" "}
                {t("listing.published", { date: formatDate(item.publishedAt, locale, "medium") })} ·{" "}
                {t("listing.views", { count: formatNumber(item.stats.views, locale) })}
              </p>
            </section>

            {/* Rental cross-sell — how the rental inventory actually fills up. */}
            {offer && (
              <Link
                href={`/${locale}/rental/${item.id}`}
                className="bg-rental-soft border-rental/20 flex items-center gap-3 rounded-xl border p-3.5 transition-transform active:scale-[0.99]"
              >
                <span className="bg-rental text-rental-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                  <KeyRound className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-rental text-sm font-bold">{t("listing.rentTitle")}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {t("listing.rentBody", {
                      price: formatPrice(offer.rates.day, locale),
                      deposit: formatPrice(offer.deposit, locale),
                    })}
                  </p>
                </div>
                <ChevronRight className="text-rental size-5 shrink-0" strokeWidth={2.4} />
              </Link>
            )}

            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("listing.specs")}
              </h2>
              <SpecTable
                category={item.category}
                attributes={item.attributes}
                extra={extraRows}
                locale={locale}
              />
            </section>

            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("listing.description")}
              </h2>
              <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line">
                {localized(item.description, locale)}
              </p>
            </section>

            {/* Seller — rating, tenure and verification, the trust surface. */}
            {seller && (
              <section className="space-y-2.5">
                <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  {t("listing.seller")}
                </h2>

                <Link
                  href={`/${locale}/seller/${seller.id}`}
                  className="bg-card border-border block rounded-xl border p-3.5 transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-muted font-display grid size-11 shrink-0 place-items-center rounded-full text-sm font-extrabold">
                      {seller.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                        {seller.name}
                        {seller.verifiedBadge && (
                          <BadgeCheck className="text-rental size-4 shrink-0" strokeWidth={2.4} />
                        )}
                      </p>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                        <Star className="fill-primary text-primary size-3" />
                        {formatRating(seller.rating, locale)}
                        <span className="text-subtle-foreground">
                          · {seller.reviewsCount} ·{" "}
                          {seller.kind === "shop"
                            ? t("listing.shop")
                            : seller.kind === "rental"
                              ? t("listing.rentalCompany")
                              : t("listing.private")}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="text-subtle-foreground size-5 shrink-0" />
                  </div>

                  <div className="border-border mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <Stat
                      value={formatMembership(seller.memberSince, locale)}
                      label={t("listing.onPlatform")}
                    />
                    <Stat
                      value={formatResponseTime(seller.responseMinutes, locale)}
                      label={t("listing.responds")}
                    />
                    <Stat
                      value={formatNumber(seller.listingsCount, locale)}
                      label={t("listing.listingsCount")}
                    />
                  </div>
                </Link>
              </section>
            )}
          </div>

          {similar.length > 0 && (
            <div className="pb-6">
              <Rail title={t("listing.similar")}>
                {similar.map((candidate) => (
                  <RailCard
                    key={candidate.id}
                    item={candidate}
                    locale={locale}
                    href={`/${locale}/listing/${candidate.id}`}
                  />
                ))}
              </Rail>
            </div>
          )}
        </main>
      </PageTransition>

      {seller && (
        <ContactActions
          phone={seller.phone}
          contacts={item.stats.contacts}
          threadHref={`/chats?listing=${item.id}`}
        />
      )}
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="tabular text-xs font-bold">{value}</p>
      <p className="text-subtle-foreground mt-0.5 text-[0.625rem] leading-tight">{label}</p>
    </div>
  );
}
