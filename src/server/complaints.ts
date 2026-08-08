import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { canModerate } from "./authorization";
import { recordAction } from "./audit";
import { notify } from "./notifications";
import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * Reporting a listing or a person.
 *
 * Moderation catches what is wrong with a listing before it goes live. This
 * catches what only becomes visible afterwards — the bike that was sold three
 * weeks ago, the seller who asks for a transfer before anyone sees the vehicle.
 * Nobody but the people using the platform can see those, so the report is the
 * only way the queue ever hears about them.
 *
 * Nothing here is taken on the reporter's word. They name a thing; what that
 * thing is called, and who owns it, is read from the database. Reporting your
 * own listing is refused, and one account gets one report per target, because a
 * queue that can be flooded is a queue nobody reads.
 */

export type ComplaintEntity = "listing" | "user";

export type ComplaintReason = "fraud" | "wrongCategory" | "sold" | "offensive" | "spam" | "other";

export type ComplaintOutcome = "upheld" | "dismissed";

export type ComplaintFailure =
  | "notAllowed"
  | "notFound"
  | "notPending"
  | "invalidReason"
  | "alreadyReported"
  | "ownContent";

export type ComplaintResult = { ok: true; id: string } | { ok: false; reason: ComplaintFailure };

export type ComplaintItem = {
  id: string;
  entityType: ComplaintEntity;
  entityId: string;
  entityLabel: string;
  reason: ComplaintReason;
  note: string | null;
  reporterName: string;
  createdAt: string;
};

const reasons: ComplaintReason[] = [
  "fraud",
  "wrongCategory",
  "sold",
  "offensive",
  "spam",
  "other",
];

const MAX_NOTE = 500;

/* -------------------------------------------------------------------------- */
/*  Reporting                                                                  */
/* -------------------------------------------------------------------------- */

export async function fileComplaint(
  entityType: ComplaintEntity,
  entityId: string,
  reporterId: string,
  reason: string,
  note?: string,
): Promise<ComplaintResult> {
  if (!reasons.includes(reason as ComplaintReason)) {
    return { ok: false, reason: "invalidReason" };
  }
  if (!useDatabase) return { ok: false, reason: "notFound" };

  // What is being reported, and who it belongs to, come from the row — never
  // from the request. A label the reporter could set would be a label they
  // could lie with.
  const subject = await subjectOf(entityType, entityId);
  if (!subject) return { ok: false, reason: "notFound" };
  if (subject.ownerId === reporterId) return { ok: false, reason: "ownContent" };

  const id = `cp-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await db.insert(schema.complaints).values({
      id,
      entityType,
      entityId,
      entityLabel: subject.label,
      reporterId,
      reason: reason as ComplaintReason,
      note: note?.trim().slice(0, MAX_NOTE) || null,
      status: "open",
      createdAt: new Date(),
    });
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, reason: "alreadyReported" };
    throw error;
  }

  // The reported party is told nothing. A notification here would hand them a
  // reason to retaliate against whoever they guessed reported them, and the
  // report is a message to the moderators, not to them.
  return { ok: true, id };
}

async function subjectOf(entityType: ComplaintEntity, entityId: string) {
  if (entityType === "listing") {
    const row = await db.query.listings.findFirst({
      where: eq(schema.listings.id, entityId),
      columns: { title: true, sellerId: true },
    });
    return row ? { label: row.title, ownerId: row.sellerId } : undefined;
  }

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, entityId),
    columns: { id: true, name: true },
  });
  return row ? { label: row.name, ownerId: row.id } : undefined;
}

/* -------------------------------------------------------------------------- */
/*  The queue                                                                  */
/* -------------------------------------------------------------------------- */

export async function complaintQueue(limit = 50): Promise<ComplaintItem[]> {
  if (!useDatabase || !(await canModerate())) return [];

  const rows = await db
    .select({ complaint: schema.complaints, reporter: schema.users })
    .from(schema.complaints)
    .innerJoin(schema.users, eq(schema.users.id, schema.complaints.reporterId))
    .where(eq(schema.complaints.status, "open"))
    // Same order as the listing queue, for the same reason: the oldest report is
    // the one somebody has been waiting longest on.
    .orderBy(asc(schema.complaints.createdAt))
    .limit(limit);

  return rows.map(({ complaint, reporter }) => ({
    id: complaint.id,
    entityType: complaint.entityType as ComplaintEntity,
    entityId: complaint.entityId,
    entityLabel: complaint.entityLabel,
    reason: complaint.reason,
    note: complaint.note,
    reporterName: reporter.name,
    createdAt: complaint.createdAt.toISOString(),
  }));
}

export async function openComplaints(): Promise<number> {
  if (!useDatabase || !(await canModerate())) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.complaints)
    .where(eq(schema.complaints.status, "open"));
  return row?.n ?? 0;
}

/* -------------------------------------------------------------------------- */
/*  Deciding                                                                   */
/* -------------------------------------------------------------------------- */

export async function resolveComplaint(
  complaintId: string,
  outcome: ComplaintOutcome,
  note?: string,
): Promise<ComplaintResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await canModerate())) return { ok: false, reason: "notAllowed" };

  const moderatorId = await currentUserId();

  const complaint = await db.query.complaints.findFirst({
    where: eq(schema.complaints.id, complaintId),
  });
  if (!complaint) return { ok: false, reason: "notFound" };

  const closed = await db
    .update(schema.complaints)
    .set({
      status: outcome,
      resolvedById: moderatorId,
      resolvedAt: new Date(),
      resolutionNote: note?.trim().slice(0, MAX_NOTE) || null,
    })
    .where(and(eq(schema.complaints.id, complaintId), eq(schema.complaints.status, "open")))
    .returning();

  // Two moderators working the same queue is normal; the second one to click
  // must not reopen and overwrite a decision that was already made.
  if (closed.length === 0) return { ok: false, reason: "notPending" };

  if (outcome === "upheld" && complaint.entityType === "listing") {
    await takeDown(complaint.entityId, moderatorId, complaint.reason, note);
  }

  // An upheld complaint about a *person* is recorded and nothing more. There is
  // no banned role to move them into, and inventing one here — without a way
  // back, and without ending their sessions — would be worse than the moderator
  // dealing with it directly.

  return { ok: true, id: complaintId };
}

/**
 * Pulls a listing back off the market.
 *
 * Draft, not deleted, exactly as a rejection from the moderation queue: most of
 * what gets reported is fixable, and the seller keeps what they wrote.
 */
async function takeDown(
  listingId: string,
  moderatorId: string,
  reason: ComplaintReason,
  note?: string,
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { sellerId: true, title: true, status: true },
  });
  if (!listing || listing.status === "draft") return;

  await db.update(schema.listings).set({ status: "draft" }).where(eq(schema.listings.id, listingId));

  await recordAction({
    actorId: moderatorId,
    action: "upholdComplaint",
    entityType: "listing",
    entityId: listingId,
    entityLabel: listing.title,
    from: listing.status,
    to: "draft",
    // The complaint vocabulary is the reporter's, not the moderation queue's.
    // Only the one word both lists share carries across; the rest land on
    // "prohibited", and the note says what actually happened.
    reason: reason === "wrongCategory" ? "wrongCategory" : "prohibited",
    note: note?.slice(0, MAX_NOTE) ?? null,
  });

  // The seller finds their listing gone otherwise, with no idea why.
  void notify(listing.sellerId, "listingRejected", { title: listing.title, listingId });
}

/**
 * The unique index doing its job. Postgres reports it as 23505; Drizzle wraps
 * driver errors, so the code can sit a few levels down on `cause`.
 */
function isDuplicate(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const err = current as { code?: string; message?: string; cause?: unknown };
    if (err.code === "23505") return true;
    if (err.message && /complaints_reporter_target_idx|duplicate key/i.test(err.message)) {
      return true;
    }
    current = err.cause;
  }
  return false;
}
