"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Choosing the pictures for a listing.
 *
 * Half of what a listing is worth is its photos — a motorcycle nobody can see
 * is a motorcycle nobody messages about. So this sits at the top of the form,
 * before any field, because it is the first thing a seller has in hand and the
 * last thing they should have to hunt for.
 *
 * Each picture uploads the moment it is chosen rather than on submit. Sellers
 * add photos while still writing the description, and a form that holds eight
 * files until the end turns a slow connection into one long unexplained wait
 * with a publish button that appears broken.
 */

export type PickedPhoto = {
  key: string;
  /** Local preview, shown until the listing is published. */
  preview: string;
  uploading: boolean;
};

export function PhotoPicker({
  photos,
  onChange,
  max = 8,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max?: number;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);

  const room = max - photos.length;

  async function add(files: File[]) {
    setFailed(false);
    const accepted = files.slice(0, room);

    // Placed on screen immediately, then replaced as each upload finishes. A
    // phone photo takes seconds to send; an empty grid for those seconds reads
    // as "it did not work".
    const pending = accepted.map((file) => ({
      key: "",
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    let current = [...photos, ...pending];
    onChange(current);

    await Promise.all(
      accepted.map(async (file, index) => {
        const slot = photos.length + index;
        try {
          const asked = await fetch("/api/uploads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ scope: "listing", contentType: file.type, size: file.size }),
          });
          if (!asked.ok) throw new Error(String(asked.status));
          const { uploadUrl, headers, key } = await asked.json();

          const put = await fetch(uploadUrl, { method: "PUT", headers, body: file });
          if (!put.ok) throw new Error(String(put.status));

          current = current.map((photo, at) =>
            at === slot ? { ...photo, key, uploading: false } : photo,
          );
        } catch {
          // Drop the one that failed and keep the rest. Losing the whole batch
          // because the fourth photo timed out would be worse.
          current = current.filter((_, at) => at !== slot);
          setFailed(true);
        }
        onChange(current);
      }),
    );
  }

  function remove(index: number) {
    const photo = photos[index];
    if (photo) URL.revokeObjectURL(photo.preview);
    onChange(photos.filter((_, at) => at !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.preview} className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.preview}
              alt=""
              className={cn(
                "size-full rounded-lg object-cover transition-opacity",
                photo.uploading && "opacity-40",
              )}
            />
            {photo.uploading ? (
              <span className="absolute inset-0 grid place-items-center">
                <Loader2 className="size-5 animate-spin" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t("post.removePhoto")}
                className="bg-foreground/70 text-background absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full"
              >
                <X className="size-3" strokeWidth={3} />
              </button>
            )}
            {/* The first one is what every card and search result shows. */}
            {index === 0 && !photo.uploading && (
              <span className="bg-foreground/70 text-background absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[0.5rem] font-bold">
                {t("post.coverPhoto")}
              </span>
            )}
          </div>
        ))}

        {room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-border text-muted-foreground hover:bg-muted grid aspect-square place-items-center rounded-lg border border-dashed transition-colors active:scale-95"
            aria-label={t("post.addPhotos")}
          >
            <ImagePlus className="size-5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <p className="text-subtle-foreground text-[0.6875rem]">
        {photos.length === 0 ? t("post.photosHelp") : t("post.photosCount", { n: photos.length, max })}
      </p>

      {failed && (
        <p role="alert" className="text-destructive text-[0.6875rem]">
          {t("post.photoFailed")}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) void add(files);
        }}
      />
    </div>
  );
}
