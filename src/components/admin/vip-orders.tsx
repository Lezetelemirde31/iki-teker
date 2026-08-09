"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminVipOrder = {
  id: string;
  reference: string;
  listingTitle: string;
  sellerName: string;
  days: number;
  amount: number;
  status: string;
  createdAt: string;
  note: string | null;
};

const STATUS: Record<string, { label: string; variant: "muted" | "rentalSoft" | "warning" }> = {
  pending: { label: "Ödəniş gözlənilir", variant: "warning" },
  paid: { label: "Ödənilib", variant: "rentalSoft" },
  rejected: { label: "Rədd edilib", variant: "muted" },
  cancelled: { label: "Ləğv edilib", variant: "muted" },
};

/**
 * The transfers waiting to be checked against the bank account.
 *
 * Confirming is the only thing in the product that grants VIP, so it asks for
 * the reference to be read rather than offering a one-tap approve: the person
 * doing this is matching a line on a statement, and the button should feel like
 * that rather than like clearing a queue.
 */
export function VipOrders({ orders }: { orders: AdminVipOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function decide(id: string, action: "confirm" | "reject") {
    if (busy) return;
    setBusy(id);
    setFailed(null);

    const response = await fetch(`/api/admin/vip/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note: notes[id] }),
    });

    if (response.ok) router.refresh();
    else setFailed(id);
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const waiting = order.status === "pending";

        return (
          <div
            key={order.id}
            className={cn(
              "bg-card border-border rounded-xl border p-3.5",
              waiting ? "border-primary/40" : "opacity-80",
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="tabular text-sm font-bold">{order.reference}</span>
                  <Badge variant={STATUS[order.status]?.variant ?? "muted"} size="md">
                    {STATUS[order.status]?.label ?? order.status}
                  </Badge>
                </div>

                <p className="mt-1 truncate text-sm font-semibold">{order.listingTitle}</p>
                <p className="text-subtle-foreground mt-0.5 text-[0.6875rem]">
                  {order.sellerName} · {order.days} gün · {order.amount} ₼ · {order.createdAt}
                </p>

                {order.note && (
                  <p className="text-subtle-foreground mt-1 text-[0.6875rem]">{order.note}</p>
                )}

                {failed === order.id && (
                  <p role="alert" className="text-destructive mt-1.5 text-[0.6875rem]">
                    Alınmadı. Yenidən cəhd edin.
                  </p>
                )}
              </div>

              {waiting && (
                <div className="flex shrink-0 flex-col gap-1.5">
                  <input
                    value={notes[order.id] ?? ""}
                    onChange={(event) =>
                      setNotes((all) => ({ ...all, [order.id]: event.target.value }))
                    }
                    placeholder="Qeyd (istəyə bağlı)"
                    className="bg-surface-2 border-border w-52 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busy === order.id}
                      onClick={() => decide(order.id, "confirm")}
                    >
                      {busy === order.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Ödəniş gəldi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={busy === order.id}
                      onClick={() => decide(order.id, "reject")}
                    >
                      <X className="size-3.5" />
                      Gəlmədi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
