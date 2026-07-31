import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { CheckoutScreen } from "@/components/screens/checkout-screen";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { getListing, getOfferForListing, getUser, isRangeAvailable, quote } from "@/server/data";
import { currentUserId } from "@/server/session";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const listing = await getListing(id);
  const offer = listing ? await getOfferForListing(listing.id) : undefined;
  if (!listing || !offer) notFound();

  // Without a valid, still-available range there is nothing to check out.
  const { start, end } = await searchParams;
  if (!start || !end || !isRangeAvailable(offer, start, end)) {
    redirect(`/${locale}/rental/${id}`);
  }

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const renter = await getUser(await currentUserId());
  if (!renter) notFound();

  return (
    <PageTransition>
      <AppHeader back title={t("checkout.title")} />
      <CheckoutScreen
        listing={listing}
        offer={offer}
        renter={renter}
        quote={quote(offer, start, end)}
        range={{ start, end }}
        locale={locale}
        messages={messages}
      />
    </PageTransition>
  );
}
