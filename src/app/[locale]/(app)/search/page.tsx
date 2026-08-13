import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { ListingRow } from "@/components/listing/listing-cards";
import { SearchControls } from "@/components/search/search-controls";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { getOfferForListing, searchCatalog } from "@/server/data";
import { parseSearchQuery } from "@/lib/search-params";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const raw = await searchParams;
  const query = parseSearchQuery(raw);
  const engineBucket = Array.isArray(raw.engine) ? raw.engine[0] : raw.engine;

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const results = await searchCatalog(query, 1, 40);

  // Offers are resolved up front rather than inside the render loop: awaiting
  // per row would issue one query per result and serialise them all.
  const rentable = results.items.filter((item) => item.kind === "vehicle");
  const offers = new Map(
    (await Promise.all(rentable.map((item) => getOfferForListing(item.id))))
      .filter((offer) => offer !== undefined)
      .map((offer) => [offer.listingId, offer]),
  );

  return (
    <>
      <SearchControls
        query={query}
        locale={locale}
        engineBucket={engineBucket}
        resultCount={results.total}
      />

      <main className="web-page no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        {results.items.length === 0 ? (
          <EmptyState
            title={t("search.emptyTitle")}
            body={t("search.emptyBody")}
            action={
              <Button variant="outline" asChild>
                <Link href={`/${locale}/search`}>{t("search.clearAll")}</Link>
              </Button>
            }
          />
        ) : (
          // One result per line is right on a phone and wrong on a monitor,
          // where it makes each card a metre of whitespace with a photo at the
          // end. The rows themselves are unchanged; only how many sit beside
          // each other is.
          <div className="space-y-2 px-4 py-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {results.items.map((item) => (
              <ListingRow
                key={item.id}
                item={item}
                locale={locale}
                messages={messages}
                href={`/${locale}/listing/${item.id}`}
                rentalOffer={offers.get(item.id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
