import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ComplaintsScreen } from "@/components/screens/complaints-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { canModerate } from "@/server/authorization";
import { complaintQueue } from "@/server/complaints";

/**
 * Reports. Same 404-not-403 rule as the moderation queue next door.
 */
export default async function ComplaintsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  if (!(await canModerate())) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const queue = await complaintQueue();

  return (
    <PageTransition>
      <AppHeader back title={t("complaints.title")} />
      <ComplaintsScreen queue={queue} locale={locale} messages={messages} />
    </PageTransition>
  );
}
