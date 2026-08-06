import { Check, FileSignature, Camera, RotateCcw, UserCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { VehicleArt } from "@/components/common/vehicle-art";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { formatDate, formatDateRange, formatResponseTime } from "@/lib/format";
import { getBookingByCode } from "@/server/bookings";
import { getListing, getOfferForListing, getUser, quote } from "@/server/data";

/**
 * Booking confirmation.
 *
 * The value here is the four-step tracker: the renter leaves knowing exactly
 * what happens next and when, which is precisely what a chat negotiation never
 * gives either side.
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ start?: string; end?: string; code?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const listing = await getListing(id);
  const offer = listing ? await getOfferForListing(listing.id) : undefined;
  if (!listing || !offer) notFound();

  const { start, end, code } = await searchParams;
  if (!start || !end) redirect(`/${locale}/rental/${id}`);

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const owner = await getUser(offer.ownerId);

  // The booking exists once a database is attached; on the mock deployment the
  // dates in the URL are all there is, so the figures are recomputed instead.
  const booking = code ? await getBookingByCode(code) : undefined;
  const priced = booking ?? quote(offer, start, end);
  const cover = listing.photos[0];

  const steps = [
    {
      icon: UserCheck,
      label: t("confirmation.step1"),
      meta: formatResponseTime(owner?.responseMinutes ?? 15, locale),
      current: true,
    },
    { icon: FileSignature, label: t("confirmation.step2"), meta: "—", current: false },
    {
      icon: Camera,
      label: t("confirmation.step3"),
      meta: formatDate(start, locale, "dayMonth"),
      current: false,
    },
    {
      icon: RotateCcw,
      label: t("confirmation.step4"),
      meta: formatDate(end, locale, "dayMonth"),
      current: false,
    },
  ];

  return (
    <PageTransition>
      <AppHeader back title={t("confirmation.title")} />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 py-6">
          <div className="flex flex-col items-center text-center">
            <span className="bg-rental text-rental-foreground grid size-16 place-items-center rounded-full">
              <Check className="size-8" strokeWidth={3} />
            </span>
            <h1 className="font-display mt-4 text-xl font-extrabold">{t("confirmation.sent")}</h1>
            <p className="text-muted-foreground mt-2 max-w-[19rem] text-sm text-pretty">
              {t("confirmation.body", {
                seller: owner?.name ?? "",
                minutes: formatResponseTime(owner?.responseMinutes ?? 15, locale),
              })}
            </p>
          </div>

          <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-3">
            {cover && (
              <VehicleArt
                src={cover.url}
                seed={cover.seed}
                tone={cover.tone}
                shape={listing.category}
                className="size-14 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{listing.title}</p>
              <p className="text-muted-foreground tabular mt-0.5 text-xs">
                {formatDateRange(start, end, locale)} · {t("rental.days", { count: priced.days })}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="warning" size="md">
                  {t("confirmation.awaiting")}
                </Badge>
                {/* The reference both sides quote at each other from here on. */}
                {booking && (
                  <span className="text-subtle-foreground tabular text-[0.6875rem] font-semibold">
                    {booking.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-2.5">
            <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("confirmation.whatNext")}
            </h2>
            <ol className="bg-card border-border divide-border divide-y rounded-xl border">
              {steps.map((step, index) => (
                <li key={step.label} className="flex items-center gap-3 px-3.5 py-3">
                  <span
                    className={
                      step.current
                        ? "bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full"
                        : "bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full"
                    }
                  >
                    <step.icon className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-subtle-foreground mr-1.5 text-xs">{index + 1}</span>
                    <span className={step.current ? "text-sm font-bold" : "text-sm"}>
                      {step.label}
                    </span>
                  </span>
                  <span className="text-subtle-foreground tabular shrink-0 text-xs">
                    {step.meta}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-2 pt-1">
            <Button variant="outline" size="lg" block asChild>
              <Link href={`/${locale}/chats`}>{t("confirmation.messageOwner")}</Link>
            </Button>
            <Button size="lg" block className="font-display uppercase" asChild>
              <Link href={`/${locale}/home`}>{t("confirmation.backHome")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
