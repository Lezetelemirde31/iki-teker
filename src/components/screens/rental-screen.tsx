"use client";

import { Check, MapPin, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvailabilityCalendar, type Range } from "@/components/rental/availability-calendar";
import { SpecTable } from "@/components/listing/spec-table";
import { PriceBreakdown } from "@/components/rental/price-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages, MessageKey } from "@/i18n/types";
import { formatDate, formatPrice, localized } from "@/lib/format";
import { quote as buildQuote } from "@/lib/queries";
import type { Listing, RentalOffer } from "@/types";

/**
 * Rental detail: rates, the owner's rules, and a date picker that quotes the
 * price live. Owners set their own terms, which is what separates this from a
 * fixed-fleet rental service.
 */
export function RentalScreen({
  listing,
  offer,
  locale,
  messages,
  today,
  initialRange,
}: {
  listing: Listing;
  offer: RentalOffer;
  locale: Locale;
  messages: Messages;
  today: string;
  initialRange: Range;
}) {
  const router = useRouter();
  const t = createTranslator(messages);
  const [range, setRange] = useState<Range>(initialRange);
  const [pickerOpen, setPickerOpen] = useState(false);

  const complete = Boolean(range.start && range.end);
  const currentQuote = complete ? buildQuote(offer, range.start!, range.end!) : undefined;
  const tooShort = currentQuote?.belowMinimum ?? false;

  function proceed() {
    if (!complete || tooShort) return;
    router.push(
      `/${locale}/rental/${listing.id}/checkout?start=${range.start}&end=${range.end}`,
    );
  }

  const conditions: { label: string; value: string }[] = [
    { label: t("common.deposit"), value: formatPrice(offer.deposit, locale) },
    { label: t("rental.minPeriod"), value: t("rental.days", { count: offer.minDays }) },
    ...(offer.licenceRequired !== "none"
      ? [
          {
            label: `${t("rental.licence")} ${offer.licenceRequired}`,
            value: t("rental.licenceRequired"),
          },
        ]
      : []),
    {
      label: t("rental.cancellation"),
      value: t("rental.freeCancel", { hours: offer.freeCancellationHours }),
    },
  ];

  return (
    <>
      <div className="space-y-6 px-4 pt-4 pb-6">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            {offer.availableFrom <= today ? (
              <Badge variant="rental">{t("rental.availableToday")}</Badge>
            ) : (
              <Badge variant="ink">
                {t("home.availableFrom", {
                  date: formatDate(offer.availableFrom, locale, "dayMonth"),
                })}
              </Badge>
            )}
            {offer.instantBook && (
              <Badge variant="warning">
                <Zap className="size-3" /> {t("rental.instantBook")}
              </Badge>
            )}
          </div>

          <h1 className="font-display mt-2 text-[1.375rem] leading-tight font-extrabold">
            {listing.title}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-xs">
            <MapPin className="mt-px size-3.5 shrink-0" strokeWidth={2} />
            {localized(offer.pickup, locale)}
          </p>
        </section>

        {/* Rates — hour, day and week, with the long-stay discount surfaced. */}
        <section className="bg-card border-border rounded-xl border p-3.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display tabular text-[1.75rem] leading-none font-extrabold">
              {formatPrice(offer.rates.day, locale)}
            </span>
            <span className="text-muted-foreground text-sm">{t("common.perDay")}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {offer.rates.longStay && (
              <Badge variant="rentalSoft" size="md">
                {t("rental.longStay", {
                  days: offer.rates.longStay.minDays,
                  price: formatPrice(offer.rates.longStay.dayPrice, locale),
                })}
              </Badge>
            )}
            {offer.rates.hour && (
              <Badge variant="muted" size="md">
                {t("rental.hour")} {formatPrice(offer.rates.hour, locale)}
              </Badge>
            )}
            {offer.rates.week && (
              <Badge variant="muted" size="md">
                {t("rental.week")} {formatPrice(offer.rates.week, locale)}
              </Badge>
            )}
            <Badge variant="muted" size="md">
              {t("rental.minDays", { count: offer.minDays })}
            </Badge>
          </div>

          {/* Start and end as two fields, matching the source design — both
              open the same availability calendar. */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <DateField
              label={t("common.start")}
              value={range.start ? formatDate(range.start, locale, "weekdayShort") : "—"}
              onClick={() => setPickerOpen(true)}
            />
            <DateField
              label={t("common.end")}
              value={range.end ? formatDate(range.end, locale, "weekdayShort") : "—"}
              onClick={() => setPickerOpen(true)}
            />
          </div>

          {currentQuote && !tooShort && (
            <PriceBreakdown
              quote={currentQuote}
              locale={locale}
              messages={messages}
              className="mt-3 !border-0 !bg-transparent !p-0"
            />
          )}

          {tooShort && (
            <p className="text-destructive mt-3 text-xs font-semibold">
              {t("rental.belowMinimum", { count: offer.minDays })}
            </p>
          )}

          <Button
            size="lg"
            block
            className="font-display mt-3.5 uppercase"
            disabled={!complete || tooShort}
            onClick={proceed}
          >
            {t("rental.book")}
            {currentQuote && !tooShort ? ` · ${formatPrice(currentQuote.subtotal, locale)}` : ""}
          </Button>

          <p className="text-subtle-foreground mt-2 text-center text-[0.6875rem]">
            {t("rental.freeCancel", { hours: offer.freeCancellationHours })}
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {t("rental.conditions")}
          </h2>
          <div className="bg-card border-border divide-border divide-y rounded-xl border">
            {conditions.map((condition) => (
              <div
                key={condition.label}
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <span className="text-sm">{condition.label}</span>
                <span className="text-muted-foreground tabular text-sm font-semibold">
                  {condition.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* The vehicle's own specs — displacement, licence class and the rest,
            so a renter is not sent back to the sale listing to find them. */}
        <section className="space-y-2.5">
          <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {t("listing.specs")}
          </h2>
          <SpecTable
            category={listing.category}
            attributes={listing.attributes}
            extra={[{ label: t("search.year"), value: String(listing.year) }]}
            locale={locale}
          />
        </section>

        {offer.includes.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("rental.includes")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {offer.includes.map((item) => (
                <span
                  key={item}
                  className="bg-rental-soft text-rental flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                  {t(`rental.${item}` as MessageKey)}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      <Sheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={t("calendar.title")}
        footer={
          <Button
            size="lg"
            block
            className="font-display uppercase"
            disabled={!complete || tooShort}
            onClick={() => setPickerOpen(false)}
          >
            {t("common.continue")}
            {currentQuote && !tooShort ? ` · ${formatPrice(currentQuote.subtotal, locale)}` : ""}
          </Button>
        }
      >
        <AvailabilityCalendar
          blockedDates={offer.blockedDates}
          minDate={today}
          value={range}
          onChange={setRange}
        />
        {currentQuote && !tooShort && (
          <PriceBreakdown
            quote={currentQuote}
            locale={locale}
            messages={messages}
            className="mt-3"
          />
        )}
        {tooShort && (
          <p className="text-destructive mt-3 text-center text-xs font-semibold">
            {t("rental.belowMinimum", { count: offer.minDays })}
          </p>
        )}
      </Sheet>
    </>
  );
}

function DateField({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-surface-2 rounded-xl border px-3.5 py-2.5 text-left transition-transform active:scale-[0.98]"
    >
      <span className="text-subtle-foreground block text-[0.625rem] font-semibold tracking-wide uppercase">
        {label}
      </span>
      <span className="tabular mt-0.5 block truncate text-sm font-bold">{value}</span>
    </button>
  );
}
