import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

import { VehicleArt } from "@/components/common/vehicle-art";
import { VipButton } from "@/components/listing/vip-button";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatPrice } from "@/lib/format";
import type { CatalogItem, ListingStatus } from "@/types";

type OwnListing = {
  item: CatalogItem;
  rejection?: { reason: string; note: string | null };
  /** A VIP order already waiting on a transfer, if there is one. */
  vipPending?: { reference: string; days: number; amount: number };
};

/**
 * A seller's own listings, every status included.
 *
 * The public profile shows active listings only — correct for a buyer, useless
 * for the seller. Once listings started going to a moderation queue, someone
 * could publish one and find no trace of it anywhere, which reads as lost work
 * rather than as waiting.
 *
 * A rejected listing states its reason here. Being told "rejected" and nothing
 * else is what makes a marketplace feel arbitrary, and the reason is the only
 * part the seller can act on.
 */
export function OwnListings({
  listings,
  locale,
  messages,
  vipPackages,
  bankDetails,
}: {
  listings: OwnListing[];
  locale: Locale;
  messages: Messages;
  vipPackages: { days: number; amount: number }[];
  bankDetails?: string;
}) {
  const t = createTranslator(messages);

  return (
    <div className="space-y-2">
      {listings.map(({ item, rejection, vipPending }) => {
        const cover = item.photos[0];

        return (
          // A div, not a link, since the VIP controls live inside it — nesting
          // buttons in an anchor makes every tap ambiguous. The title is the
          // link instead.
          <div
            key={item.id}
            className="bg-card border-border block rounded-xl border p-3"
          >
            <div className="flex items-center gap-3">
              {cover && (
                <VehicleArt
                  src={cover.url}
                  seed={cover.seed}
                  tone={cover.tone}
                  shape={item.category}
                  className="size-12 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/listing/${item.id}`}
                  className="truncate text-sm font-semibold"
                >
                  {item.title}
                </Link>
                <p className="tabular mt-0.5 text-xs font-semibold">
                  {formatPrice(item.price, locale)}
                </p>
                <StatusBadge status={item.status} messages={messages} />
              </div>
            </div>

            {/* Only for a listing that is actually in the catalogue. Selling a
                place in a queue it has not been let into would be selling
                nothing. */}
            {item.status === "active" && (
              <VipButton
                listingId={item.id}
                packages={vipPackages}
                {...(bankDetails ? { bankDetails } : {})}
                {...(item.promotion.vip && item.promotion.vipUntil
                  ? { vipUntil: item.promotion.vipUntil }
                  : {})}
                {...(vipPending ? { pending: vipPending } : {})}
              />
            )}

            {rejection && (
              <p className="bg-destructive/10 text-destructive mt-2.5 flex items-start gap-2 rounded-lg px-3 py-2 text-[0.6875rem] leading-relaxed">
                <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2.2} />
                <span>
                  {t(`moderation.reasons.${rejection.reason}` as Parameters<typeof t>[0])}
                  {rejection.note && ` — ${rejection.note}`}
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, messages }: { status: ListingStatus; messages: Messages }) {
  const t = createTranslator(messages);

  if (status === "moderation") {
    return (
      <Badge variant="warning" size="md" className="mt-1">
        <Clock className="size-3" />
        {t("moderation.pending")}
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge variant="muted" size="md" className="mt-1">
        {t("moderation.rejectedBadge")}
      </Badge>
    );
  }
  if (status === "sold") {
    return (
      <Badge variant="rentalSoft" size="md" className="mt-1">
        {t("owner.soldBadge")}
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge variant="muted" size="md" className="mt-1">
        {t("owner.archivedBadge")}
      </Badge>
    );
  }
  // Active needs no badge — it is the state a seller expects.
  return null;
}
