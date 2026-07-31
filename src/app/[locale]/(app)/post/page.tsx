import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { PostListingScreen } from "@/components/screens/post-listing-screen";
import { PostPartScreen } from "@/components/screens/post-part-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { categorySchemas } from "@/mocks/taxonomy";
import type { VehicleCategorySlug } from "@/types";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // The category decides which attributes the form asks for, so there is no
  // sensible form without one.
  const { category } = await searchParams;
  if (!category || !(category in categorySchemas)) {
    redirect(`/${locale}/home`);
  }

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  // Two forms, not one with branches everywhere. A vehicle is identified by a
  // make, model and year the server can verify; a part is identified by a title
  // only its seller knows. Sharing a component would mean half its fields being
  // meaningless at any given moment.
  const isPart = category === "parts" || category === "gear";

  return (
    <PageTransition>
      <AppHeader back title={t("post.title")} />
      {isPart ? (
        <PostPartScreen
          category={category as "parts" | "gear"}
          locale={locale}
          messages={messages}
        />
      ) : (
        <PostListingScreen
          category={category as VehicleCategorySlug}
          locale={locale}
          messages={messages}
        />
      )}
    </PageTransition>
  );
}
