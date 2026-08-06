"use client";

import { Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { VehicleArt } from "@/components/common/vehicle-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatDateRange, formatPrice } from "@/lib/format";
import type { Booking, Listing, User } from "@/types";

/**
 * Requests waiting on the owner.
 *
 * Confirming can fail even though the button was enabled — someone else may
 * have been confirmed for those dates a moment earlier. That is the exclusion
 * constraint doing its job, so the row says so and removes itself rather than
 * pretending the request is still live.
 */
export function RequestQueue({
  requests,
  listings,
  renters,
  locale,
  messages,
}: {
  requests: Booking[];
  listings: Record<string, Listing>;
  renters: Record<string, User>;
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const t = createTranslator(messages);

  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<Record<string, "confirmed" | "declined" | "taken">>({});

  async function act(booking: Booking, action: "confirm" | "decline") {
    setBusy(booking.id);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/${action}`, { method: "POST" });
      if (response.ok) {
        setGone((current) => ({
          ...current,
          [booking.id]: action === "confirm" ? "confirmed" : "declined",
        }));
        // Confirmed dates block the other requests, so the rest of the queue is
        // now stale and the server has to rebuild it. Held back a moment first:
        // the rebuilt queue drops this row entirely, and an owner who accepts a
        // booking should see that it was accepted rather than watch it vanish.
        setTimeout(() => router.refresh(), 1200);
      } else if (response.status === 409) {
        setGone((current) => ({ ...current, [booking.id]: "taken" }));
        router.refresh();
      }
    } catch {
      // Left in place so it can be tried again.
    } finally {
      setBusy(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("requests.none")}</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map((booking) => {
        const listing = listings[booking.listingId];
        const renter = renters[booking.renterId];
        const cover = listing?.photos[0];
        const outcome = gone[booking.id];

        return (
          <div key={booking.id} className="bg-card border-border rounded-xl border p-3">
            <div className="flex items-center gap-3">
              {cover && listing && (
                <VehicleArt
                  src={cover.url}
                  seed={cover.seed}
                  tone={cover.tone}
                  shape={listing.category}
                  className="size-12 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{listing?.title}</p>
                <p className="text-muted-foreground tabular mt-0.5 text-xs">
                  {formatDateRange(booking.start, booking.end, locale)} ·{" "}
                  {t("rental.days", { count: booking.days })}
                </p>
                <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                  {renter?.name} · {booking.code}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm font-bold">
                {formatPrice(booking.subtotal, locale)}
              </span>
            </div>

            {outcome ? (
              <Badge
                variant={outcome === "confirmed" ? "rentalSoft" : "muted"}
                size="md"
                className="mt-2.5"
              >
                {outcome === "confirmed" && <Check className="size-3" strokeWidth={3} />}
                {outcome === "taken" && <Clock className="size-3" />}
                {t(`requests.${outcome}`)}
              </Badge>
            ) : (
              // Full-height buttons: accepting a booking is a commitment, and a
              // 36px target on a phone is how the wrong one gets tapped.
              <div className="mt-2.5 flex gap-2">
                <Button
                  variant="rental"
                  block
                  disabled={busy === booking.id}
                  onClick={() => act(booking, "confirm")}
                >
                  <Check className="size-4" strokeWidth={2.6} />
                  {t("requests.confirm")}
                </Button>
                <Button
                  variant="outline"
                  block
                  disabled={busy === booking.id}
                  onClick={() => act(booking, "decline")}
                >
                  <X className="size-4" strokeWidth={2.6} />
                  {t("requests.decline")}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
