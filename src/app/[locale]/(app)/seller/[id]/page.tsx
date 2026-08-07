import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";
import { notFound } from "next/navigation";

import { ReportButton } from "@/components/common/report-button";
import { ListingTile } from "@/components/listing/listing-cards";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import {
  formatDate,
  formatMembership,
  formatNumber,
  formatRating,
  formatResponseTime,
  localized,
} from "@/lib/format";
import { getSellerProfile, getUser } from "@/server/data";
import { currentUserId } from "@/server/session";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const profile = await getSellerProfile(id);
  if (!profile) notFound();

  const viewerId = await currentUserId();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const { user, listings, parts, reviews } = profile;
  const items = [...listings, ...parts];

  // Review authors, resolved once before the list renders.
  const authors = new Map(
    (await Promise.all([...new Set(reviews.map((r) => r.authorId))].map((id) => getUser(id))))
      .filter((author) => author !== undefined)
      .map((author) => [author.id, author]),
  );

  return (
    <PageTransition>
      <AppHeader back title={t("seller.title")} />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 px-4 py-4">
          <section>
            <div className="flex items-center gap-3">
              <span className="bg-muted font-display grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold">
                {user.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="font-display flex items-center gap-1.5 truncate text-lg font-extrabold">
                  {user.name}
                  {user.verifiedBadge && (
                    <BadgeCheck className="text-rental size-4.5 shrink-0" strokeWidth={2.4} />
                  )}
                </h1>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                  <Star className="fill-primary text-primary size-3.5" />
                  {formatRating(user.rating, locale)}
                  <span className="text-subtle-foreground">
                    · {formatNumber(user.rentalsCount, locale)} {t("seller.rentals")} ·{" "}
                    {formatNumber(user.reviewsCount, locale)}
                  </span>
                </p>
                {user.verifiedBadge && (
                  <Badge variant="rentalSoft" size="md" className="mt-1.5">
                    {t("listing.verified")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2">
              <Stat
                value={formatMembership(user.memberSince, locale)}
                label={t("listing.onPlatform")}
              />
              <Stat
                value={formatResponseTime(user.responseMinutes, locale)}
                label={t("seller.responseTime")}
              />
              <Stat value={formatNumber(user.listingsCount, locale)} label={t("seller.listings")} />
            </div>

            {(user.address || user.hours) && (
              <div className="bg-card border-border divide-border mt-3 divide-y rounded-xl border">
                {user.address && (
                  <div className="flex items-center gap-2.5 px-3.5 py-3">
                    <MapPin className="text-muted-foreground size-4 shrink-0" strokeWidth={2} />
                    <span className="text-sm">{localized(user.address, locale)}</span>
                  </div>
                )}
                {user.hours && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <span className="flex items-center gap-2.5">
                      <Clock className="text-muted-foreground size-4 shrink-0" strokeWidth={2} />
                      <span className="text-sm">{t("seller.hours")}</span>
                    </span>
                    <span className="tabular text-sm font-semibold">
                      {user.hours.open} – {user.hours.close}
                    </span>
                  </div>
                )}
              </div>
            )}

            {user.bio && (
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {localized(user.bio, locale)}
              </p>
            )}
          </section>

          {items.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="font-display text-base font-extrabold">
                {t("seller.listings")}{" "}
                <span className="text-subtle-foreground font-semibold">{items.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <ListingTile
                    key={item.id}
                    item={item}
                    locale={locale}
                    href={`/${locale}/listing/${item.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* A review is only possible after a completed transaction — that is
              what makes the rating worth trusting. */}
          <section className="space-y-2.5">
            <h2 className="font-display text-base font-extrabold">
              {t("seller.reviews")}{" "}
              <span className="text-subtle-foreground font-semibold">{reviews.length}</span>
            </h2>

            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("seller.noReviews")}</p>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => {
                  const author = authors.get(review.authorId);
                  return (
                    <article
                      key={review.id}
                      className="bg-card border-border rounded-xl border p-3.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="bg-muted grid size-8 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold">
                          {author?.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{author?.name}</p>
                          <p className="text-subtle-foreground truncate text-[0.6875rem]">
                            {localized(review.subject, locale)}
                          </p>
                        </div>
                        <span className="flex shrink-0 gap-0.5">
                          {Array.from({ length: 5 }, (_, star) => (
                            <Star
                              key={star}
                              className={
                                star < review.rating
                                  ? "fill-primary text-primary size-3"
                                  : "text-border size-3"
                              }
                            />
                          ))}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed">
                        {localized(review.text, locale)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        {review.verifiedTransaction && (
                          <Badge variant="rentalSoft">{t("seller.verifiedTransaction")}</Badge>
                        )}
                        <span className="text-subtle-foreground text-[0.625rem]">
                          {formatDate(review.createdAt, locale, "medium")}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Not shown on your own profile — reporting yourself is refused. */}
          {user.id !== viewerId && <ReportButton entityType="user" entityId={user.id} />}
        </div>
      </main>
    </PageTransition>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card border-border rounded-xl border px-2.5 py-2.5 text-center">
      <p className="tabular text-sm font-extrabold">{value}</p>
      <p className="text-subtle-foreground mt-0.5 text-[0.625rem] leading-tight">{label}</p>
    </div>
  );
}
