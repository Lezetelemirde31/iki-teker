import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { allBookings } from "@/server/admin";
import { can } from "@/server/authorization";

/**
 * Every booking, newest first.
 *
 * Read-only on purpose. The owner confirms or declines, and the database's
 * exclusion constraint decides who gets a contested week. A button here that
 * overrode either would quietly become how disputes are settled — without the
 * overlap guard, without the notification, and without the owner ever agreeing.
 * When there is a dispute process, it gets its own screen and its own rules.
 */
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; variant: "muted" | "rentalSoft" | "warning" }> = {
  pending: { label: "Gözləyir", variant: "warning" },
  confirmed: { label: "Təsdiqlənib", variant: "rentalSoft" },
  active: { label: "Davam edir", variant: "rentalSoft" },
  returned: { label: "Qaytarılıb", variant: "muted" },
  cancelled: { label: "Ləğv edilib", variant: "muted" },
  disputed: { label: "Mübahisəli", variant: "warning" },
};

const az = new Intl.NumberFormat("az-AZ");

export default async function AdminRentalsPage() {
  if (!(await can("viewPanel"))) notFound();

  const rows = await allBookings(200);
  const counts = rows.reduce<Record<string, number>>((all, row) => {
    all[row.status] = (all[row.status] ?? 0) + 1;
    return all;
  }, {});

  const day = (value: unknown) =>
    new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "2-digit" }).format(
      new Date(String(value)),
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">İcarə</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Hələ rezervasiya yoxdur."
            : `${az.format(rows.length)} rezervasiya. Bu siyahı yalnız oxunur — təsdiq və imtinanı sahibi verir.`}
        </p>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, n]) => (
              <Badge key={status} variant={STATUS[status]?.variant ?? "muted"} size="md">
                {STATUS[status]?.label ?? status} · {az.format(n)}
              </Badge>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          İlk icarə sorğusu gələndə burada görünəcək.
        </p>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-border text-subtle-foreground border-b text-left">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:uppercase">
                  <th>Kod</th>
                  <th>Nəqliyyat</th>
                  <th>İcarəçi</th>
                  <th>Sahibi</th>
                  <th>Tarix</th>
                  <th>Məbləğ</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="[&>td]:px-4 [&>td]:py-2.5">
                    <td className="tabular whitespace-nowrap font-semibold">{row.code}</td>
                    <td className="max-w-[16rem] truncate">{row.listingTitle}</td>
                    <td className="whitespace-nowrap">{row.renterName}</td>
                    <td className="whitespace-nowrap">{row.ownerName}</td>
                    <td className="tabular whitespace-nowrap">
                      {day(row.startDate)} – {day(row.endDate)}
                      <span className="text-subtle-foreground"> · {row.days} gün</span>
                    </td>
                    <td className="tabular whitespace-nowrap">
                      {az.format(row.total)} ₼
                      {row.deposit > 0 && (
                        <span className="text-subtle-foreground">
                          {" "}
                          · depozit {az.format(row.deposit)}
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge variant={STATUS[row.status]?.variant ?? "muted"} size="md">
                        {STATUS[row.status]?.label ?? row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
