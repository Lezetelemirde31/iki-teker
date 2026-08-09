import {
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
  Heart,
  LogIn,
  ShieldCheck,
  Star,
  UserPen,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VehicleArt } from "@/components/common/vehicle-art";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { OwnListings } from "@/components/listing/own-listings";
import { RequestQueue } from "@/components/rental/request-queue";
import { canModerate } from "@/server/authorization";
import { ReviewForm } from "@/components/rental/review-form";
import { AppointmentQueue } from "@/components/service/appointment-queue";
import { myAppointments, pendingAppointmentsFor } from "@/server/appointments";
import { servicesByIds, workshopNamesByIds } from "@/server/workshops";
import { pendingRequestsFor } from "@/server/bookings";
import { openComplaints } from "@/server/complaints";
import { reviewableBookings } from "@/server/reviews";
import { ownListings } from "@/server/listing-actions";
import { pendingCount } from "@/server/moderation";
import { getListing, getMyRentals, getUser } from "@/server/data";
import { currentUserId, isSignedIn } from "@/server/session";
import type { Listing, User } from "@/types";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  // Only reaches the browser when push is configured; absent means the
  // toggle is not rendered at all.
  const pushKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const userId = await currentUserId();
  const user = await getUser(userId);
  if (!user) notFound();

  const [
    rentals,
    requests,
    moderator,
    queued,
    reports,
    mine,
    signedIn,
    reviewable,
    appointmentQueue,
    bookedServices,
  ] = await Promise.all([
    getMyRentals(userId),
    pendingRequestsFor(userId),
    canModerate(),
    pendingCount(),
    openComplaints(),
    ownListings(userId),
    isSignedIn(),
    reviewableBookings(userId),
    pendingAppointmentsFor(userId),
    myAppointments(userId),
  ]);

  // Names for whatever the two appointment lists actually contain — one query
  // each rather than one per row, and nothing fetched when both are empty.
  const appointmentServices = await servicesByIds([
    ...new Set([...appointmentQueue, ...bookedServices].map((a) => a.serviceId)),
  ]);
  const [appointmentCustomers, bookedWorkshops] = await Promise.all([
    Promise.all([...new Set(appointmentQueue.map((a) => a.customerId))].map((id) => getUser(id))),
    workshopNamesByIds([...new Set(bookedServices.map((a) => a.workshopId))]),
  ]);
  const customerNames = Object.fromEntries(
    appointmentCustomers.filter((person) => person !== undefined).map((p) => [p.id, p.name]),
  );

  // Listings waiting plus reports waiting. A moderator should not have to open
  // the panel to find out whether there is anything in it.
  const waiting = queued + reports;

  // Finished rentals this person has not written about yet.
  const awaitingReview = new Set(reviewable);

  // Only the owners of those, so a long rental history costs no extra queries.
  const rentalOwners = new Map(
    (
      await Promise.all(
        [
          ...new Set(
            rentals.filter((b) => awaitingReview.has(b.id)).map((booking) => booking.ownerId),
          ),
        ].map((id) => getUser(id)),
      )
    )
      .filter((owner) => owner !== undefined)
      .map((owner) => [owner.id, owner]),
  );

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

          {/* Near the top, not buried under the settings. Turning notifications
              on is the single thing on this screen that changes whether a
              rental request gets answered, and nobody scrolls past their own
              listings to find a toggle they did not know existed. It quietens
              itself down to one line once it is on. */}
          {signedIn && pushKey && <NotificationToggle publicKey={pushKey} />}

          <section className="space-y-2">
            {/* Only for a real account. There is nothing to edit on the shared
                demo persona, and offering it would suggest otherwise. */}
            {signedIn && (
              <Link
                href={`/${locale}/account/edit`}
                className="bg-card border-border flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-transform active:scale-[0.99]"
              >
                <UserPen className="text-muted-foreground size-5 shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm font-semibold">{t("profile.edit")}</span>
                <ChevronRight className="text-subtle-foreground size-5" />
              </Link>
            )}

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

            {/* Only rendered for a moderator. The panel itself answers 404 to
                everyone else, so this is convenience, not the guard.

                A plain anchor rather than a Link: the panel lives outside the
                localised app and has its own root layout, so this is a real
                navigation and not a client-side transition into a tree that
                shares nothing with this one. */}
            {moderator && (
              <a
                href="/admin"
                className="bg-card border-border flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-transform active:scale-[0.99]"
              >
                <ShieldCheck className="text-muted-foreground size-5 shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm font-semibold">{t("moderation.title")}</span>
                {waiting > 0 && (
                  <Badge variant="warning" size="md">
                    {formatNumber(waiting, locale)}
                  </Badge>
                )}
                <ChevronRight className="text-subtle-foreground size-5" />
              </a>
            )}
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

          {/* Somebody is waiting on this workshop to say yes or no, so it sits
              with the rental requests rather than below the settings. */}
          {appointmentQueue.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("appointment.queueTitle")}
              </h2>
              <AppointmentQueue
                appointments={appointmentQueue}
                services={appointmentServices}
                customers={customerNames}
                locale={locale}
                messages={messages}
              />
            </section>
          )}

          {/* The seller's own listings, whatever state they are in. Above their
              rentals because a listing waiting for review is something they are
              owed an answer on. */}
          {mine.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("account.myListings")}
              </h2>
              <OwnListings listings={mine} locale={locale} messages={messages} />
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

                  const rate = settled && awaitingReview.has(booking.id);

                  return (
                    <div key={booking.id} className="space-y-2">
                    <Link
                      href={`/${locale}/listing/${booking.listingId}`}
                      className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 transition-transform active:scale-[0.99]"
                    >
                      {cover && listing && (
                        <VehicleArt
                          src={cover.url}
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

                    {/* Offered where the rental already is. The moment someone
                        is most willing to write a review is while they are
                        looking at the thing they would be reviewing. */}
                    {rate && (
                      <ReviewForm
                        bookingId={booking.id}
                        otherName={rentalOwners.get(booking.ownerId)?.name ?? ""}
                      />
                    )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* What this person has booked at a workshop, alongside what they
              have rented. Both are "things I am expected somewhere for". */}
          {bookedServices.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("appointment.myTitle")}
              </h2>
              <div className="space-y-2">
                {bookedServices.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-card border-border flex items-center gap-3 rounded-xl border p-3"
                  >
                    <span className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                      <Wrench className="size-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {appointmentServices[appointment.serviceId]?.name[locale] ??
                          appointment.vehicleLabel}
                      </p>
                      <p className="text-muted-foreground tabular mt-0.5 text-xs">
                        {bookedWorkshops[appointment.workshopId] ?? ""} · {appointment.date}{" "}
                        {appointment.time}
                      </p>
                      <Badge
                        variant={appointment.status === "confirmed" ? "rentalSoft" : "muted"}
                        size="md"
                        className="mt-1"
                      >
                        {t(
                          `appointment.status.${appointment.status}` as Parameters<typeof t>[0],
                        )}
                      </Badge>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold">
                      {formatPrice(appointment.priceEstimate, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

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

          {/* Sign in or out, depending. Shown last because it is a settings
              action, not something anyone comes to this screen to do. */}
          <div className="pt-1">
            {signedIn ? (
              <SignOutButton />
            ) : (
              <Button size="lg" block className="font-display uppercase" asChild>
                <Link href={`/${locale}/login`}>
                  <LogIn />
                  {t("auth.login")}
                </Link>
              </Button>
            )}
          </div>

          <p className="text-subtle-foreground pb-2 text-[0.6875rem] leading-relaxed">
            {t("account.demoNote")}
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
