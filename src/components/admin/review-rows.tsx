"use client";

import { Eye, EyeOff, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminReview = {
  id: string;
  rating: number;
  text: string;
  hidden: boolean;
  createdAt: string;
  authorName: string;
  targetName: string;
  verified: boolean;
};

/**
 * The review list, with the one action it supports.
 *
 * Hidden rows stay in the list and stay readable. A moderation screen that
 * removes what it has acted on gives nobody a way to change their mind, and
 * hiding is meant to be reversible — that is why it is hiding and not deleting.
 */
export function ReviewRows({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function toggle(id: string, hidden: boolean) {
    if (busy) return;
    setBusy(id);
    setFailed(null);

    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hidden }),
    });

    if (response.ok) {
      // The target's average changes with it, and that number is on every card
      // and search result — so the tree rebuilds rather than this list alone.
      router.refresh();
    } else {
      setFailed(id);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      {reviews.map((review) => (
        <div
          key={review.id}
          className={cn(
            "bg-card border-border rounded-xl border p-3.5",
            review.hidden && "opacity-60",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        "size-3.5",
                        index < review.rating
                          ? "fill-primary text-primary"
                          : "text-subtle-foreground",
                      )}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold">{review.targetName}</span>
                <span className="text-subtle-foreground text-xs">
                  ← {review.authorName}
                </span>
                {review.verified && (
                  <Badge variant="rentalSoft" size="md">
                    Təsdiqlənmiş sövdələşmə
                  </Badge>
                )}
                {review.hidden && (
                  <Badge variant="warning" size="md">
                    Gizlədilib
                  </Badge>
                )}
              </div>

              <p className="mt-1.5 text-sm leading-relaxed">{review.text}</p>
              <p className="text-subtle-foreground tabular mt-1 text-[0.6875rem]">
                {review.createdAt}
              </p>

              {failed === review.id && (
                <p role="alert" className="text-destructive mt-1.5 text-[0.6875rem]">
                  Alınmadı. Yenidən cəhd edin.
                </p>
              )}
            </div>

            <Button
              size="sm"
              variant={review.hidden ? "outline" : "danger"}
              disabled={busy === review.id}
              onClick={() => toggle(review.id, !review.hidden)}
              className="shrink-0"
            >
              {busy === review.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : review.hidden ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5" />
              )}
              {review.hidden ? "Göstər" : "Gizlət"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
