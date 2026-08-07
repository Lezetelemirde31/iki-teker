import { Flag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { ModerationScreen } from "@/components/screens/moderation-screen";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { formatNumber } from "@/lib/format";
import { canModerate } from "@/server/authorization";
import { openComplaints } from "@/server/complaints";
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
  const [queue, reports] = await Promise.all([moderationQueue(), openComplaints()]);

  return (
    <PageTransition>
      <AppHeader
        back
        title={t("moderation.title")}
        action={
          // The other half of the job. Without a way across, reports only get
          // read by a moderator who already knows the URL.
          <Link
            href={`/${locale}/admin/complaints`}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Flag className="size-4" />
            {reports > 0 && <Badge variant="warning" size="md">{formatNumber(reports, locale)}</Badge>}
          </Link>
        }
      />
      <ModerationScreen queue={queue} locale={locale} messages={messages} />
    </PageTransition>
  );
}
