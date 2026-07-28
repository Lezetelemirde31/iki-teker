import type { Locale } from "@/i18n/config";
import { localeMeta } from "@/i18n/config";
import type { LocalizedText } from "@/types";

import { DEMO_NOW, parseISODate } from "./demo-clock";

const MANAT = "₼";

/** Pick the right string out of a trilingual value. */
export function localized(text: LocalizedText | undefined, locale: Locale): string {
  return text?.[locale] ?? text?.en ?? "";
}

function intlLocale(locale: Locale) {
  return localeMeta[locale].dateLocale;
}

export function formatNumber(value: number, locale: Locale, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits }).format(value);
}

/**
 * Prices are shown with the manat sign leading in English and trailing in
 * Azerbaijani and Russian, which is how each language actually writes it.
 */
export function formatPrice(amount: number, locale: Locale, options?: { decimals?: boolean }) {
  const digits = options?.decimals && !Number.isInteger(amount) ? 2 : 0;
  const value = formatNumber(amount, locale, digits);
  return locale === "en" ? `${MANAT}${value}` : `${value} ${MANAT}`;
}

/** Compact price for dense cards: ₼14.5k. */
export function formatPriceCompact(amount: number, locale: Locale) {
  const value = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
  return locale === "en" ? `${MANAT}${value}` : `${value} ${MANAT}`;
}

/** Daily rental rate, e.g. "₼45 / day". */
export function formatRate(amount: number, locale: Locale, unit: string) {
  return `${formatPrice(amount, locale)} ${unit}`;
}

export function formatMileage(km: number, locale: Locale) {
  const unit = locale === "ru" ? "км" : "km";
  return `${formatNumber(km, locale)} ${unit}`;
}

export function formatDistance(km: number, locale: Locale) {
  const unit = locale === "ru" ? "км" : "km";
  const value = km < 10 ? formatNumber(km, locale, 1) : formatNumber(Math.round(km), locale);
  return `${value} ${unit}`;
}

/* -------------------------------------------------------------------------- */
/*  Dates                                                                      */
/* -------------------------------------------------------------------------- */

type DateStyle = "short" | "medium" | "long" | "dayMonth" | "weekdayShort" | "monthYear";

const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  medium: { day: "numeric", month: "long" },
  long: { day: "numeric", month: "long", year: "numeric" },
  dayMonth: { day: "numeric", month: "short" },
  weekdayShort: { weekday: "short", day: "numeric", month: "short" },
  monthYear: { month: "long", year: "numeric" },
};

export function formatDate(iso: string, locale: Locale, style: DateStyle = "medium") {
  const date = iso.length === 10 ? parseISODate(iso) : new Date(iso);
  return new Intl.DateTimeFormat(intlLocale(locale), dateOptions[style]).format(date);
}

export function formatTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** "8 Aug — 12 Aug", collapsing the month when both dates share one. */
export function formatDateRange(startIso: string, endIso: string, locale: Locale) {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const day = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric" }).format(start);
    return `${day} → ${formatDate(endIso, locale, "dayMonth")}`;
  }
  return `${formatDate(startIso, locale, "dayMonth")} → ${formatDate(endIso, locale, "dayMonth")}`;
}

/**
 * Relative time measured against the fixed demo clock, so "4 min ago" stays
 * "4 min ago" for the whole presentation.
 */
export function formatRelativeTime(iso: string, locale: Locale) {
  const target = iso.length === 10 ? parseISODate(iso) : new Date(iso);
  const diffMs = target.getTime() - DEMO_NOW.getTime();
  const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });

  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");

  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");

  const days = Math.round(diffMs / 86_400_000);
  if (Math.abs(days) < 30) return formatter.format(days, "day");

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(months, "month");

  return formatter.format(Math.round(days / 365), "year");
}

/** "on the platform 2 years" — membership duration in whole years or months. */
export function formatMembership(memberSince: string, locale: Locale) {
  const months = Math.max(
    1,
    Math.round((DEMO_NOW.getTime() - parseISODate(memberSince).getTime()) / (86_400_000 * 30.44)),
  );
  const formatter = new Intl.NumberFormat(intlLocale(locale));

  if (months < 12) {
    const unit = locale === "az" ? "ay" : locale === "ru" ? "мес." : months === 1 ? "month" : "months";
    return `${formatter.format(months)} ${unit}`;
  }

  const years = Math.floor(months / 12);
  const unit = locale === "az" ? "il" : locale === "ru" ? (years === 1 ? "год" : "года") : years === 1 ? "year" : "years";
  return `${formatter.format(years)} ${unit}`;
}

/** "~12 min" for owner response time. */
export function formatResponseTime(minutes: number, locale: Locale) {
  if (minutes < 60) {
    const unit = locale === "az" ? "dəq" : locale === "ru" ? "мин" : "min";
    return `~${minutes} ${unit}`;
  }
  const hours = Math.round(minutes / 60);
  const unit = locale === "az" ? "saat" : locale === "ru" ? "ч" : "h";
  return `~${hours} ${unit}`;
}

export function formatRating(rating: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

/** Pluralised counters such as "42 reviews" / "42 rəy" / "42 отзыва". */
export function formatCount(value: number, locale: Locale, forms: Record<Locale, [string, string, string]>) {
  const set = forms[locale];
  const number = formatNumber(value, locale);

  if (locale === "ru") {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${number} ${set[0]}`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${number} ${set[1]}`;
    return `${number} ${set[2]}`;
  }

  // Azerbaijani has no plural agreement after a numeral; English uses one/other.
  return `${number} ${value === 1 ? set[0] : set[1]}`;
}
