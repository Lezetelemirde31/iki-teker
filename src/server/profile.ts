import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { cityById, districtById } from "@/mocks/geo";

import { useDatabase } from "./source";

/**
 * Editing your own account.
 *
 * The phone is not here. It is the account's identity and the thing sign-in
 * checks, so changing it is a different operation with different proof —
 * whoever holds the new number has to demonstrate that, and whoever holds the
 * old one has to agree. Letting it be edited alongside a display name would
 * make account takeover a form submission.
 *
 * Everything else is the seller's to present however they like. A shop that
 * wants to be called something other than the name on the contract is not
 * doing anything wrong.
 */

export type ProfileDraft = {
  name: string;
  cityId: string;
  districtId?: string;
  email?: string;
  bio?: string;
};

export type ProfileFailure =
  | "nameRequired"
  | "nameTooLong"
  | "unknownCity"
  | "districtMismatch"
  | "invalidEmail"
  | "bioTooLong"
  | "notFound";

export type ProfileResult = { ok: true } | { ok: false; reason: ProfileFailure; field?: string };

const MAX_NAME = 80;
const MAX_BIO = 600;

/**
 * Deliberately permissive.
 *
 * Address validation is a well-known way to reject real addresses; the only
 * check that matters is that something plausible was typed, and delivery is
 * what actually proves an address works.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function updateProfile(
  userId: string,
  draft: ProfileDraft,
): Promise<ProfileResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const name = draft.name.trim();
  if (name.length < 2) return { ok: false, reason: "nameRequired", field: "name" };
  if (name.length > MAX_NAME) return { ok: false, reason: "nameTooLong", field: "name" };

  const city = cityById.get(draft.cityId);
  if (!city) return { ok: false, reason: "unknownCity", field: "cityId" };

  // A district is optional, but one that belongs to another city is not a
  // partial answer — it is wrong, and it would put the listing on the wrong map.
  let districtId: string | null = null;
  if (draft.districtId) {
    const district = districtById.get(draft.districtId);
    if (!district || district.cityId !== city.id) {
      return { ok: false, reason: "districtMismatch", field: "districtId" };
    }
    districtId = district.id;
  }

  const email = draft.email?.trim() || undefined;
  if (email && !EMAIL.test(email)) return { ok: false, reason: "invalidEmail", field: "email" };

  const bio = draft.bio?.trim() || undefined;
  if (bio && bio.length > MAX_BIO) return { ok: false, reason: "bioTooLong", field: "bio" };

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true },
  });
  if (!existing) return { ok: false, reason: "notFound" };

  await db
    .update(schema.users)
    .set({
      name,
      // Derived, never sent: the avatar and the name must not disagree.
      initials: initialsOf(name),
      cityId: city.id,
      districtId,
      email: email ?? null,
      // Stored under every locale. A seller writes one description of
      // themselves and it is not ours to invent the other two.
      bio: bio ? { az: bio, en: bio, ru: bio } : null,
    })
    .where(eq(schema.users.id, userId));

  return { ok: true };
}

/** "Rəşad Məmmədov" → "RM". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
