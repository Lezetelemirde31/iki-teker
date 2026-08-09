import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { recentActions } from "@/server/audit";
import { can } from "@/server/authorization";

/**
 * The audit log.
 *
 * Reads the table and nothing else — every row here was written by whichever
 * module performed the action, and nothing in the panel may edit or remove one.
 * A log somebody can tidy answers no question worth asking.
 *
 * The two values are the reason this is worth reading: "changed the status"
 * tells nobody anything, "moderation → active" tells them everything.
 */
export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  approveListing: "Elanı təsdiqlədi",
  rejectListing: "Elanı rədd etdi",
  upholdComplaint: "Şikayəti qəbul etdi",
  setRole: "Rolu dəyişdi",
  releaseIdentity: "Kimliyi azad etdi",
};

const ENTITIES: Record<string, string> = {
  listing: "Elan",
  user: "İstifadəçi",
  workshop: "Servis",
  review: "Rəy",
  booking: "Bron",
};

export default async function AdminActivityPage() {
  if (!(await can("viewAudit"))) notFound();

  const rows = await recentActions(200);

  const when = (date: Date) =>
    new Intl.DateTimeFormat("az-AZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Jurnal</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length > 0
            ? `Son ${rows.length} əməliyyat. Bu siyahı dəyişdirilə bilmir.`
            : "Hələ heç bir əməliyyat qeydə alınmayıb."}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          Panel vasitəsilə ilk qərar veriləndə burada görünəcək.
        </p>
      ) : (
        <div className="bg-card border-border overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-border text-subtle-foreground border-b text-left">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:uppercase">
                  <th>Vaxt</th>
                  <th>Kim</th>
                  <th>Nə etdi</th>
                  <th>Nəyi</th>
                  <th>Dəyişiklik</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="[&>td]:px-4 [&>td]:py-2.5 [&>td]:align-top">
                    <td className="text-subtle-foreground tabular whitespace-nowrap text-xs">
                      {when(row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap font-medium">
                      {row.actor?.name ?? row.actorId}
                    </td>
                    <td className="whitespace-nowrap">{ACTIONS[row.action] ?? row.action}</td>
                    <td className="max-w-[18rem]">
                      <span className="text-subtle-foreground text-[0.6875rem]">
                        {ENTITIES[row.entityType] ?? row.entityType}
                      </span>
                      <br />
                      {/* Frozen at the time, so it still reads after the thing
                          itself is renamed or gone. */}
                      <span className="truncate">{row.entityLabel}</span>
                    </td>
                    <td>
                      {row.fromValue || row.toValue ? (
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Badge variant="muted" size="md">
                            {row.fromValue ?? "—"}
                          </Badge>
                          <ArrowRight className="text-subtle-foreground size-3 shrink-0" />
                          <Badge variant="rentalSoft" size="md">
                            {row.toValue ?? "—"}
                          </Badge>
                        </span>
                      ) : (
                        <span className="text-subtle-foreground">—</span>
                      )}
                      {row.note && (
                        <p className="text-subtle-foreground mt-1 text-[0.6875rem]">{row.note}</p>
                      )}
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
