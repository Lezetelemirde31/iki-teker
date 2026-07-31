"use client";

import { Archive, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";
import type { ListingStatus } from "@/types";

/**
 * The bar a seller sees on their own listing instead of the contact buttons.
 *
 * Publishing something you cannot withdraw is a trap: a wrong price or a
 * motorcycle sold last week would sit there forever, wasting every buyer who
 * calls about it. So the two things a seller actually needs are here.
 *
 * Sold and archived are separate. "Sold" is the useful public fact — buyers
 * seeing a sold listing learn the market cleared at that price — while
 * archiving takes it out of sight without claiming anything. Deleting is
 * offered too, but it asks first, because it is the one action that cannot be
 * undone and a relisted motorcycle would otherwise have to be retyped.
 */
export function OwnerActions({
  listingId,
  status,
  views,
  contacts,
}: {
  listingId: string;
  status: ListingStatus;
  views: number;
  contacts: number;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [current, setCurrent] = useState(status);

  async function setStatus(next: ListingStatus) {
    setBusy(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.ok) {
        setCurrent(next);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
      if (response.ok) {
        // The listing no longer exists, so staying on its page would 404.
        router.replace(`/${locale}/home`);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
      {/* What the listing has produced, which is the reason to keep or promote it. */}
      <p className="text-subtle-foreground tabular mb-2.5 text-center text-[0.6875rem]">
        {t("owner.stats", { views: String(views), contacts: String(contacts) })}
      </p>

      {confirming ? (
        <div className="space-y-2">
          <p className="text-destructive text-center text-xs font-semibold">
            {t("owner.deleteConfirm")}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              block
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="danger" size="lg" block disabled={busy} onClick={remove}>
              <Trash2 />
              {t("owner.deleteYes")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {current === "active" ? (
            <>
              <Button
                variant="rental"
                size="lg"
                className="flex-[1.3]"
                disabled={busy}
                onClick={() => setStatus("sold")}
              >
                <CheckCircle2 />
                {t("owner.markSold")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={busy}
                onClick={() => setStatus("archived")}
              >
                <Archive />
                {t("owner.archive")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={busy}
              onClick={() => setStatus("active")}
            >
              <RotateCcw />
              {t("owner.republish")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            aria-label={t("owner.delete")}
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="text-destructive shrink-0"
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
