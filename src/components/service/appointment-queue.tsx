"use client";

import { Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatPrice, localized } from "@/lib/format";
import type { Appointment, ServiceItem } from "@/types";

/**
 * Requests waiting on a workshop.
 *
 * Confirming can fail for a reason that is nobody's fault — the hour filled up
 * while this list was on screen — so a 409 is shown as "that hour is full"
 * rather than as an error. The row stays where it is either way; the owner is
 * told what happened and can decline it instead.
 */
export function AppointmentQueue({
  appointments,
  services,
  customers,
  locale,
  messages,
}: {
  appointments: Appointment[];
  services: Record<string, ServiceItem>;
  customers: Record<string, string>;
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const router = useRouter();
  const [state, setState] = useState<Record<string, "confirmed" | "declined" | "taken" | "busy">>(
    {},
  );

  async function answer(id: string, action: "confirm" | "decline") {
    if (state[id]) return;
    setState((current) => ({ ...current, [id]: "busy" }));

    const response = await fetch(`/api/appointments/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (response.ok) {
      setState((current) => ({
        ...current,
        [id]: action === "confirm" ? "confirmed" : "declined",
      }));
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => null);
    setState((current) => ({ ...current, [id]: data?.error === "taken" ? "taken" : "busy" }));
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => {
        const service = services[appointment.serviceId];
        const outcome = state[appointment.id];

        return (
          <div key={appointment.id} className="bg-card border-border rounded-xl border p-3">
            <div className="flex items-start gap-3">
              <span className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <Clock className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {localized(service?.name, locale) || appointment.serviceId}
                </p>
                <p className="text-muted-foreground tabular mt-0.5 text-xs">
                  {appointment.date} · {appointment.time}
                </p>
                <p className="text-subtle-foreground mt-0.5 truncate text-[0.6875rem]">
                  {customers[appointment.customerId] ?? ""} · {appointment.vehicleLabel}
                </p>
              </div>
              <Badge variant="muted" size="md">
                {formatPrice(appointment.priceEstimate, locale)}
              </Badge>
            </div>

            {outcome === "confirmed" || outcome === "declined" ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {t(outcome === "confirmed" ? "appointment.confirmed" : "appointment.declined")}
              </p>
            ) : (
              <div className="mt-2.5 space-y-1.5">
                {outcome === "taken" && (
                  <p role="alert" className="text-destructive text-[0.6875rem]">
                    {t("appointment.error.taken")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={outcome === "busy"}
                    onClick={() => answer(appointment.id, "confirm")}
                  >
                    <Check className="size-3.5" /> {t("appointment.confirm")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={outcome === "busy"}
                    onClick={() => answer(appointment.id, "decline")}
                  >
                    <X className="size-3.5" /> {t("appointment.decline")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
