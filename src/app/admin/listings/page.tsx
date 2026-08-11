import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingRows, type AdminListing } from "@/components/admin/listing-rows";
import { adminListings, listingTotals } from "@/server/admin-listings";
import { can } from "@/server/authorization";

/**
 * The catalogue, every state included.
 *
 * Filtering happens on the server through the URL, so a filtered view is a
 * link — and so a catalogue of any size is never shipped whole to a browser to
 * be sifted there.
 */
export const dynamic = "force-dynamic";

const az = new Intl.NumberFormat("az-AZ");

const LABEL: Record<string, string> = {
  active: "Aktiv",
  moderation: "Gözləyir",
  draft: "Qaralama",
  sold: "Satılıb",
  archived: "Arxiv",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; vip?: string }>;
}) {
  if (!(await can("viewPanel"))) notFound();

  const { q, status, category, vip } = await searchParams;
  const [rows, totals, manage] = await Promise.all([
    adminListings({
      ...(q ? { search: q } : {}),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(vip === "1" ? { vipOnly: true } : {}),
    }),
    listingTotals(),
    can("manageCatalog"),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold">Elanlar</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Cəmi {az.format(totals.total)} elan
            {Object.entries(totals.byStatus)
              .filter(([, n]) => n > 0)
              .map(([key, n]) => ` · ${LABEL[key] ?? key} ${az.format(n)}`)
              .join("")}
          </p>
        </div>

        {manage && (
          <Link
            href="/admin/listings/new"
            className="bg-primary text-primary-foreground font-display flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-extrabold uppercase"
          >
            <Plus className="size-4" />
            Elan yerləşdir
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Başlıq və ya id"
          className="bg-card border-border w-64 rounded-lg border px-3 py-2 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="bg-card border-border rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="bg-card border-border rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="">Bütün kateqoriyalar</option>
          {["motorcycles", "scooters", "electric", "bicycles", "parts", "gear"].map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="vip" value="1" defaultChecked={vip === "1"} />
          Yalnız VIP
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Axtar
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          {totals.total === 0
            ? "Kataloq boşdur. Yuxarıdakı düymə ilə elan yerləşdir."
            : "Bu şərtlərə uyğun elan tapılmadı."}
        </p>
      ) : (
        <>
          <ListingRows listings={rows as AdminListing[]} />
          {rows.length === 100 && (
            <p className="text-subtle-foreground text-xs">
              İlk 100 göstərilir — daraltmaq üçün axtarışdan istifadə et.
            </p>
          )}
        </>
      )}
    </div>
  );
}
