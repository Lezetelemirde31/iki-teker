import "server-only";

import type { Locale } from "./config";
import type { Messages } from "./types";

/**
 * Static imports keep every dictionary in the RSC bundle graph, so switching
 * locale never costs a round trip. Three languages of UI copy is small enough
 * that code-splitting them would trade clarity for nothing.
 */
const dictionaries: Record<Locale, () => Promise<Messages>> = {
  az: () => import("@/messages/az.json").then((m) => m.default as Messages),
  en: () => import("@/messages/en.json").then((m) => m.default as Messages),
  ru: () => import("@/messages/ru.json").then((m) => m.default as Messages),
};

export async function getMessages(locale: Locale): Promise<Messages> {
  return dictionaries[locale]();
}
