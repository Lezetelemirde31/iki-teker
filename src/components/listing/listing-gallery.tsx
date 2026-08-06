"use client";

import { useRef, useState } from "react";

import { VehicleArt, type ArtShape } from "@/components/common/vehicle-art";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types";

/**
 * Swipeable photo gallery. Uses native horizontal scroll-snap rather than a
 * carousel library — it gets momentum, rubber-banding and accessibility from
 * the platform for free, and stays smooth on a low-end phone.
 */
export function ListingGallery({
  photos,
  shape,
  vip,
  badge,
}: {
  photos: Photo[];
  shape: ArtShape;
  vip?: boolean;
  badge?: string;
}) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        aria-label={t("listing.photoOf", { index: index + 1, total: photos.length })}
      >
        {photos.map((photo) => (
          <div key={photo.id} className="w-full shrink-0 snap-start">
            <VehicleArt
              src={photo.url}
              alt={photo.alt}
              seed={photo.seed}
              tone={photo.tone}
              shape={shape}
              rounded="rounded-none"
              className="aspect-[4/3] w-full"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="flex gap-1.5">
          {badge && <Badge variant="rental">{badge}</Badge>}
          {vip && <Badge variant="vip">VIP</Badge>}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
        <span className="glass tabular rounded-md px-2 py-1 text-[0.6875rem] font-semibold">
          {index + 1} / {photos.length}
        </span>
        <div className="flex gap-1">
          {photos.slice(0, 8).map((photo, dot) => (
            <span
              key={photo.id}
              className={cn(
                "size-1.5 rounded-full transition-all",
                dot === index ? "bg-foreground w-4" : "bg-foreground/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
