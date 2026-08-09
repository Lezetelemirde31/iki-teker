import { notFound } from "next/navigation";

import { ReviewRows, type AdminReview } from "@/components/admin/review-rows";
import { can } from "@/server/authorization";
import { allReviews } from "@/server/reviews";

/**
 * Every review, newest first, with the one action a moderator has: hide it.
 *
 * Hidden ones stay in the list. Hiding is meant to be reversible, and a screen
 * that drops what it has acted on offers no way back.
 */
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  if (!(await can("moderateContent"))) notFound();

  const rows = await allReviews(200);
  const hidden = rows.filter((row) => row.hidden).length;

  const when = (date: Date) =>
    new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "long", year: "numeric" }).format(
      date,
    );

  const reviews: AdminReview[] = rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    // Stored per locale; the panel is Azerbaijani.
    text: (row.text as Record<string, string>).az ?? "",
    hidden: row.hidden,
    createdAt: when(row.createdAt),
    authorName: row.authorName,
    targetName: row.targetName,
    verified: row.verifiedTransaction,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Rəylər</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Hələ rəy yoxdur."
            : `${rows.length} rəy${hidden > 0 ? `, ${hidden}-i gizlədilib` : ""}. Gizlədilən rəy ortalamaya daxil edilmir.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          İlk icarə tamamlananda burada görünəcək.
        </p>
      ) : (
        <div className="max-w-3xl">
          <ReviewRows reviews={reviews} />
        </div>
      )}
    </div>
  );
}
