import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { demoISODate } from "@/lib/demo-clock";
import type { Appointment } from "@/types";

import { getUser } from "./data";
import { notify } from "./notifications";
import { useDatabase } from "./source";
import { clockToMinute, getWorkshopById, minuteToClock } from "./workshops";

/**
 * Booking a workshop.
 *
 * The same two moments as a rental, for the same reason: a request is a request,
 * not a hold. Several customers may ask for Tuesday at ten; the workshop picks.
 * Only confirmation takes the slot, and the database — not this file — is what
 * makes taking it exclusive.
 *
 * What the customer sends is a service, a day and a start time. Everything the
 * appointment costs and everything it occupies is read from the service row:
 *
 *   endMinute      = start + serviceItems.durationMinutes
 *   priceEstimate  = serviceItems.priceFrom
 *
 * A browser that posts its own end time or its own price is posting a field that
 * is thrown away. That is deliberate — a customer who could set the duration
 * could book a three-hour engine rebuild into a fifteen-minute gap.
 *
 * Times are minutes from midnight in the workshop's own local day, never
 * instants. Every workshop here is in Azerbaijan and quotes local hours; the one
 * place this codebase turns a Date into a calendar day reads the *server's*
 * zone, which in production is UTC. Nine in the morning in Baku would have been
 * compared as five against the opening hours. Integers in one agreed zone cannot
 * drift like that.
 */

export type AppointmentRequest = {
  workshopId: string;
  serviceId: string;
  date: string;
  /** "14:30" — the only time the customer gets to choose. */
  time: string;
  vehicleLabel: string;
  listingId?: string;
  note?: string;
};

export type AppointmentFailure =
  | "notFound"
  | "notActive"
  | "wrongWorkshop"
  | "invalidDate"
  | "pastDate"
  | "invalidTime"
  | "outsideHours"
  | "ownWorkshop"
  | "vehicleRequired"
  | "notOwner"
  | "alreadyDecided"
  | "taken";

export type AppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: AppointmentFailure };

/** A conflict nobody caused, as distinct from a caller getting it wrong. */
export const conflictReasons: ReadonlySet<AppointmentFailure> = new Set(["taken"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* -------------------------------------------------------------------------- */
/*  Request                                                                    */
/* -------------------------------------------------------------------------- */

export async function requestAppointment(
  input: AppointmentRequest,
  customerId: string,
): Promise<AppointmentResult> {
  const workshop = await getWorkshopById(input.workshopId);
  if (!workshop) return { ok: false, reason: "notFound" };

  // A workshop still in moderation is not somewhere to send a broken motorcycle.
  if (useDatabase) {
    const row = await db.query.workshops.findFirst({
      where: eq(schema.workshops.id, workshop.id),
      columns: { status: true },
    });
    if (row?.status !== "active") return { ok: false, reason: "notActive" };
  }

  // Booking your own shop would put a phantom vehicle in your own calendar.
  if (workshop.ownerId === customerId) return { ok: false, reason: "ownWorkshop" };

  // The service has to be on *this* workshop's menu. Without this check a
  // customer could pair a cheap shop with a rival's fifteen-minute service and
  // book a slot priced from someone else's list.
  const service = workshop.services.find((item) => item.id === input.serviceId);
  if (!service) return { ok: false, reason: "wrongWorkshop" };

  if (!ISO_DATE.test(input.date)) return { ok: false, reason: "invalidDate" };
  if (input.date < demoISODate(0)) return { ok: false, reason: "pastDate" };

  const startMinute = clockToMinute(input.time);
  if (startMinute === undefined) return { ok: false, reason: "invalidTime" };

  // Duration comes from the menu, not the request.
  const endMinute = startMinute + service.durationMinutes;

  const openMinute = clockToMinute(workshop.hours.open);
  const closeMinute = clockToMinute(workshop.hours.close);
  if (openMinute === undefined || closeMinute === undefined) {
    return { ok: false, reason: "outsideHours" };
  }
  // The whole job has to fit inside the working day — starting a three-hour
  // service half an hour before closing is not a bookable appointment.
  if (startMinute < openMinute || endMinute > closeMinute) {
    return { ok: false, reason: "outsideHours" };
  }

  const vehicleLabel = input.vehicleLabel.trim();
  if (vehicleLabel.length < 2) return { ok: false, reason: "vehicleRequired" };

  const appointment: Appointment = {
    id: `ap-${crypto.randomUUID().slice(0, 8)}`,
    workshopId: workshop.id,
    serviceId: service.id,
    customerId,
    vehicleLabel: vehicleLabel.slice(0, 120),
    ...(input.listingId ? { listingId: input.listingId } : {}),
    date: input.date,
    time: minuteToClock(startMinute),
    status: "requested",
    priceEstimate: service.priceFrom,
  };

  if (!useDatabase) return { ok: true, appointment };

  await db.insert(schema.appointments).values({
    id: appointment.id,
    code: appointmentCode(),
    workshopId: appointment.workshopId,
    serviceId: appointment.serviceId,
    customerId,
    vehicleLabel: appointment.vehicleLabel,
    listingId: input.listingId ?? null,
    appointmentDate: appointment.date,
    startMinute,
    endMinute,
    status: "requested",
    priceEstimate: service.priceFrom,
    note: input.note?.trim().slice(0, 1000) || null,
  });

  const customer = await getUser(customerId);
  void notify(workshop.ownerId, "appointmentRequested", {
    customer: customer?.name ?? "",
    workshop: workshop.name,
    when: `${appointment.date} ${appointment.time}`,
  });

  return { ok: true, appointment };
}

/* -------------------------------------------------------------------------- */
/*  Confirm                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The workshop accepts a request.
 *
 * This is where the slot is actually taken, so this is where the exclusion
 * constraint speaks. A workshop declaring three concurrent slots gets three
 * tries: the lowest free index is claimed first, and if the database rejects it
 * because someone confirmed into that index a millisecond earlier, the next one
 * is tried. Running out means the hour is genuinely full — a 409, not an error.
 *
 * Checking availability by reading first and writing second would not do. Two
 * confirmations arriving together would both read the same free slot and both
 * write into it. Only the constraint, holding a lock over the range, can refuse
 * the second one.
 */
export async function confirmAppointment(
  appointmentId: string,
  ownerId: string,
): Promise<AppointmentResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.appointments.findFirst({
    where: eq(schema.appointments.id, appointmentId),
  });
  if (!row) return { ok: false, reason: "notFound" };

  const workshop = await db.query.workshops.findFirst({
    where: eq(schema.workshops.id, row.workshopId),
  });
  if (!workshop) return { ok: false, reason: "notFound" };
  if (workshop.ownerId !== ownerId) return { ok: false, reason: "notOwner" };
  if (row.status !== "requested") return { ok: false, reason: "alreadyDecided" };

  for (let slotIndex = 0; slotIndex < workshop.concurrentSlots; slotIndex++) {
    try {
      const updated = await db
        .update(schema.appointments)
        .set({ status: "confirmed", slotIndex })
        .where(
          and(
            eq(schema.appointments.id, appointmentId),
            eq(schema.appointments.status, "requested"),
          ),
        )
        .returning();

      // Somebody else decided this one between the read above and here.
      if (updated.length === 0) return { ok: false, reason: "alreadyDecided" };

      const customer = row.customerId;
      void notify(customer, "appointmentConfirmed", {
        workshop: workshop.name,
        when: `${String(row.appointmentDate)} ${minuteToClock(row.startMinute)}`,
      });

      return { ok: true, appointment: toAppointment(updated[0]!) };
    } catch (error) {
      // This slot is occupied for that range. Try the next one; if the workshop
      // only has one, that is the end of it.
      if (isOverlapViolation(error)) continue;
      throw error;
    }
  }

  return { ok: false, reason: "taken" };
}

/** The workshop turns a request down. Nothing was held, so nothing is freed. */
export async function declineAppointment(
  appointmentId: string,
  ownerId: string,
): Promise<AppointmentResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.appointments.findFirst({
    where: eq(schema.appointments.id, appointmentId),
  });
  if (!row) return { ok: false, reason: "notFound" };

  const workshop = await db.query.workshops.findFirst({
    where: eq(schema.workshops.id, row.workshopId),
  });
  if (!workshop) return { ok: false, reason: "notFound" };
  if (workshop.ownerId !== ownerId) return { ok: false, reason: "notOwner" };
  if (row.status !== "requested") return { ok: false, reason: "alreadyDecided" };

  const updated = await db
    .update(schema.appointments)
    .set({ status: "cancelled" })
    .where(
      and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.status, "requested")),
    )
    .returning();

  if (updated.length === 0) return { ok: false, reason: "alreadyDecided" };

  void notify(row.customerId, "appointmentDeclined", { workshop: workshop.name });

  return { ok: true, appointment: toAppointment(updated[0]!) };
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

/** Requests waiting on a workshop owner, oldest first — it is a to-do list. */
export async function pendingAppointmentsFor(ownerId: string): Promise<Appointment[]> {
  if (!useDatabase) return [];

  const owned = await db.query.workshops.findMany({
    where: eq(schema.workshops.ownerId, ownerId),
    columns: { id: true },
  });
  if (owned.length === 0) return [];

  const rows = await db.query.appointments.findMany({
    where: eq(schema.appointments.status, "requested"),
    orderBy: schema.appointments.createdAt,
  });

  const mine = new Set(owned.map((workshop) => workshop.id));
  return rows.filter((row) => mine.has(row.workshopId)).map(toAppointment);
}

/** What the customer booked, newest first. */
export async function myAppointments(customerId: string): Promise<Appointment[]> {
  if (!useDatabase) return [];
  const rows = await db.query.appointments.findMany({
    where: eq(schema.appointments.customerId, customerId),
    orderBy: schema.appointments.appointmentDate,
  });
  return rows.map(toAppointment);
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toAppointment(row: typeof schema.appointments.$inferSelect): Appointment {
  return {
    id: row.id,
    workshopId: row.workshopId,
    serviceId: row.serviceId,
    customerId: row.customerId,
    vehicleLabel: row.vehicleLabel,
    ...(row.listingId ? { listingId: row.listingId } : {}),
    date: String(row.appointmentDate),
    time: minuteToClock(row.startMinute),
    status: row.status,
    priceEstimate: row.priceEstimate,
  };
}

/** Short reference the customer and the workshop quote at each other. */
function appointmentCode() {
  return `SR-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Postgres reports an exclusion-constraint breach as 23P01. Drizzle wraps driver
 * errors, so the code can sit a few levels down on `cause`.
 *
 * Deliberately not shared with the copy in `bookings.ts`: that one matches
 * `bookings_no_overlap` by name, and a single helper matching either would let a
 * booking conflict be read as an appointment conflict if the modules ever met.
 */
function isOverlapViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const err = current as { code?: string; message?: string; cause?: unknown };
    if (err.code === "23P01") return true;
    if (err.message && /appointments_no_overlap|exclusion constraint/i.test(err.message)) {
      return true;
    }
    current = err.cause;
  }
  return false;
}
