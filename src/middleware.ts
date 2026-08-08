import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

const LOCALE_COOKIE = "iki-locale";

/** Best-effort locale negotiation: cookie first, then Accept-Language, then default. */
function detectLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase())
    .find((code) => code && (locales as readonly string[]).includes(code));

  return preferred ?? defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The admin panel sits outside the localised app on purpose. It is a desktop
  // tool for the people running the marketplace, not a screen the marketplace's
  // customers ever see — so it does not live inside the phone frame that wraps
  // every `/[locale]` route, and it has no locale segment to negotiate.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  // Everything except Next internals, static assets and metadata files.
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
