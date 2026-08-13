import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DeviceFrame } from "@/components/layout/device-frame";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { isLocale, locales, localeMeta, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { fontVariablesFor } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${messages.app.name} — ${messages.app.tagline}`,
      template: `%s · ${messages.app.name}`,
    },
    description: messages.app.description,
    applicationName: messages.app.name,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        locales.map((code) => [localeMeta[code].htmlLang, `/${code}`]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: messages.app.name,
      title: `${messages.app.name} — ${messages.app.tagline}`,
      description: messages.app.description,
      locale: localeMeta[locale].htmlLang,
      url: `/${locale}`,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    // iOS has no manifest support, so standalone mode is opted into here.
    appleWebApp: {
      capable: true,
      title: messages.app.name,
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Lets content sit under the notch and home indicator; `safe-*` utilities pad it back.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typedLocale: Locale = locale;
  const messages = await getMessages(typedLocale);

  return (
    <html
      lang={localeMeta[typedLocale].htmlLang}
      className={fontVariablesFor(typedLocale)}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <I18nProvider locale={typedLocale} messages={messages}>
            <DeviceFrame locale={typedLocale}>{children}</DeviceFrame>
            <ServiceWorkerRegistration />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
