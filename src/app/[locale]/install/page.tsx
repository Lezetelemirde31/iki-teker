import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstallScreen } from "@/components/pwa/install-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

/**
 * The page you send someone. Indexable and shareable, unlike the install prompt
 * itself, which only ever appears once a browser decides to offer it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = await getMessages(locale);
  return {
    title: messages.install.pageTitle,
    description: messages.install.pageLead,
    openGraph: {
      title: messages.install.pageTitle,
      description: messages.install.pageLead,
    },
  };
}

export default async function InstallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <InstallScreen locale={locale} messages={await getMessages(locale)} />;
}
