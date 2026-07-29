import { notFound } from "next/navigation";

import { ComingNext } from "@/components/screens/coming-next";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslator(await getMessages(locale));
  return <ComingNext title={t("listing.seller")} note={t("preview.hint")} />;
}
