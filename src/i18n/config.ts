export const locales = ["az", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "az";

export const localeMeta: Record<
  Locale,
  { label: string; englishLabel: string; flag: string; htmlLang: string; dateLocale: string }
> = {
  az: { label: "Azərbaycan", englishLabel: "Azerbaijani", flag: "🇦🇿", htmlLang: "az-AZ", dateLocale: "az" },
  en: { label: "English", englishLabel: "English", flag: "🇬🇧", htmlLang: "en", dateLocale: "en-GB" },
  ru: { label: "Русский", englishLabel: "Russian", flag: "🇷🇺", htmlLang: "ru-RU", dateLocale: "ru" },
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Swap the locale segment of an in-app pathname, e.g. /az/search → /en/search */
export function localizePath(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  // segments[0] is "" because pathname always starts with "/"
  if (isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || "/";
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
