import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { FavoritesScreen } from "@/components/screens/favorites-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  return (
    <PageTransition>
      <AppHeader back title={t("favorites.title")} />
      <main className="web-page no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <FavoritesScreen locale={locale} messages={messages} />
      </main>
    </PageTransition>
  );
}
