import { notFound } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AppHeader } from "@/components/layout/app-header";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

export default async function LoginPage({
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

  // Only same-site paths are followed. An open redirect on a sign-in page is
  // how a phishing link borrows a real domain's credibility.
  const { next } = await searchParams;
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/home`;

  return (
    <>
      <AppHeader back title={t("auth.login")} />
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <LoginForm locale={locale} messages={messages} redirectTo={destination} />
      </main>
    </>
  );
}
