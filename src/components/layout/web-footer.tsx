import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { MessageKey } from "@/i18n/types";
import { categories } from "@/mocks";

/**
 * The foot of the site, on wide screens only.
 *
 * A phone has a tab bar and needs nothing at the bottom of a scroll. A website
 * without a footer looks unfinished, and this is also where the things nobody
 * navigates to but everybody expects to find can live.
 */
export async function WebFooter({ locale }: { locale: Locale }) {
  const t = createTranslator(await getMessages(locale));
  const year = new Date().getFullYear();

  const href = (slug: string) =>
    slug === "rental"
      ? `/${locale}/search?hasRental=true`
      : slug === "services"
        ? `/${locale}/services`
        : `/${locale}/search?category=${slug}`;

  return (
    <footer className="web-only border-border bg-card mt-12 border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-base font-extrabold">{t("app.name")}</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed">
            {t("app.tagline")}
          </p>
        </div>

        <div>
          <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
            {t("nav.search")}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {categories.slice(0, 5).map((category) => (
              <li key={category.slug}>
                <Link
                  href={href(category.slug)}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t(category.labelKey as MessageKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
            {t("nav.account")}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            <li>
              <Link
                href={`/${locale}/login`}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {t("auth.login")}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/post?category=motorcycles`}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {t("nav.post")}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/services`}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {t("categories.services")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border/60 border-t">
        <p className="text-subtle-foreground mx-auto max-w-7xl px-6 py-4 text-xs">
          © {year} {t("app.name")} · ikitekerli.az
        </p>
      </div>
    </footer>
  );
}
