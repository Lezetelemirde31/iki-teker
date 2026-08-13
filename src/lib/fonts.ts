import { Inter, Manrope } from "next/font/google";

import type { Locale } from "@/i18n/config";

/**
 * Two faces, two subset sets, chosen per page.
 *
 * Both families are served as variable fonts, one file per subset — so
 * declaring Cyrillic means every visitor downloads it, including the
 * Azerbaijani ones who will never render a Cyrillic character. That was around
 * a fifth of the page weight spent on an alphabet the page does not use.
 *
 * The variable names are identical in both sets, so nothing downstream knows
 * which one it got. Latin Extended is in both because Azerbaijani needs it
 * (ə ş ğ ı ö ü ç) and it costs little.
 */
// Written out at each call rather than shared: next/font reads these options
// at build time from the literal source, so a variable or a spread here is a
// compile error.
const interLatin = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const interCyrillic = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manropeLatin = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const manropeCyrillic = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

/** The Latin pair. What the panel and anything untranslated uses. */
export const fontVariables = `${interLatin.variable} ${manropeLatin.variable}`;

const fontVariablesCyrillic = `${interCyrillic.variable} ${manropeCyrillic.variable}`;

/** Russian pages get Cyrillic; everything else does not pay for it. */
export function fontVariablesFor(locale: Locale): string {
  return locale === "ru" ? fontVariablesCyrillic : fontVariables;
}
