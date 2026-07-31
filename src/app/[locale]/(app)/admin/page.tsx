import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ModerationScreen } from "@/components/screens/moderation-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { canModerate } from "@/server/authorization";
import { moderationQueue } from "@/server/moderation";

/**
 * Moderation.
 *
 * Answers 404 rather than 403 to anyone without the role. A 403 confirms the
 * page exists, which is a small piece of free reconnaissance for no benefit —
 * a moderator already knows where it is.
 */
export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (!(await canModerate())) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const queue = await moderationQueue();

  return (
    <PageTransition>
      <AppHeader back title={t("moderation.title")} />
      <ModerationScreen queue={queue} locale={locale} messages={messages} />
    </PageTransition>
  );
}
