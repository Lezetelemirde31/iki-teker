import { notFound, redirect } from "next/navigation";

import { SplashScreen } from "@/components/screens/splash-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

export default async function SplashPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ skip?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Lets a demo jump straight past the intro when linking someone to the app.
  const { skip } = await searchParams;
  if (skip !== undefined) redirect(`/${locale}/home`);

  const messages = await getMessages(locale);
  return <SplashScreen locale={locale} messages={messages} />;
}
