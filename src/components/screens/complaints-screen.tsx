"use client";

import { Check, Clock, Flag, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatRelativeTime } from "@/lib/format";
import type { ComplaintItem } from "@/server/complaints";

/**
 * Reports waiting on a moderator.
 *
 * Upholding one about a listing takes it off the market; dismissing it says the
 * report was wrong. Both close the report, and neither is offered twice — the
 * second moderator to click gets told somebody already decided.
 *
 * The reported thing is a link. Almost no report can be judged from a reason
 * chip alone, and a moderator who cannot see what was reported will either
 * guess or skip.
 */
export function ComplaintsScreen({
  queue,
  locale,
  messages,
}: {
  queue: ComplaintItem[];
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const t = createTranslator(messages);

  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "upheld" | "dismissed" | "taken">>({});

  async function resolve(id: string, outcome: "upheld" | "dismissed") {
    setBusy(id);
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome }),
      });

      if (response.ok) {
        setDone((current) => ({ ...current, [id]: outcome }));
        setTimeout(() => router.refresh(), 1200);
        return;
      }
      // Another moderator got there first. Say so rather than retrying.
      if (response.status === 409) {
        setDone((current) => ({ ...current, [id]: "taken" }));
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
          <p className="mt-4 text-sm font-semibold">{t("complaints.empty")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("complaints.emptyBody")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
      <div className="space-y-2 px-4 py-3">
        <p className="text-muted-foreground px-0.5 pb-1 text-xs font-semibold">
          {t("complaints.waiting", { count: String(queue.length) })}
        </p>

        {queue.map((complaint) => {
          const outcome = done[complaint.id];
          const href =
            complaint.entityType === "listing"
              ? `/${locale}/listing/${complaint.entityId}`
              : `/${locale}/seller/${complaint.entityId}`;

          return (
            <div key={complaint.id} className="bg-card border-border rounded-xl border p-3">
              <div className="flex items-start gap-2">
                <Flag className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link href={href} className="truncate text-sm font-bold underline-offset-2 hover:underline">
                    {complaint.entityLabel}
                  </Link>
                  <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                    {t(`complaints.on.${complaint.entityType}` as Parameters<typeof t>[0])} ·{" "}
                    {complaint.reporterName} · {formatRelativeTime(complaint.createdAt, locale)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="warning" size="md">
                  {t(`report.reasons.${complaint.reason}` as Parameters<typeof t>[0])}
                </Badge>
              </div>

              {complaint.note && (
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {complaint.note}
                </p>
              )}

              {outcome ? (
                <Badge
                  variant={outcome === "upheld" ? "warning" : "muted"}
                  size="md"
                  className="mt-2.5"
                >
                  {outcome === "upheld" && <Check className="size-3" strokeWidth={3} />}
                  {outcome === "taken" && <Clock className="size-3" />}
                  {t(`complaints.${outcome}` as Parameters<typeof t>[0])}
                </Badge>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="outline"
                    block
                    disabled={busy === complaint.id}
                    onClick={() => resolve(complaint.id, "upheld")}
                  >
                    <Check className="size-4" strokeWidth={2.6} />
                    {t("complaints.uphold")}
                  </Button>
                  <Button
                    variant="ghost"
                    block
                    disabled={busy === complaint.id}
                    onClick={() => resolve(complaint.id, "dismissed")}
                  >
                    <X className="size-4" strokeWidth={2.6} />
                    {t("complaints.dismiss")}
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
