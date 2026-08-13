import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

const LOCALE_COOKIE = "iki-locale";
const SESSION_COOKIE = "iki-session";
// The demo identity `currentUser()` falls back to. Accepted here for exactly
// the same reason it is accepted there — this gate must agree with the guard
// it stands in front of, or it turns a working screen into a login redirect.
const DEMO_COOKIE = "iki-demo-user";

/**
 * Screens that mean nothing without an account.
 *
 * Guarded here as well as in the page, and for a reason that changed recently:
 * these routes now have a loading skeleton, and a route with a loading boundary
 * starts streaming before its server component runs — so `redirect()` inside
 * the page arrives as an instruction in the stream, after a 200, rather than
 * as a redirect. A browser still follows it, but anything that is not a browser
 * sees a successful response to a page it may not have.
 *
 * The check is only for a session cookie: whether that session is real is still
 * decided in `requireUser`, which every one of these pages calls. This is the
 * cheap gate that keeps the redirect an actual redirect — and it saves
 * rendering a screen for somebody who was never going to see it.
 */
const PRIVATE = ["/post", "/chats", "/favorites", "/account"];

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

  if (hasLocale) {
    const [, locale = defaultLocale, ...rest] = pathname.split("/");
    const withoutLocale = `/${rest.join("/")}`;

    if (
      PRIVATE.some((route) => withoutLocale === route || withoutLocale.startsWith(`${route}/`)) &&
      !request.cookies.get(SESSION_COOKIE) &&
      !request.cookies.get(DEMO_COOKIE)
    ) {
      const login = request.nextUrl.clone();
      login.pathname = `/${locale}/login`;
      login.search = "";
      // Where they were going, so signing in finishes the errand they started
      // rather than dropping them on a home screen.
      login.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

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
