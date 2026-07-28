"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale } from "./config";
import { createTranslator } from "./translate";
import type { Messages, Translate } from "./types";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, t: createTranslator(messages) }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return context;
}

/** Convenience hook: `const t = useT()` then `t("nav.home")`. */
export function useT(): Translate {
  return useI18n().t;
}

/** Current locale, for locale-aware formatters in client components. */
export function useLocale(): Locale {
  return useI18n().locale;
}
