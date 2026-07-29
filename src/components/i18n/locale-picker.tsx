"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Sheet } from "@/components/ui/sheet";
import { locales, localeMeta, localizePath, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Compact language pill for the app header, sitting beside the city picker as
 * in the source design. The wide segmented switcher is kept for onboarding and
 * settings, where there is room for it.
 */
export function LocalePicker() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function select(locale: Locale) {
    setOpen(false);
    if (locale === active) return;
    document.cookie = `iki-locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.replace(localizePath(pathname, locale)));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("settings.language")}
        aria-busy={isPending}
        className="bg-muted text-foreground flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-bold uppercase transition-transform active:scale-95"
      >
        {active}
      </button>

      <Sheet open={open} onOpenChange={setOpen} title={t("settings.language")}>
        <div className="space-y-1 pb-2">
          {locales.map((locale) => {
            const selected = locale === active;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => select(locale)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm transition-colors",
                  selected ? "bg-muted font-semibold" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-subtle-foreground w-6 text-xs font-bold uppercase">
                    {locale}
                  </span>
                  {localeMeta[locale].label}
                </span>
                {selected && <Check className="text-primary size-4" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
