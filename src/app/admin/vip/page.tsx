import { notFound } from "next/navigation";

import { VipOrders, type AdminVipOrder } from "@/components/admin/vip-orders";
import { can } from "@/server/authorization";
import { VIP_PACKAGES, bankDetails, vipOrderQueue } from "@/server/promotions";

/**
 * VIP orders, waiting ones first.
 *
 * This is where the platform's only revenue line is actually collected: a
 * seller transfers, quoting a reference, and somebody who can see the account
 * matches it here. Confirming is the single thing in the product that grants
 * VIP placement.
 */
export const dynamic = "force-dynamic";

export default async function AdminVipPage() {
  if (!(await can("moderateContent"))) notFound();

  const rows = await vipOrderQueue();
  const waiting = rows.filter((row) => row.status === "pending");
  const bank = bankDetails();

  // Only what has actually been collected. Pending orders are not revenue —
  // nobody has paid — and counting them would inflate the one figure on this
  // screen that somebody might report upwards.
  const collected = rows
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + row.amount, 0);

  const when = (date: Date) =>
    new Intl.DateTimeFormat("az-AZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const orders: AdminVipOrder[] = rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    listingTitle: row.listingTitle,
    sellerName: row.sellerName,
    days: row.days,
    amount: row.amount,
    status: row.status,
    createdAt: when(row.createdAt),
    note: row.note,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">VIP sifarişləri</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Hələ sifariş yoxdur."
            : `${waiting.length} köçürmə yoxlanmağı gözləyir · indiyədək yığılan ${collected} ₼`}
        </p>
      </div>

      {!bank && (
        <p className="bg-primary/10 rounded-xl px-4 py-3 text-xs leading-relaxed">
          Bank rekvizitləri təyin olunmayıb, ona görə satıcılara pulu hara köçürəcəklərini deyə
          bilmirik. Vercel-də <span className="tabular font-semibold">VIP_BANK_DETAILS</span>{" "}
          dəyişənini yazın.
        </p>
      )}

      <div className="bg-card border-border rounded-xl border p-4">
        <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          Qiymətlər
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {VIP_PACKAGES.map((option) => (
            <span key={option.days} className="text-sm">
              <span className="font-display font-extrabold">{option.amount} ₼</span>
              <span className="text-subtle-foreground"> · {option.days} gün</span>
            </span>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          Satıcı elanını VIP edəndə sifariş burada görünəcək.
        </p>
      ) : (
        <div className="max-w-3xl">
          <VipOrders orders={orders} />
        </div>
      )}
    </div>
  );
}
