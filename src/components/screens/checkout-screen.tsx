"use client";

import { Check, ChevronRight, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { VehicleArt } from "@/components/common/vehicle-art";
import { PriceBreakdown } from "@/components/rental/price-breakdown";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatDate, formatPrice, localized } from "@/lib/format";
import type { Quote } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Listing, RentalOffer, User } from "@/types";

/**
 * Booking checkout.
 *
 * Payment is cash on pickup at launch — no acquiring required, so the platform
 * can run before a bank agreement exists. The commission is still recorded on
 * the owner's side, which is why the renter's service fee reads zero.
 */
export function CheckoutScreen({
  listing,
  offer,
  renter,
  quote,
  range,
  locale,
  messages,
}: {
  listing: Listing;
  offer: RentalOffer;
  renter: User;
  quote: Quote;
  range: { start: string; end: string };
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const t = createTranslator(messages);
  const [licenceUploaded, setLicenceUploaded] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const licenceNeeded = offer.licenceRequired !== "none";
  const ready = agreed && (!licenceNeeded || licenceUploaded);

  async function submit() {
    if (!ready || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          start: range.start,
          end: range.end,
          licenceUploaded,
          agreementAccepted: agreed,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        // The server names the reason; the dictionary turns it into a sentence,
        // falling back to the generic line for anything not worth its own copy.
        const key = `checkout.error.${data?.error}` as Parameters<typeof t>[0];
        const message = t(key);
        setError(message === key ? t("checkout.error.generic") : message);
        setSending(false);
        return;
      }

      // The code is the renter's reference for this booking; carrying it means
      // the confirmation screen shows the booking that was made rather than
      // re-deriving one from the dates in the URL.
      const code = data?.booking?.code ? `&code=${encodeURIComponent(data.booking.code)}` : "";
      router.push(
        `/${locale}/rental/${listing.id}/confirmation?start=${range.start}&end=${range.end}${code}`,
      );
    } catch {
      setError(t("checkout.error.offline"));
      setSending(false);
    }
  }

  const cover = listing.photos[0];

  return (
    <>
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 py-4">
          {/* What is being booked */}
          <div className="bg-card border-border flex items-center gap-3 rounded-xl border p-3">
            {cover && (
              <VehicleArt
                src={cover.url}
                seed={cover.seed}
                tone={cover.tone}
                shape={listing.category}
                className="size-16 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{listing.title}</p>
              {/* Handover and return happen at a set time, so the window is
                  shown to the hour rather than as bare dates. */}
              <p className="text-muted-foreground tabular mt-0.5 text-xs">
                {formatDate(range.start, locale, "dayMonth")} {offer.handoverTime} →{" "}
                {formatDate(range.end, locale, "dayMonth")} {offer.handoverTime}
              </p>
              <p className="text-subtle-foreground tabular mt-0.5 text-[0.6875rem]">
                {t("rental.days", { count: quote.days })}
              </p>
              <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                {localized(offer.pickup, locale)}
              </p>
            </div>
          </div>

          {/* Renter documents — verified by a moderator, not by the owner on the spot. */}
          <Section title={t("checkout.renter")}>
            <div className="bg-card border-border divide-border divide-y rounded-xl border">
              <Row label={t("checkout.name")} value={renter.name} />
              {renter.phone && (
                <Row
                  label={t("checkout.phone")}
                  value={renter.phone}
                  trailing={
                    renter.phoneVerified ? (
                      <Check className="text-rental size-4" strokeWidth={3} />
                    ) : undefined
                  }
                />
              )}
              {licenceNeeded && (
                <button
                  type="button"
                  onClick={() => setLicenceUploaded(true)}
                  className="hover:bg-muted flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors"
                >
                  <span className="text-sm">
                    {t("checkout.licence")}{" "}
                    <span className="text-subtle-foreground">({offer.licenceRequired})</span>
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-sm font-semibold",
                      licenceUploaded ? "text-rental" : "text-destructive",
                    )}
                  >
                    {licenceUploaded ? (
                      <>
                        <Check className="size-4" strokeWidth={3} />
                        {t("checkout.uploaded")}
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" strokeWidth={2.2} />
                        {t("checkout.upload")}
                      </>
                    )}
                    <ChevronRight className="text-subtle-foreground size-4" />
                  </span>
                </button>
              )}
            </div>
          </Section>

          <Section title={t("checkout.payment")}>
            <div className="bg-card border-border divide-border divide-y rounded-xl border">
              <Row label={t("checkout.rentalLine")} value={t("checkout.onPickupCash")} muted />
              <Row
                label={t("common.deposit")}
                value={t("checkout.cash", { amount: formatPrice(offer.deposit, locale) })}
                muted
              />
            </div>
            <p className="text-subtle-foreground mt-2 text-[0.6875rem]">
              {t("checkout.phase2Note")}
            </p>
          </Section>

          <PriceBreakdown quote={quote} locale={locale} messages={messages} showServiceFee />

          <label className="flex cursor-pointer items-start gap-2.5 px-0.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="accent-primary mt-0.5 size-4 shrink-0"
            />
            <span className="text-muted-foreground text-xs leading-relaxed">
              {t("checkout.agree")}
            </span>
          </label>
        </div>
      </main>

      <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-2.5 rounded-lg px-3 py-2 text-xs leading-relaxed"
          >
            {error}
          </p>
        )}
        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!ready || sending}
          onClick={submit}
        >
          {sending ? t("common.loading") : t("checkout.send")}
        </Button>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  muted,
  trailing,
}: {
  label: string;
  value: string;
  muted?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "tabular text-sm",
            muted ? "text-muted-foreground" : "font-semibold",
          )}
        >
          {value}
        </span>
        {trailing}
      </span>
    </div>
  );
}
