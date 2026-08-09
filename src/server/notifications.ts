import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { getMessages } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import { siteUrl } from "@/lib/site";

import { useDatabase } from "./source";

/**
 * Push notifications.
 *
 * A rental request nobody sees is a lost rental. The owner is not sitting on
 * the account screen waiting, and the platform's promise — that a booking is a
 * real transaction with a fast answer — is only true if they find out.
 *
 * Web Push rather than a service: no account, no SDK, no per-message cost, and
 * it works from the service worker that already exists for offline. The two
 * VAPID keys are generated once and identify this server to the browsers'
 * push endpoints.
 *
 * Every send is best-effort. A notification that fails must never take down
 * the booking it was announcing, so failures are swallowed and dead
 * subscriptions are pruned.
 */

export type NotificationKind =
  | "bookingRequested"
  | "bookingConfirmed"
  | "bookingDeclined"
  | "messageReceived"
  | "listingApproved"
  | "listingRejected"
  | "reviewReceived"
  | "appointmentRequested"
  | "appointmentConfirmed"
  | "appointmentDeclined"
  | "vipConfirmed";

type Payload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

let configured: boolean | undefined;

/** True once, when both keys are present. Absent keys mean push is simply off. */
function ready(): boolean {
  if (configured !== undefined) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(
    // A contact the push service can reach if this server misbehaves. It is
    // sent to Google and Mozilla, not to users.
    process.env.VAPID_SUBJECT ?? "mailto:info@ikitekerli.az",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export function pushAvailable(): boolean {
  return useDatabase && ready();
}

/* -------------------------------------------------------------------------- */
/*  Sending                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Notifies one person, on every device they have registered.
 *
 * Never awaited by the caller for its result — the booking, message or
 * moderation decision has already happened and is not conditional on a
 * notification arriving.
 */
export async function notify(
  userId: string,
  kind: NotificationKind,
  values: Record<string, string> = {},
): Promise<void> {
  if (!pushAvailable()) return;

  const subscriptions = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) return;

  const dead: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      // Each device carries the language it was registered in, so one person
      // reading Russian on a laptop and Azerbaijani on a phone gets each in the
      // language they chose there.
      const locale: Locale = isLocale(subscription.locale) ? subscription.locale : "az";
      const payload = await compose(kind, locale, values);

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
      } catch (error) {
        // 404 and 410 mean the browser threw this subscription away. Anything
        // else — a timeout, a push service hiccup — is worth keeping the row
        // for, because the next send may well work.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(subscription.endpoint);
      }
    }),
  );

  if (dead.length) {
    await db
      .delete(schema.pushSubscriptions)
      .where(inArray(schema.pushSubscriptions.endpoint, dead));
  }
}

/* -------------------------------------------------------------------------- */
/*  Copy                                                                       */
/* -------------------------------------------------------------------------- */

async function compose(
  kind: NotificationKind,
  locale: Locale,
  values: Record<string, string>,
): Promise<Payload> {
  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const base = siteUrl();

  // The destination is the whole point. A notification that opens the home
  // screen makes the person hunt for what it was about.
  const target: Record<NotificationKind, string> = {
    bookingRequested: `/${locale}/account`,
    bookingConfirmed: `/${locale}/account`,
    bookingDeclined: `/${locale}/account`,
    messageReceived: values.threadId ? `/${locale}/chats/${values.threadId}` : `/${locale}/chats`,
    listingApproved: values.listingId
      ? `/${locale}/listing/${values.listingId}`
      : `/${locale}/account`,
    listingRejected: `/${locale}/account`,
    // Straight to the profile the rating is now on.
    reviewReceived: values.userId ? `/${locale}/seller/${values.userId}` : `/${locale}/account`,
    // The owner answers requests from their account screen; the customer's own
    // appointments are listed there too, so both ends land somewhere useful.
    appointmentRequested: `/${locale}/account`,
    appointmentConfirmed: `/${locale}/account`,
    appointmentDeclined: `/${locale}/account`,
    // Straight to the listing that just rose.
    vipConfirmed: values.listingId
      ? `/${locale}/listing/${values.listingId}`
      : `/${locale}/account`,
  };

  return {
    title: t(`push.${kind}.title` as Parameters<typeof t>[0], values),
    body: t(`push.${kind}.body` as Parameters<typeof t>[0], values),
    url: `${base}${target[kind]}`,
    // Same tag replaces an earlier notification instead of stacking five of
    // them for one conversation.
    tag: values.threadId ? `chat-${values.threadId}` : kind,
  };
}

/* -------------------------------------------------------------------------- */
/*  Subscriptions                                                              */
/* -------------------------------------------------------------------------- */

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  locale: string,
  userAgent?: string,
): Promise<void> {
  if (!useDatabase) return;

  await db
    .insert(schema.pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      locale: isLocale(locale) ? locale : "az",
      userAgent: userAgent?.slice(0, 200) ?? null,
      createdAt: new Date(),
    })
    // The same browser re-subscribing is the same row. Its owner can change —
    // one phone, two people — so that is updated rather than assumed.
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        locale: isLocale(locale) ? locale : "az",
      },
    });
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  if (!useDatabase) return;
  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.endpoint, endpoint),
        eq(schema.pushSubscriptions.userId, userId),
      ),
    );
}
