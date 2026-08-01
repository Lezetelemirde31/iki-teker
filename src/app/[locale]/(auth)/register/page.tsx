import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AppHeader } from "@/components/layout/app-header";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { demoAuthAllowed } from "@/server/auth/sms";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; phone?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const { next, phone } = await searchParams;
  const destination = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : `/${locale}/account`;

  return (
    <>
      <AppHeader back title={t("auth.register")} />
      <AuthForm
        mode="register"
        locale={locale}
        messages={messages}
        redirectTo={destination}
        initialPhone={phone}
        smsAvailable={demoAuthAllowed()}
      />
    </>
  );
}
