import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { directoryOrder, serviceItems as mockServiceItems, workshops as mockWorkshops } from "@/mocks/services";
import type { ServiceItem, Workshop } from "@/types";

import { useDatabase } from "./source";

/**
 * Reading the workshop directory.
 *
 * The order is paid placement first, then rating. That is not a ranking
 * accident: `promoted` is a revenue line, and a promoted workshop that sorted
 * below an unpromoted one would be a refund waiting to happen. Rating breaks
 * the tie inside each band, so buying placement moves a workshop up the list
 * without letting it outrank the honest signal entirely.
 */

/** Minutes from midnight → "09:00", for display. */
export function minuteToClock(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "09:00" → minutes from midnight. Returns undefined for anything malformed. */
export function clockToMinute(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

/**
 * Every workshop the directory should show.
 *
 * Only `active` — a workshop still in moderation is not a place to send someone
 * with a broken motorcycle.
 */
export async function listWorkshops(): Promise<Workshop[]> {
  if (!useDatabase) return directoryOrder.map(withMockServices);

  const rows = await db.query.workshops.findMany({
    where: eq(schema.workshops.status, "active"),
    orderBy: [desc(schema.workshops.promoted), desc(schema.workshops.rating)],
    with: { services: { orderBy: asc(schema.serviceItems.sortOrder) } },
  });

  return rows.map(toWorkshop);
}

/** One workshop and its menu, by slug. */
export async function getWorkshop(slug: string): Promise<Workshop | undefined> {
  if (!useDatabase) {
    const found = mockWorkshops.find((workshop) => workshop.slug === slug);
    return found ? withMockServices(found) : undefined;
  }

  const row = await db.query.workshops.findFirst({
    where: eq(schema.workshops.slug, slug),
    with: { services: { orderBy: asc(schema.serviceItems.sortOrder) } },
  });

  if (!row || row.status !== "active") return undefined;
  return toWorkshop(row);
}

/** By id — what an appointment row needs to name the place it is booked at. */
export async function getWorkshopById(id: string): Promise<Workshop | undefined> {
  if (!useDatabase) {
    const found = mockWorkshops.find((workshop) => workshop.id === id);
    return found ? withMockServices(found) : undefined;
  }

  const row = await db.query.workshops.findFirst({
    where: eq(schema.workshops.id, id),
    with: { services: { orderBy: asc(schema.serviceItems.sortOrder) } },
  });

  return row ? toWorkshop(row) : undefined;
}

/* -------------------------------------------------------------------------- */
/*  Mapping                                                                    */
/* -------------------------------------------------------------------------- */

type WorkshopRow = typeof schema.workshops.$inferSelect & {
  services?: (typeof schema.serviceItems.$inferSelect)[];
};

function toWorkshop(row: WorkshopRow): Workshop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerId: row.ownerId,
    rating: Number(row.rating),
    reviewsCount: row.reviewsCount,
    // Not stored: the directory has no coordinates yet, and a made-up distance
    // is worse than none. The screens read it only when it is non-zero.
    distanceKm: 0,
    specialties: row.specialties as Workshop["specialties"],
    summary: row.summary,
    about: row.about,
    cityId: row.cityId,
    districtId: row.districtId,
    address: row.address,
    phone: row.phone,
    hours: {
      open: minuteToClock(row.openMinute),
      close: minuteToClock(row.closeMinute),
      days: row.daysLabel,
    },
    mobileService: row.mobileService,
    verified: row.verified,
    promoted: row.promoted,
    photos: row.photos as Workshop["photos"],
    services: (row.services ?? []).map(toServiceItem),
  };
}

function toServiceItem(row: typeof schema.serviceItems.$inferSelect): ServiceItem {
  return {
    id: row.id,
    workshopId: row.workshopId,
    name: row.name,
    priceFrom: row.priceFrom,
    durationMinutes: row.durationMinutes,
    category: row.category as ServiceItem["category"],
  };
}

/** The mock workshops carry an empty `services` array; the menu lives separately. */
function withMockServices(workshop: Workshop): Workshop {
  if (workshop.services.length > 0) return workshop;
  return {
    ...workshop,
    services: mockServiceItems.filter((item) => item.workshopId === workshop.id),
  };
}
