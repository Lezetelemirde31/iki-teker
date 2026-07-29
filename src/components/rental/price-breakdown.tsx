import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatPrice } from "@/lib/format";
import type { Quote } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Line-by-line total. The renter sees the full amount before sending the
 * request, so there is nothing to argue about at handover.
 */
export function PriceBreakdown({
  quote,
  locale,
  messages,
  showTotal = true,
  showServiceFee = false,
  className,
}: {
  quote: Quote;
  locale: Locale;
  messages: Messages;
  showTotal?: boolean;
  showServiceFee?: boolean;
  className?: string;
}) {
  const t = createTranslator(messages);

  return (
    <div className={cn("bg-card border-border rounded-xl border p-3.5", className)}>
      <Row
        label={`${formatPrice(quote.dayPrice, locale)} × ${t("rental.days", { count: quote.days })}`}
        value={formatPrice(quote.subtotal, locale)}
      />
      {showServiceFee && (
        <Row label={t("checkout.serviceFee")} value={formatPrice(quote.serviceFee, locale)} />
      )}
      <Row
        label={`${t("common.deposit")} (${t("calendar.refundable")})`}
        value={formatPrice(quote.deposit, locale)}
      />

      {showTotal && (
        <div className="border-border mt-2 flex items-baseline justify-between gap-3 border-t pt-2.5">
          <span className="text-sm font-bold">{t("checkout.dueOnPickup")}</span>
          <span className="font-display tabular text-xl font-extrabold">
            {formatPrice(quote.total, locale)}
          </span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="tabular text-sm font-semibold">{value}</span>
    </div>
  );
}
