"use client";

import { BadgeCheck, Check, Loader2, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminWorkshop = {
  id: string;
  slug: string;
  name: string;
  status: string;
  verified: boolean;
  promoted: boolean;
  mobileService: boolean;
  concurrentSlots: number;
  serviceCount: number;
  ownerName: string;
  summary: string;
};

const STATUS: Record<string, { label: string; variant: "muted" | "rentalSoft" | "warning" }> = {
  active: { label: "Kataloqda", variant: "rentalSoft" },
  moderation: { label: "Gözləyir", variant: "warning" },
  draft: { label: "Qaralama", variant: "muted" },
  archived: { label: "Arxiv", variant: "muted" },
};

/**
 * The workshop list, with the decisions a moderator makes about one.
 *
 * A workshop is a business somebody sends a broken motorcycle to, so letting
 * one into the directory is a real decision — taking one out sets it back
 * rather than deleting it, because the appointments already booked against it
 * still have to point somewhere.
 */
export function WorkshopRows({ workshops }: { workshops: AdminWorkshop[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function decide(id: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(id);
    setFailed(null);

    const response = await fetch(`/api/admin/workshops/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) router.refresh();
    else setFailed(id);
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      {workshops.map((workshop) => {
        const waiting = workshop.status === "moderation";
        const live = workshop.status === "active";

        return (
          <div
            key={workshop.id}
            className={cn(
              "bg-card border-border rounded-xl border p-3.5",
              !live && "opacity-80",
              waiting && "border-primary/40",
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{workshop.name}</span>
                  {workshop.verified && (
                    <BadgeCheck className="text-rental size-3.5 shrink-0" strokeWidth={2.4} />
                  )}
                  <Badge variant={STATUS[workshop.status]?.variant ?? "muted"} size="md">
                    {STATUS[workshop.status]?.label ?? workshop.status}
                  </Badge>
                  {workshop.mobileService && (
                    <Badge variant="muted" size="md">
                      <Truck className="size-3" /> Yerinə gəlir
                    </Badge>
                  )}
                  {workshop.promoted && (
                    <Badge variant="vip" size="md">
                      Ödənişli
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mt-1 text-xs">{workshop.summary}</p>
                <p className="text-subtle-foreground mt-1 text-[0.6875rem]">
                  {workshop.ownerName} · {workshop.serviceCount} xidmət · eyni vaxtda{" "}
                  {workshop.concurrentSlots} nəqliyyat
                </p>

                {failed === workshop.id && (
                  <p role="alert" className="text-destructive mt-1.5 text-[0.6875rem]">
                    Alınmadı. Yenidən cəhd edin.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-1.5">
                {!live && (
                  <Button
                    size="sm"
                    disabled={busy === workshop.id}
                    onClick={() => decide(workshop.id, { status: "active" })}
                  >
                    {busy === workshop.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Kataloqa burax
                  </Button>
                )}

                {live && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === workshop.id}
                    onClick={() => decide(workshop.id, { status: "archived" })}
                  >
                    <X className="size-3.5" />
                    Kataloqdan çıxar
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === workshop.id}
                  onClick={() => decide(workshop.id, { verified: !workshop.verified })}
                >
                  <BadgeCheck className="size-3.5" />
                  {workshop.verified ? "Nişanı götür" : "Təsdiqlə"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
