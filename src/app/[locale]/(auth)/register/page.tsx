import { notFound } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { AppHeader } from "@/components/layout/app-header";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const { next } = await searchParams;
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/home`;

  return (
    <>
      <AppHeader back title={t("auth.register")} />
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <RegisterForm locale={locale} messages={messages} redirectTo={destination} />
      </main>
    </>
  );
}
