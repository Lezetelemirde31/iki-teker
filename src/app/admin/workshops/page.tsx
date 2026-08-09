import { notFound } from "next/navigation";

import { WorkshopRows, type AdminWorkshop } from "@/components/admin/workshop-rows";
import { can } from "@/server/authorization";
import { allWorkshops } from "@/server/workshops";

/**
 * The service directory, from the other side.
 *
 * Ordered so anything waiting comes first: the question this screen answers is
 * "is somebody stuck outside the directory", and sorting by rating buries
 * exactly that.
 */
export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  if (!(await can("moderateContent"))) notFound();

  const rows = await allWorkshops();
  const waiting = rows.filter((row) => row.status === "moderation").length;
  const live = rows.filter((row) => row.status === "active").length;

  const workshops: AdminWorkshop[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    verified: row.verified,
    promoted: row.promoted,
    mobileService: row.mobileService,
    concurrentSlots: row.concurrentSlots,
    serviceCount: row.serviceCount,
    ownerName: row.ownerName,
    summary: (row.summary as Record<string, string>).az ?? "",
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Servislər</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Hələ servis yoxdur."
            : waiting > 0
              ? `${waiting} servis kataloqa buraxılmağı gözləyir, ${live} servis içəridədir.`
              : `${live} servis kataloqdadır. Gözləyən yoxdur.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          Servis qeydiyyatı açılanda burada görünəcək.
        </p>
      ) : (
        <div className="max-w-3xl">
          <WorkshopRows workshops={workshops} />
        </div>
      )}
    </div>
  );
}
