"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminListing = {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
  vip: boolean;
  vipUntil: string | null;
  views: number;
  contacts: number;
  sellerId: string;
  sellerName: string;
};

const STATUSES = ["active", "moderation", "draft", "sold", "archived"] as const;

const LABEL: Record<string, string> = {
  active: "Aktiv",
  moderation: "Gözləyir",
  draft: "Qaralama",
  sold: "Satılıb",
  archived: "Arxiv",
};

const az = new Intl.NumberFormat("az-AZ");

/**
 * The catalogue, with the two things the panel may change about a listing.
 *
 * Status is a select rather than buttons: there are five states and a row of
 * five buttons reads as five different actions when it is one.
 *
 * VIP granted here is free and says so in the log. It is for putting something
 * at the top deliberately — a launch, an apology — not a way around the orders
 * screen, which is where money is actually accounted for.
 */
export function ListingRows({ listings }: { listings: AdminListing[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function change(id: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(id);
    setFailed(null);

    const response = await fetch(`/api/admin/listings/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) router.refresh();
    else setFailed(id);
    setBusy(null);
  }

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] text-sm">
          <thead className="border-border text-subtle-foreground border-b text-left">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:uppercase">
              <th>Elan</th>
              <th>Satıcı</th>
              <th>Qiymət</th>
              <th>Baxış</th>
              <th>Status</th>
              <th>VIP</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {listings.map((listing) => (
              <tr
                key={listing.id}
                className={cn(
                  "[&>td]:px-4 [&>td]:py-2.5",
                  listing.status !== "active" && "opacity-70",
                )}
              >
                <td className="max-w-[20rem]">
                  <div className="truncate font-medium">{listing.title}</div>
                  <span className="text-subtle-foreground text-[0.625rem]">
                    {listing.id} · {listing.category}
                  </span>
                  {failed === listing.id && (
                    <p role="alert" className="text-destructive text-[0.625rem]">
                      Alınmadı.
                    </p>
                  )}
                </td>

                <td className="whitespace-nowrap">{listing.sellerName}</td>

                <td className="tabular whitespace-nowrap">{az.format(listing.price)} ₼</td>

                <td className="tabular whitespace-nowrap text-xs">
                  {az.format(listing.views)}
                  <span className="text-subtle-foreground"> · {az.format(listing.contacts)} kontakt</span>
                </td>

                <td>
                  <select
                    value={listing.status}
                    disabled={busy === listing.id}
                    onChange={(event) => change(listing.id, { status: event.target.value })}
                    className="bg-surface-2 border-border rounded-lg border px-2 py-1 text-xs outline-none"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {LABEL[status]}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  {listing.vip ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="vip" size="md">
                        <Sparkles className="size-3" />
                        {listing.vipUntil ?? "VIP"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === listing.id}
                        onClick={() => change(listing.id, { vip: false })}
                      >
                        Götür
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === listing.id}
                      onClick={() => change(listing.id, { vip: true, vipDays: 30 })}
                    >
                      {busy === listing.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      30 gün
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
