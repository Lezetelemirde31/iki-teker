"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", icon: Sun, labelKey: "settings.themeLight" },
  { value: "system", icon: Monitor, labelKey: "settings.themeSystem" },
  { value: "dark", icon: Moon, labelKey: "settings.themeDark" },
] as const;

/** iOS-style segmented control for appearance. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the resolved theme after hydration; render a stable
  // shell first so the server and client markup agree.
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label={t("settings.appearance")}
      className={cn("bg-muted flex items-center gap-1 rounded-full p-1", className)}
    >
      {options.map(({ value, icon: Icon, labelKey }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(labelKey)}
            onClick={() => setTheme(value)}
            className={cn(
              "press grid size-9 place-items-center rounded-full transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
