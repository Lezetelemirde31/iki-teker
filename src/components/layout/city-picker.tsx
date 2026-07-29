"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Sheet } from "@/components/ui/sheet";
import { useLocale, useT } from "@/i18n/provider";
import { localized } from "@/lib/format";
import { usePreferences } from "@/stores/preferences";
import { cn } from "@/lib/utils";
import type { City } from "@/types";

export function CityPicker({ cities }: { cities: City[] }) {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const cityId = usePreferences((state) => state.cityId);
  const setCityId = usePreferences((state) => state.setCityId);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const fallback = cities[0];
  const selected = (hydrated ? cities.find((city) => city.id === cityId) : fallback) ?? fallback;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-muted text-foreground flex h-8 items-center gap-1 rounded-full pr-2 pl-3 text-xs font-semibold transition-transform active:scale-95"
      >
        {selected ? localized(selected.name, locale) : ""}
        <ChevronDown className="size-3.5" strokeWidth={2.4} />
      </button>

      <Sheet open={open} onOpenChange={setOpen} title={t("settings.city")}>
        <div className="space-y-1 pb-2">
          {cities.map((city) => {
            const active = selected?.id === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  setCityId(city.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm transition-colors",
                  active ? "bg-muted font-semibold" : "hover:bg-muted",
                )}
              >
                {localized(city.name, locale)}
                {active && <Check className="text-primary size-4" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
