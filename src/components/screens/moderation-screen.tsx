"use client";

import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { VehicleArt } from "@/components/common/vehicle-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import type { CatalogItem, ModerationFlag } from "@/types";

type QueueItem = {
  item: CatalogItem;
  sellerName: string;
  sellerVerified: boolean;
  flags: ModerationFlag[];
  submittedAt: string;
};

const reasons = [
  "prohibited",
  "misleading",
  "duplicate",
  "contactInfo",
  "poorQuality",
  "wrongCategory",
  "other",
] as const;

/**
 * The moderation queue.
 *
 * Approving is one tap because most listings are fine and a queue that takes
 * two taps per item does not get emptied. Rejecting asks for a reason first,
 * because the seller is going to be told why and "rejected" on its own makes a
 * platform look arbitrary.
 *
 * Flags are shown, never acted on automatically. They order attention; the
 * decision stays a person's.
 */
export function ModerationScreen({
  queue,
  locale,
  messages,
}: {
  queue: QueueItem[];
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const t = createTranslator(messages);

  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "approved" | "rejected" | "taken">>({});

  async function decide(id: string, action: "approve" | "reject", reason?: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/moderation/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        setDone((current) => ({
          ...current,
          [id]: action === "approve" ? "approved" : "rejected",
        }));
        setRejecting(null);
        setTimeout(() => router.refresh(), 1200);
        return;
      }
      // Another moderator got there first. Say so rather than retrying.
      if (response.status === 409) {
        setDone((current) => ({ ...current, [id]: "taken" }));
        setRejecting(null);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  if (queue.length === 0) {
    return (
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <span className="bg-rental-soft text-rental grid size-14 place-items-center rounded-full">
            <Check className="size-7" strokeWidth={2.6} />
          </span>
          <p className="mt-4 text-sm font-semibold">{t("moderation.empty")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("moderation.emptyBody")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
      <div className="space-y-2 px-4 py-3">
        <p className="text-muted-foreground px-0.5 pb-1 text-xs font-semibold">
          {t("moderation.waiting", { count: String(queue.length) })}
        </p>

        {queue.map(({ item, sellerName, sellerVerified, flags, submittedAt }) => {
          const outcome = done[item.id];
          const cover = item.photos[0];

          return (
            <div key={item.id} className="bg-card border-border rounded-xl border p-3">
              <div className="flex items-start gap-3">
                {cover && (
                  <VehicleArt
                    seed={cover.seed}
                    tone={cover.tone}
                    shape={item.category}
                    className="size-14 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="tabular mt-0.5 text-sm font-semibold">
                    {formatPrice(item.price, locale)}
                  </p>
                  <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                    {sellerName}
                    {!sellerVerified && ` · ${t("moderation.unverified")}`} ·{" "}
                    {formatRelativeTime(submittedAt, locale)}
                  </p>
                </div>
              </div>

              {/* Hints, not verdicts. */}
              {flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {flags.map((flag) => (
                    <Badge key={flag} variant="warning" size="md">
                      <AlertTriangle className="size-3" />
                      {t(`moderation.flags.${flag}` as Parameters<typeof t>[0])}
                    </Badge>
                  ))}
                </div>
              )}

              {outcome ? (
                <Badge
                  variant={outcome === "approved" ? "rentalSoft" : "muted"}
                  size="md"
                  className="mt-2.5"
                >
                  {outcome === "approved" && <Check className="size-3" strokeWidth={3} />}
                  {outcome === "taken" && <Clock className="size-3" />}
                  {t(`moderation.${outcome}` as Parameters<typeof t>[0])}
                </Badge>
              ) : rejecting === item.id ? (
                <div className="mt-2.5 space-y-2">
                  <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
                    {t("moderation.pickReason")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((reason) => (
                      <Chip
                        key={reason}
                        onClick={() => decide(item.id, "reject", reason)}
                        selected={false}
                      >
                        {t(`moderation.reasons.${reason}` as Parameters<typeof t>[0])}
                      </Chip>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    block
                    onClick={() => setRejecting(null)}
                    disabled={busy === item.id}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="rental"
                    block
                    disabled={busy === item.id}
                    onClick={() => decide(item.id, "approve")}
                  >
                    <Check className="size-4" strokeWidth={2.6} />
                    {t("moderation.approve")}
                  </Button>
                  <Button
                    variant="outline"
                    block
                    disabled={busy === item.id}
                    onClick={() => setRejecting(item.id)}
                  >
                    <X className="size-4" strokeWidth={2.6} />
                    {t("moderation.reject")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
