"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { locales, localeMeta, localizePath, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Locale pills. Switching rewrites the `[locale]` segment of the current path,
 * so the user stays on the same screen, and persists the choice in the cookie
 * the middleware reads on next visit.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function select(locale: Locale) {
    if (locale === active) return;
    document.cookie = `iki-locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.replace(localizePath(pathname, locale)));
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("settings.language")}
      aria-busy={isPending}
      className={cn("bg-muted flex items-center gap-1 rounded-full p-1", className)}
    >
      {locales.map((locale) => {
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={localeMeta[locale].label}
            onClick={() => select(locale)}
            className={cn(
              "press rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors",
              selected
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
