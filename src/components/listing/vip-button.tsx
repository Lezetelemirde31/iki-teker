"use client";

import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export type VipPackageOption = { days: number; amount: number };

/**
 * Buying VIP placement for your own listing.
 *
 * Nothing here charges anybody, and the screen says so plainly. Ordering
 * produces a reference and instructions; the listing rises when somebody who
 * can see the bank account confirms the transfer arrived. Implying otherwise —
 * a "pay" button, a spinner, a success tick — would be selling a card checkout
 * that does not exist.
 */
export function VipButton({
  listingId,
  packages,
  bankDetails,
  vipUntil,
  pending,
}: {
  listingId: string;
  packages: VipPackageOption[];
  /** Absent until an account is configured; the flow says so rather than inventing one. */
  bankDetails?: string;
  /** Set while the listing is currently promoted. */
  vipUntil?: string;
  /** A reference already waiting on a transfer. */
  pending?: { reference: string; days: number; amount: number };
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [placed, setPlaced] = useState<{ reference: string; days: number; amount: number } | null>(
    null,
  );

  const waiting = placed ?? pending;

  async function order(days: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/vip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, days }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setPlaced(data.order);
        setOpen(false);
        return;
      }

      const key = `vip.error.${data?.error}` as Parameters<typeof t>[0];
      const message = t(key);
      setError(message === key ? t("vip.error.generic") : message);
    } catch {
      setError(t("vip.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  if (vipUntil) {
    return (
      <div className="mt-2.5 flex items-center gap-2">
        <Badge variant="vip" size="md">
          <Sparkles className="size-3" /> VIP
        </Badge>
        <span className="text-subtle-foreground text-[0.6875rem]">
          {t("vip.until", { date: vipUntil })}
        </span>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="border-border mt-2.5 space-y-2 rounded-lg border p-3">
        <p className="text-xs font-semibold">{t("vip.awaiting")}</p>

        <div className="bg-surface-2 flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="text-subtle-foreground text-[0.6875rem]">{t("vip.reference")}</span>
          <span className="tabular flex-1 text-sm font-bold">{waiting.reference}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(waiting.reference);
              setCopied(true);
            }}
            className="text-muted-foreground shrink-0"
            aria-label={t("vip.copy")}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>

        <p className="text-muted-foreground text-[0.6875rem] leading-relaxed">
          {t("vip.howToPay", { amount: `${waiting.amount} ₼`, days: waiting.days })}
        </p>

        {bankDetails ? (
          <p className="bg-surface-2 rounded-lg px-3 py-2 text-[0.6875rem] leading-relaxed whitespace-pre-line">
            {bankDetails}
          </p>
        ) : (
          <p className="text-subtle-foreground text-[0.6875rem]">{t("vip.noBankYet")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Sparkles className="size-3.5" />
          {t("vip.promote")}
        </Button>
      ) : (
        <div className="border-border space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold">{t("vip.pick")}</p>

          <div className="grid grid-cols-3 gap-1.5">
            {packages.map((option) => (
              <button
                key={option.days}
                type="button"
                disabled={busy}
                onClick={() => order(option.days)}
                className={cn(
                  "border-border hover:border-primary rounded-lg border px-2 py-2.5 text-center transition-colors",
                  busy && "opacity-60",
                )}
              >
                <span className="font-display block text-sm font-extrabold">{option.amount} ₼</span>
                <span className="text-subtle-foreground block text-[0.625rem]">
                  {t("vip.days", { count: option.days })}
                </span>
              </button>
            ))}
          </div>

          {busy && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
              <Loader2 className="size-3 animate-spin" /> {t("common.loading")}
            </p>
          )}

          {error && (
            <p role="alert" className="text-destructive text-[0.6875rem]">
              {error}
            </p>
          )}

          <p className="text-subtle-foreground text-[0.6875rem] leading-relaxed">
            {t("vip.transferNote")}
          </p>
        </div>
      )}
    </div>
  );
}
