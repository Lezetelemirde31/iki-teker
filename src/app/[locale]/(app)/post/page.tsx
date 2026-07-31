import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { PostListingScreen } from "@/components/screens/post-listing-screen";
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

  return (
    <PageTransition>
      <AppHeader back title={t("post.title")} />
      <PostListingScreen
        category={category as VehicleCategorySlug}
        locale={locale}
        messages={messages}
      />
    </PageTransition>
  );
}
