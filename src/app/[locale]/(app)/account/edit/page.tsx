import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ProfileEditScreen } from "@/components/screens/profile-edit-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { requireUser } from "@/server/auth/guard";
import { getUser } from "@/server/data";

/** Your own account. Signed-in only, and only ever your own. */
export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { userId } = await requireUser(locale, `/${locale}/account/edit`);
  const user = await getUser(userId);
  if (!user) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  return (
    <PageTransition>
      <AppHeader back title={t("profile.title")} />
      <ProfileEditScreen user={user} locale={locale} messages={messages} />
    </PageTransition>
  );
}
