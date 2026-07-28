import { Inter, Manrope } from "next/font/google";

/**
 * Both faces ship Latin Extended (Azerbaijani: ə ş ğ ı ö ü ç) and Cyrillic,
 * so a single font stack serves all three locales without fallback swapping.
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
