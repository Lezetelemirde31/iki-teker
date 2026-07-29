import { notFound } from "next/navigation";

import { OnboardingScreen } from "@/components/screens/onboarding-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <OnboardingScreen locale={locale} messages={await getMessages(locale)} />;
}
