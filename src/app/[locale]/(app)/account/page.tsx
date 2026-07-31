import { BadgeCheck, CalendarCheck, ChevronRight, Heart, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VehicleArt } from "@/components/common/vehicle-art";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import {
  formatDateRange,
  formatMembership,
  formatNumber,
  formatPrice,
  formatRating,
} from "@/lib/format";
import { RequestQueue } from "@/components/rental/request-queue";
import { pendingRequestsFor } from "@/server/bookings";
import { getListing, getMyRentals, getUser } from "@/server/data";
import { currentUserId } from "@/server/session";
import type { Listing, User } from "@/types";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const userId = await currentUserId();
  const user = await getUser(userId);
  if (!user) notFound();

  const [rentals, requests] = await Promise.all([
    getMyRentals(userId),
    pendingRequestsFor(userId),
  ]);

  // One lookup per distinct vehicle, resolved before the list renders.
  const rentedListings = new Map(
    (await Promise.all([...new Set(rentals.map((b) => b.listingId))].map((id) => getListing(id))))
      .filter((listing) => listing !== undefined)
      .map((listing) => [listing.id, listing]),
  );

  // The queue needs the vehicle and the person asking for it. Both are resolved
  // here so the client component renders from data rather than fetching again.
  const requestListings: Record<string, Listing> = {};
  const requestRenters: Record<string, User> = {};
  if (requests.length > 0) {
    const [listings, renters] = await Promise.all([
      Promise.all([...new Set(requests.map((r) => r.listingId))].map((id) => getListing(id))),
      Promise.all([...new Set(requests.map((r) => r.renterId))].map((id) => getUser(id))),
    ]);
    for (const listing of listings) if (listing) requestListings[listing.id] = listing;
    for (const renter of renters) if (renter) requestRenters[renter.id] = renter;
  }

  return (
    <PageTransition>
      <AppHeader title={t("account.title")} hazard />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 px-4 py-4">
          <section className="flex items-center gap-3">
            <span className="bg-muted font-display grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold">
              {user.initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-lg font-extrabold">{user.name}</h1>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                <Star className="fill-primary text-primary size-3.5" />
                {formatRating(user.rating, locale)}
                <span className="text-subtle-foreground">
                  · {formatMembership(user.memberSince, locale)} {t("listing.onPlatform")}
                </span>
              </p>
              {user.phoneVerified && (
                <Badge variant="rentalSoft" size="md" className="mt-1.5">
                  <BadgeCheck className="size-3" /> {t("account.phoneVerified")}
                </Badge>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <Link
              href={`/${locale}/favorites`}
              className="bg-card border-border flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-transform active:scale-[0.99]"
            >
              <Heart className="text-muted-foreground size-5 shrink-0" strokeWidth={2} />
              <span className="flex-1 text-sm font-semibold">{t("account.favorites")}</span>
              <ChevronRight className="text-subtle-foreground size-5" />
            </Link>
            <Link
              href={`/${locale}/seller/${user.id}`}
              className="bg-card border-border flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-transform active:scale-[0.99]"
            >
              <Star className="text-muted-foreground size-5 shrink-0" strokeWidth={2} />
              <span className="flex-1 text-sm font-semibold">{t("seller.listings")}</span>
              <span className="text-subtle-foreground tabular text-sm">
                {formatNumber(user.listingsCount, locale)}
              </span>
              <ChevronRight className="text-subtle-foreground size-5" />
            </Link>
          </section>

          {/* Requests waiting on this owner. Above their own rentals because
              somebody is waiting on an answer, and hidden entirely when there
              is nothing to decide rather than showing an empty heading. */}
          {requests.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("requests.title")}
              </h2>
              <RequestQueue
                requests={requests}
                listings={requestListings}
                renters={requestRenters}
                locale={locale}
                messages={messages}
              />
            </section>
          )}

          {/* Rentals the user has taken, newest first. */}
          <section className="space-y-2.5">
            <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("account.myRentals")}
            </h2>

            {rentals.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("account.noRentals")}</p>
            ) : (
              <div className="space-y-2">
                {rentals.map((booking) => {
                  const listing = rentedListings.get(booking.listingId);
                  const cover = listing?.photos[0];
                  const settled = booking.status === "returned";

                  return (
                    <Link
                      key={booking.id}
                      href={`/${locale}/listing/${booking.listingId}`}
                      className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 transition-transform active:scale-[0.99]"
                    >
                      {cover && listing && (
                        <VehicleArt
                          seed={cover.seed}
                          tone={cover.tone}
                          shape={listing.category}
                          className="size-12 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{listing?.title}</p>
                        <p className="text-muted-foreground tabular mt-0.5 text-xs">
                          {formatDateRange(booking.start, booking.end, locale)} ·{" "}
                          {t("rental.days", { count: booking.days })}
                        </p>
                        <Badge
                          variant={settled ? "muted" : "rentalSoft"}
                          size="md"
                          className="mt-1"
                        >
                          <CalendarCheck className="size-3" />
                          {formatPrice(booking.subtotal, locale)}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("account.language")}
            </h2>
            <LocaleSwitcher />

            <h2 className="text-subtle-foreground pt-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("account.appearance")}
            </h2>
            <ThemeToggle />
          </section>

          <p className="text-subtle-foreground pb-2 text-[0.6875rem] leading-relaxed">
            {t("account.demoNote")}
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
