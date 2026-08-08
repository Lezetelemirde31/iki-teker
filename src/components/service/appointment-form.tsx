"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { useT } from "@/i18n/provider";
import { formatPrice, localized } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServiceItem } from "@/types";

/**
 * Asking a workshop for a slot.
 *
 * The times offered are generated from the workshop's own hours and the chosen
 * service's duration, so a job that would run past closing is never offered in
 * the first place. The server checks it again — this is convenience, not the
 * guard — but a form that lets someone pick 17:30 for a three-hour service only
 * to reject it afterwards is a form that wasted their time.
 *
 * Everything here is in the workshop's local day. No instant is ever
 * constructed, which is the point: the browser's timezone has no say in what
 * "ten in the morning" means to a garage in Baku.
 */
export function AppointmentForm({
  workshopId,
  services,
  openMinute,
  closeMinute,
  locale,
}: {
  workshopId: string;
  services: ServiceItem[];
  openMinute: number;
  closeMinute: number;
  locale: Locale;
}) {
  const t = useT();
  const router = useRouter();

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const service = services.find((item) => item.id === serviceId);

  // Half-hour starts, only those where the whole job fits before closing.
  const times = useMemo(() => {
    if (!service) return [];
    const slots: string[] = [];
    for (let minute = openMinute; minute + service.durationMinutes <= closeMinute; minute += 30) {
      slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return slots;
  }, [service, openMinute, closeMinute]);

  const ready = Boolean(serviceId && date && time && vehicleLabel.trim().length >= 2);

  async function submit() {
    if (!ready || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workshopId, serviceId, date, time, vehicleLabel, note }),
      });

      if (response.ok) {
        setDone(true);
        router.refresh();
        return;
      }

      const data = await response.json().catch(() => null);
      const key = `appointment.error.${data?.error}` as Parameters<typeof t>[0];
      const message = t(key);
      setError(message === key ? t("appointment.error.generic") : message);
    } catch {
      setError(t("appointment.error.generic"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="bg-rental/10 text-rental-foreground rounded-lg px-3 py-2 text-xs">
        {t("appointment.done")}
      </p>
    );
  }

  const field = "bg-surface-2 border-border w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const label = "text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase";

  return (
    <div className="border-border space-y-3 rounded-xl border p-3.5">
      <div className="space-y-1.5">
        <label htmlFor="ap-service" className={label}>
          {t("appointment.service")}
        </label>
        <select
          id="ap-service"
          value={serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            // The new service may not fit where the old one did.
            setTime("");
          }}
          className={field}
        >
          {services.map((item) => (
            <option key={item.id} value={item.id}>
              {localized(item.name, locale)} — {formatPrice(item.priceFrom, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="ap-date" className={label}>
            {t("appointment.date")}
          </label>
          <input
            id="ap-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={field}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ap-time" className={label}>
            {t("appointment.time")}
          </label>
          <select
            id="ap-time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={field}
          >
            <option value="">—</option>
            {times.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ap-vehicle" className={label}>
          {t("appointment.vehicle")}
        </label>
        <input
          id="ap-vehicle"
          value={vehicleLabel}
          onChange={(event) => setVehicleLabel(event.target.value)}
          placeholder={t("appointment.vehiclePlaceholder")}
          className={cn(field, "placeholder:text-subtle-foreground")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ap-note" className={label}>
          {t("appointment.note")}
        </label>
        <textarea
          id="ap-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("appointment.notePlaceholder")}
          rows={2}
          className={cn(field, "placeholder:text-subtle-foreground resize-none")}
        />
      </div>

      {service && (
        <p className="text-muted-foreground text-[0.6875rem]">
          {t("appointment.estimate", { price: formatPrice(service.priceFrom, locale) })} ·{" "}
          {t("appointment.estimateNote")}
        </p>
      )}

      {error && (
        <p role="alert" className="text-destructive text-[0.6875rem]">
          {error}
        </p>
      )}

      <Button size="sm" disabled={!ready || sending} onClick={submit} className="w-full">
        {t("appointment.submit")}
      </Button>
    </div>
  );
}
