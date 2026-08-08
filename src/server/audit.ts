import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { useDatabase } from "./source";

/**
 * The record of what anybody did from behind the admin panel.
 *
 * One function writes here and nothing updates or deletes, because a log that
 * can be edited answers no question worth asking. Every write records what the
 * value was as well as what it became: "changed the status" is not an audit
 * trail, "moderation → active" is.
 *
 * Callers are expected to have already checked permission — this only writes
 * down what happened. It is deliberately not the place authorisation lives, so
 * that forgetting to log cannot accidentally grant access, and forgetting to
 * check cannot be papered over by a tidy log entry.
 */

export type AuditEntity = "listing" | "user" | "workshop" | "review" | "booking";

export type AuditInput = {
  actorId: string;
  action: string;
  entityType: AuditEntity;
  entityId: string;
  /** What the thing was called at the time, so the row still reads later. */
  entityLabel: string;
  from?: string | null;
  to?: string | null;
  reason?: (typeof schema.rejectionReason.enumValues)[number] | null;
  note?: string | null;
};

export async function recordAction(input: AuditInput): Promise<void> {
  if (!useDatabase) return;

  await db.insert(schema.adminActions).values({
    id: `aa-${crypto.randomUUID().slice(0, 8)}`,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel.slice(0, 200),
    fromValue: input.from ?? null,
    toValue: input.to ?? null,
    reason: input.reason ?? null,
    note: input.note?.trim().slice(0, 500) || null,
    createdAt: new Date(),
  });
}

/** The most recent action taken on one thing — what a seller is shown as "why". */
export async function lastActionOn(entityType: AuditEntity, entityId: string) {
  if (!useDatabase) return undefined;

  const rows = await db
    .select()
    .from(schema.adminActions)
    .where(
      and(
        eq(schema.adminActions.entityType, entityType),
        eq(schema.adminActions.entityId, entityId),
      ),
    )
    .orderBy(desc(schema.adminActions.createdAt))
    .limit(1);

  return rows[0];
}

/** The log itself, newest first — the activity screen. */
export async function recentActions(limit = 100) {
  if (!useDatabase) return [];

  return db.query.adminActions.findMany({
    orderBy: desc(schema.adminActions.createdAt),
    limit,
    with: { actor: { columns: { id: true, name: true } } },
  });
}
