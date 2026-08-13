import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { LocalePicker } from "@/components/i18n/locale-picker";
import { CityPicker } from "@/components/layout/city-picker";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { MessageKey } from "@/i18n/types";
import { categories, cities } from "@/mocks";
import { isSignedIn } from "@/server/session";

/**
 * The site's own header, on screens wide enough to be a site.
 *
 * The product is a mobile application and stays one: below `md` this is not
 * rendered at all and the app's own chrome — its glass header, its tab bar —
 * is exactly what it always was. What changed is only what a laptop sees.
 * Somebody who typed the address on a desktop was previously shown a phone
 * mock-up in the middle of an empty page, which reads as a demo rather than a
 * marketplace.
 *
 * So the same pages, the same data, with the navigation a website is expected
 * to have: sections across the top, search in the middle, account and posting
 * on the right.
 */
export async function WebHeader({ locale }: { locale: Locale }) {
  const [messages, signedIn] = await Promise.all([getMessages(locale), isSignedIn()]);
  const t = createTranslator(messages);

  const href = (slug: string) =>
    slug === "rental"
      ? `/${locale}/search?hasRental=true`
      : slug === "services"
        ? `/${locale}/services`
        : `/${locale}/search?category=${slug}`;

  return (
    <header className="web-only border-border bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-6">
        <Link href={`/${locale}/home`} className="shrink-0">
          <Logo />
        </Link>

        {/* A real field rather than the app's tap-to-open button: on a desktop
            the keyboard is already there, and a search box that does nothing
            until clicked is a box that looks broken. */}
        <form action={`/${locale}/search`} className="min-w-0 flex-1">
          <label className="bg-background border-border focus-within:border-primary flex h-10 items-center gap-2.5 rounded-xl border px-3.5 transition-colors">
            <Search className="text-subtle-foreground size-4 shrink-0" strokeWidth={2} />
            <input
              type="search"
              name="q"
              placeholder={t("home.searchPlaceholder")}
              className="text-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <CityPicker cities={cities} />
          <LocalePicker />

          {signedIn ? (
            <Link
              href={`/${locale}/account`}
              className="border-border hover:bg-muted rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              {t("nav.account")}
            </Link>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="border-border hover:bg-muted rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              {t("auth.login")}
            </Link>
          )}

          <Link
            href={`/${locale}/post?category=motorcycles`}
            className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition-transform active:scale-95"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            {t("nav.post")}
          </Link>
        </div>
      </div>

      {/* The sections, always visible rather than behind the search screen —
          browsing by category is how a marketplace is used on a large screen. */}
      <nav className="border-border/60 border-t">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-1.5">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={href(category.slug)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
            >
              {t(category.labelKey as MessageKey)}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
