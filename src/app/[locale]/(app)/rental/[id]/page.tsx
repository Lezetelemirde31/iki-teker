import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { ListingGallery } from "@/components/listing/listing-gallery";
import { PageTransition } from "@/components/motion/page-transition";
import { RentalScreen } from "@/components/screens/rental-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { demoISODate } from "@/lib/demo-clock";
import { getListing, getOfferForListing } from "@/lib/queries";

export default async function RentalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const listing = getListing(id);
  const offer = listing ? getOfferForListing(listing.id) : undefined;
  if (!listing || !offer) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const { start, end } = await searchParams;
  const today = demoISODate(0);

  return (
    <PageTransition>
      <AppHeader
        back
        title={<span className="sr-only">{t("rental.title")}</span>}
        action={<FavoriteButton id={listing.id} />}
      />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <ListingGallery
          photos={listing.photos}
          shape={listing.category}
          badge={offer.availableFrom <= today ? t("rental.availableToday") : undefined}
        />

        <RentalScreen
          listing={listing}
          offer={offer}
          locale={locale}
          messages={messages}
          today={today}
          initialRange={{ start, end }}
        />
      </main>
    </PageTransition>
  );
}
