import { Inter, Manrope } from "next/font/google";

/**
 * Both faces ship Latin Extended (Azerbaijani: ə ş ğ ı ö ü ç) and Cyrillic,
 * so a single font stack serves all three locales without fallback swapping.
 *
 * Splitting these per locale — Cyrillic only on the Russian pages — was tried
 * and reverted: next/font puts every instance declared in this module into the
 * same stylesheet, so all six faces were declared on every page either way,
 * and the browser was already downloading only the subsets whose
 * `unicode-range` matched the text on screen. It cost a second pair of
 * declarations and saved nothing.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const fontVariables = `${inter.variable} ${manrope.variable}`;
