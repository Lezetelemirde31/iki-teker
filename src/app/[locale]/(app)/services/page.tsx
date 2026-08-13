import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { WorkshopCard } from "@/components/service/workshop-card";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { listWorkshops } from "@/server/workshops";

/**
 * The workshop directory.
 *
 * Paid placement first, then rating — the order `listWorkshops` returns, not a
 * second sort applied here, so there is one place the ranking is decided.
 */
export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const workshops = await listWorkshops();

  return (
    <PageTransition>
      <AppHeader back title={t("services.title")} />

      <main className="web-page no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-3 px-4 py-4">
          <p className="text-muted-foreground text-xs">{t("services.subtitle")}</p>

          {workshops.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("services.empty")}</p>
          ) : (
            <div className="space-y-2">
              {workshops.map((workshop) => (
                <WorkshopCard
                  key={workshop.id}
                  workshop={workshop}
                  locale={locale}
                  messages={messages}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
