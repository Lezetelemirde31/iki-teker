import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/i18n/config";

/**
 * The entry point goes straight to the home screen.
 *
 * It used to hold a splash for two seconds and then a four-panel intro with a
 * button at the bottom, which is a reasonable thing to show somebody who has
 * just installed an application and a poor thing to show somebody who typed the
 * address. Anyone arriving at the site wants the listings, and the intro sat
 * between them and the listings every single visit.
 *
 * The intro itself is kept at `/[locale]/onboarding` — a first run in the
 * native shell is the place it belongs, and it is one link away when wanted.
 */
export default async function LocaleEntryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/home`);
}
