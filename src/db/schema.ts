import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Database schema, derived from the domain types the prototype already runs on.
 *
 * Two open product questions — whether private individuals may rent out their
 * own vehicles, and whether the platform covers Baku only or all of Azerbaijan —
 * deliberately do not constrain this schema. Both are modelled at their most
 * general (any user can own a rental offer; cities and districts are first-class
 * rows), so the answers become business rules and seed data rather than a
 * migration. Narrowing later is free; widening later is not.
 */

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const accountKind = pgEnum("account_kind", ["private", "shop", "rental"]);

/**
 * What a signed-in user is allowed to do — not who they are.
 *
 * Kept on the user row because a role is a fact about the account, not about a
 * session: revoking a moderator has to survive them signing in again.
 */
/**
 * What somebody may do behind the admin panel.
 *
 * Ordered by reach, least to most, and read that way in `authorization.ts`:
 * every role can do what the one before it can. `support` answers people,
 * `moderator` decides on content, `admin` acts on accounts, `superadmin` grants
 * the roles themselves — which is the one power that must not be self-service.
 */
export const userRole = pgEnum("user_role", [
  "user",
  "support",
  "moderator",
  "admin",
  "superadmin",
]);

/**
 * Whether an account may still act.
 *
 * Separate from the role because they answer different questions: the role is
 * what someone is trusted with, this is whether they are allowed in at all. A
 * banned moderator is not demoted, they are stopped.
 */
export const userStatus = pgEnum("user_status", ["active", "suspended", "banned"]);

/** Why a listing was turned down. Shown to the seller, so it must be specific. */
export const rejectionReason = pgEnum("rejection_reason", [
  "prohibited",
  "misleading",
  "duplicate",
  "contactInfo",
  "poorQuality",
  "wrongCategory",
  "other",
]);
export const listingStatus = pgEnum("listing_status", [
  "active",
  "moderation",
  "draft",
  "sold",
  "archived",
]);
export const conditionKind = pgEnum("condition_kind", ["new", "used"]);
export const catalogKind = pgEnum("catalog_kind", ["vehicle", "part"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "active",
  "returned",
  "cancelled",
  "disputed",
]);
export const licenceCategory = pgEnum("licence_category", ["A", "A1", "B", "none"]);
export const paymentMethod = pgEnum("payment_method", ["cashOnPickup", "card"]);
export const documentStatus = pgEnum("document_status", [
  "missing",
  "pending",
  "verified",
  "rejected",
]);
export const reviewContext = pgEnum("review_context", ["rental", "sale", "service"]);
export const messageKind = pgEnum("message_kind", ["text", "file", "image", "system"]);

/** Why somebody reported a listing or a person. */
export const complaintReason = pgEnum("complaint_reason", [
  "fraud",
  "wrongCategory",
  "sold",
  "offensive",
  "spam",
  "other",
]);

/** A closed complaint's status *is* its outcome, so there is no second column. */
export const complaintStatus = pgEnum("complaint_status", ["open", "upheld", "dismissed"]);

/**
 * A workshop's own lifecycle. Deliberately not `listing_status`, which carries
 * `sold` — a workshop is a business, and a business is never sold off the
 * directory the way a motorcycle is sold off the catalogue.
 */
/**
 * A VIP order's life.
 *
 * `pending` is somebody who has been told where to transfer and has not been
 * confirmed yet — nothing is granted at that point. Only an administrator
 * seeing the money moves it to `paid`, which is the moment the listing rises.
 */
export const vipOrderStatus = pgEnum("vip_order_status", [
  "pending",
  "paid",
  "rejected",
  "cancelled",
]);

export const workshopStatus = pgEnum("workshop_status", [
  "active",
  "moderation",
  "draft",
  "archived",
]);

export const appointmentStatus = pgEnum("appointment_status", [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
]);

/* -------------------------------------------------------------------------- */
/*  Geography and taxonomy                                                     */
/* -------------------------------------------------------------------------- */

/** Trilingual labels live in one JSON column rather than three text columns:
 *  adding a language must not mean altering every reference table. */
type Localized = { az: string; en: string; ru: string };

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: jsonb("name").$type<Localized>().notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  primary: boolean("primary").notNull().default(false),
});

export const districts = pgTable(
  "districts",
  {
    id: text("id").primaryKey(),
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<Localized>().notNull(),
  },
  (table) => [index("districts_city_idx").on(table.cityId)],
);

export const makes = pgTable("makes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  country: text("country").notNull(),
  popular: boolean("popular").notNull().default(false),
  /** Which vehicle categories this make appears in. */
  categories: jsonb("categories").$type<string[]>().notNull(),
});

export const models = pgTable(
  "models",
  {
    id: text("id").primaryKey(),
    makeId: text("make_id")
      .notNull()
      .references(() => makes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    yearFrom: integer("year_from").notNull(),
    yearTo: integer("year_to").notNull(),
    bodyType: text("body_type"),
  },
  (table) => [index("models_make_idx").on(table.makeId)],
);

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    avatarTone: text("avatar_tone").notNull(),
    kind: accountKind("kind").notNull().default("private"),
    /**
     * Optional since email became a way in.
     *
     * An account created by email has no phone until its owner adds one, and
     * the alternative — storing an empty string — collides on the unique index
     * the moment there are two of them.
     */
    phone: text("phone"),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    verifiedBadge: boolean("verified_badge").notNull().default(false),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewsCount: integer("reviews_count").notNull().default(0),
    rentalsCount: integer("rentals_count").notNull().default(0),
    memberSince: date("member_since").notNull(),
    responseMinutes: integer("response_minutes").notNull().default(60),
    online: boolean("online").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    cityId: text("city_id").references(() => cities.id),
    districtId: text("district_id").references(() => districts.id),
    address: jsonb("address").$type<Localized>(),
    hours: jsonb("hours").$type<{ open: string; close: string }>(),
    bio: jsonb("bio").$type<Localized>(),
    specialties: jsonb("specialties").$type<string[]>(),
    subscription: text("subscription").default("none"),
    /** Defaults to the least privilege; moderators are promoted deliberately. */
    role: userRole("role").notNull().default("user"),
    status: userStatus("status").notNull().default("active"),
    /**
     * An identity now, not just a contact.
     *
     * It used to be neither — sign-in was by phone and this was where a receipt
     * would eventually be sent. Signing in by email means two accounts cannot
     * share one, hence the unique index below, which allows any number of nulls
     * for the accounts that still have only a phone.
     */
    email: text("email"),
    /** scrypt, with its parameters embedded. Null for accounts created before
     *  passwords existed, and for anyone who only ever signs in by SMS. */
    passwordHash: text("password_hash"),
  },
  // Both are ways in, so neither may be shared. Postgres allows any number of
  // nulls in a unique index, which is what lets an account carry only one.
  (table) => [
    uniqueIndex("users_phone_idx").on(table.phone),
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Catalog                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Vehicles and parts share one table.
 *
 * They differ in a handful of columns but are identical in everything the
 * product does with them — search, favourites, chat context, moderation,
 * promotion. Splitting them would mean every one of those features querying two
 * tables and unioning the results.
 */
export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    kind: catalogKind("kind").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    price: integer("price").notNull(),
    negotiable: boolean("negotiable").notNull().default(false),
    condition: conditionKind("condition").notNull().default("used"),
    description: jsonb("description").$type<Localized>().notNull(),
    /** Category-specific fields, validated against the attribute schema in app code. */
    attributes: jsonb("attributes").$type<Record<string, string | number | boolean>>().notNull(),
    photos: jsonb("photos")
      .$type<{ id: string; seed: string; tone: string; alt: string }[]>()
      .notNull(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id),
    districtId: text("district_id")
      .notNull()
      .references(() => districts.id),
    delivery: boolean("delivery").notNull().default(false),
    status: listingStatus("status").notNull().default("moderation"),

    // Vehicle-only
    makeId: text("make_id").references(() => makes.id),
    modelId: text("model_id").references(() => models.id),
    year: integer("year"),
    customsCleared: boolean("customs_cleared"),

    // Part-only
    brand: text("brand"),
    partType: text("part_type"),
    partNumber: text("part_number"),
    stock: integer("stock"),
    localizedTitle: jsonb("localized_title").$type<Localized>(),
    compatibility: jsonb("compatibility").$type<unknown[]>(),

    // Promotion
    vip: boolean("vip").notNull().default(false),
    vipUntil: date("vip_until"),
    bumpsLeft: integer("bumps_left"),
    lastBumpedAt: timestamp("last_bumped_at", { withTimezone: true }),

    // Counters
    views: integer("views").notNull().default(0),
    contacts: integer("contacts").notNull().default(0),
    favorites: integer("favorites").notNull().default(0),

    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("listings_status_idx").on(table.status),
    index("listings_category_idx").on(table.category, table.status),
    index("listings_seller_idx").on(table.sellerId),
    index("listings_city_idx").on(table.cityId),
    index("listings_make_model_idx").on(table.makeId, table.modelId),
    // Search sorts by recency inside a status; VIP floats above it in app code.
    index("listings_published_idx").on(table.status, table.publishedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Rental                                                                     */
/* -------------------------------------------------------------------------- */

export const rentalOffers = pgTable(
  "rental_offers",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" })
      .unique(),
    /** Any user may own an offer. Whether private owners are allowed is a
     *  business rule, checked on write, not a schema constraint. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ratePerHour: integer("rate_per_hour"),
    ratePerDay: integer("rate_per_day").notNull(),
    ratePerWeek: integer("rate_per_week"),
    longStayMinDays: integer("long_stay_min_days"),
    longStayDayPrice: integer("long_stay_day_price"),
    deposit: integer("deposit").notNull(),
    minDays: integer("min_days").notNull().default(1),
    maxDays: integer("max_days").notNull().default(30),
    licenceRequired: licenceCategory("licence_required").notNull().default("none"),
    freeCancellationHours: integer("free_cancellation_hours").notNull().default(24),
    pickup: jsonb("pickup").$type<Localized>().notNull(),
    includes: jsonb("includes").$type<string[]>().notNull(),
    handoverTime: text("handover_time").notNull().default("10:00"),
    instantBook: boolean("instant_book").notNull().default(false),
    /** Configurable, and may be zero at launch — habit first, revenue second. */
    commissionRate: numeric("commission_rate", { precision: 4, scale: 3 })
      .notNull()
      .default("0.08"),
  },
  (table) => [index("rental_offers_owner_idx").on(table.ownerId)],
);

/** Days the owner has blocked by hand, as distinct from days a booking holds. */
export const rentalBlackouts = pgTable(
  "rental_blackouts",
  {
    offerId: text("offer_id")
      .notNull()
      .references(() => rentalOffers.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
  },
  (table) => [primaryKey({ columns: [table.offerId, table.day] })],
);

/**
 * Bookings.
 *
 * `period` is a real `daterange`, and the exclusion constraint added in
 * migration guards it: two live bookings cannot overlap on the same offer. That
 * has to be enforced here rather than in application code — two requests
 * arriving in the same instant would both pass an application-level check and
 * both be written.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    offerId: text("offer_id")
      .notNull()
      .references(() => rentalOffers.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    renterId: text("renter_id")
      .notNull()
      .references(() => users.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: integer("days").notNull(),
    dayPrice: integer("day_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    serviceFee: integer("service_fee").notNull().default(0),
    deposit: integer("deposit").notNull(),
    total: integer("total").notNull(),
    commission: numeric("commission", { precision: 10, scale: 2 }).notNull().default("0"),
    status: bookingStatus("status").notNull().default("pending"),
    paymentMethod: paymentMethod("payment_method").notNull().default("cashOnPickup"),
    licenceStatus: documentStatus("licence_status").notNull().default("missing"),
    agreementSigned: boolean("agreement_signed").notNull().default(false),
    handover: jsonb("handover").$type<Record<string, unknown>>(),
    returnCheck: jsonb("return_check").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bookings_offer_idx").on(table.offerId),
    index("bookings_owner_status_idx").on(table.ownerId, table.status),
    index("bookings_renter_idx").on(table.renterId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Trust and messaging                                                        */
/* -------------------------------------------------------------------------- */

/**
 * One-time codes for phone sign-in.
 *
 * The code itself is never stored — only a hash — so a leaked database does not
 * hand over live credentials. Each row carries its own expiry and attempt
 * counter rather than relying on a cleanup job: an expired or exhausted code is
 * refused by the check, whether or not anything has swept it away yet.
 */
export const authCodes = pgTable(
  "auth_codes",
  {
    id: text("id").primaryKey(),
    /**
     * Where the code was sent — a phone in E.164 or an email address.
     *
     * One column rather than two nullable ones, because a code has exactly one
     * destination and modelling it as "either of these, never both" invites the
     * row where both are set and nobody knows which was used.
     */
    destination: text("destination").notNull(),
    codeHash: text("code_hash").notNull(),
    /** Present when this code is for a destination that has no account yet. */
    pendingName: text("pending_name"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_codes_destination_idx").on(table.destination, table.createdAt)],
);

/**
 * Where to send a push notification.
 *
 * One row per browser, not per user — the same person on a phone and a laptop
 * is two subscriptions and both should ring. The endpoint is issued by the
 * browser's own push service and is what identifies it, so it is the key.
 *
 * Subscriptions expire and get revoked without telling us. A send that comes
 * back 404 or 410 means this row is dead, and it is deleted rather than
 * retried — a table of dead endpoints slows every future send.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    endpoint: text("endpoint").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Keys the browser generates; the payload is encrypted to them. */
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    locale: text("locale").notNull().default("az"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("push_user_idx").on(table.userId)],
);

/**
 * Signed-in sessions.
 *
 * Server-side rather than a self-contained token, because signing out — or
 * being signed out — has to take effect immediately. A stateless token stays
 * valid until it expires no matter what the server thinks of it.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Rough device label, so a user can tell their own sessions apart. */
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

/**
 * Every moderation decision, permanently.
 *
 * A moderator can take a seller's listing off the market, so each decision has
 * to be attributable to a person with a reason attached. Without that, "why was
 * my listing rejected" has no answer and a moderator acting badly leaves no
 * trace. Rows are never updated or deleted — a corrected decision is a new row,
 * because the record of what was decided is the point.
 */
/**
 * Everything anybody does from behind the admin panel.
 *
 * Replaces the listing-only `moderation_actions`, which could record a
 * rejection but had nowhere to put "banned this account" or "made this listing
 * VIP" — the actions most worth being able to account for later.
 *
 * `entityId` carries no foreign key, because the target is polymorphic: one row
 * points at a listing, a user, a workshop or a review, and one column cannot
 * reference four tables. `entityLabel` freezes what the thing was called at the
 * time, so the record still reads sensibly after the listing is deleted or the
 * account renamed — the same reasoning as `complaints`.
 *
 * `fromValue`/`toValue` are what actually makes it an audit trail rather than a
 * list of verbs: "changed status" answers nothing, "moderation → active"
 * answers everything. Both are text so any kind of change fits without a
 * migration.
 *
 * Append-only. Nothing updates or deletes a row here; a log somebody can edit
 * is not a log.
 */
export const adminActions = pgTable(
  "admin_actions",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    /** "approveListing", "banUser", "setVip" … text so new verbs need no migration. */
    action: text("action").notNull(),
    /** "listing" | "user" | "workshop" | "review" | "booking" */
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityLabel: text("entity_label").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    reason: rejectionReason("reason"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_actions_recent_idx").on(table.createdAt),
    index("admin_actions_entity_idx").on(table.entityType, table.entityId),
    index("admin_actions_actor_idx").on(table.actorId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    text: jsonb("text").$type<Localized>().notNull(),
    context: reviewContext("context").notNull(),
    subject: jsonb("subject").$type<Localized>().notNull(),
    /** A review requires a completed transaction — that is what makes the
     *  rating worth trusting, so the booking is recorded alongside it. */
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    verifiedTransaction: boolean("verified_transaction").notNull().default(false),
    /**
     * Hidden by a moderator rather than deleted.
     *
     * A rating that vanishes takes the average with it and leaves the person
     * who wrote it no way to tell what happened. Hiding keeps the row, so the
     * decision can be reversed and accounted for, and the recomputed average
     * simply skips it.
     */
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_target_idx").on(table.targetId)],
);

/**
 * Somebody reporting a listing or a person.
 *
 * `entityId` carries no foreign key. The target is polymorphic — a row here
 * points at either a listing or a user, and one column cannot reference two
 * tables. That turns out to be the right shape anyway: `entityLabel` freezes
 * what was reported at the moment it was reported, so the record survives the
 * listing being edited, sold or deleted afterwards. A complaint is evidence,
 * and evidence that disappears with its subject is worth nothing.
 */
export const complaints = pgTable(
  "complaints",
  {
    id: text("id").primaryKey(),
    /** "listing" or "user" — text for the same reason `action` is above. */
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityLabel: text("entity_label").notNull(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: complaintReason("reason").notNull(),
    note: text("note"),
    status: complaintStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedById: text("resolved_by_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (table) => [
    /** One report per person per thing. Ten reports from one account is not ten
     *  problems, and letting it through would make the queue trivial to flood. */
    uniqueIndex("complaints_reporter_target_idx").on(
      table.reporterId,
      table.entityType,
      table.entityId,
    ),
    index("complaints_open_idx").on(table.status, table.createdAt),
  ],
);

/**
 * Somebody buying VIP placement for a listing.
 *
 * There is no payment gateway, and the PRD is explicit that there will not be
 * one at launch: a card acquirer needs a registered legal entity and a bank
 * agreement. So this is the shape the money actually takes today — the seller
 * transfers, quoting the reference, and an administrator who can see the
 * account marks it paid. That is the only thing which grants VIP.
 *
 * The order is kept after it is decided rather than deleted. It is the receipt:
 * what was bought, for how long, at what price, and who confirmed it.
 *
 * `days` and `amount` are frozen onto the row at purchase. Prices change, and a
 * six-month-old order has to keep saying what was actually paid.
 */
export const vipOrders = pgTable(
  "vip_orders",
  {
    id: text("id").primaryKey(),
    /** Quoted on the transfer so a payment can be matched to an order. */
    reference: text("reference").notNull().unique(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    days: integer("days").notNull(),
    amount: integer("amount").notNull(),
    status: vipOrderStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedById: text("decided_by_id").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [
    index("vip_orders_pending_idx").on(table.status, table.createdAt),
    index("vip_orders_seller_idx").on(table.sellerId),
    index("vip_orders_listing_idx").on(table.listingId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Service directory                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A workshop.
 *
 * Opening hours are minutes from midnight rather than "09:00" strings, and that
 * is the whole timezone story for this feature. Every workshop is in Azerbaijan
 * and quotes its hours in local time; an appointment is asked for in the same
 * local time. Storing either as an absolute instant would mean converting on
 * every read, and the one place this codebase computes a calendar date
 * (`toISODate` in lib/demo-clock) reads the *server's* zone — which on Vercel is
 * UTC. Nine in the morning in Baku would have been checked as five, and the
 * opening-hours test would have quietly returned the wrong answer. Integers in
 * one agreed zone cannot drift.
 *
 * `concurrentSlots` is how many vehicles the workshop can have in at once. It is
 * not decoration: the exclusion constraint on `appointments` keys on the slot
 * index, so a shop that says three really can hold three ten-o'clock bookings
 * and really cannot hold a fourth.
 */
export const workshops = pgTable(
  "workshops",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id),
    districtId: text("district_id")
      .notNull()
      .references(() => districts.id),
    address: jsonb("address").$type<Localized>().notNull(),
    phone: text("phone").notNull(),
    summary: jsonb("summary").$type<Localized>().notNull(),
    about: jsonb("about").$type<Localized>().notNull(),
    specialties: jsonb("specialties").$type<string[]>().notNull(),
    /** Minutes from midnight, workshop-local. 09:00 is 540. */
    openMinute: integer("open_minute").notNull(),
    closeMinute: integer("close_minute").notNull(),
    daysLabel: jsonb("days_label").$type<Localized>().notNull(),
    mobileService: boolean("mobile_service").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    /** Paid priority placement. Sold by the promotion module, not here. */
    promoted: boolean("promoted").notNull().default(false),
    concurrentSlots: integer("concurrent_slots").notNull().default(1),
    photos: jsonb("photos")
      .$type<{ id: string; seed: string; tone: string; alt: string; key?: string }[]>()
      .notNull(),
    status: workshopStatus("status").notNull().default("moderation"),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewsCount: integer("reviews_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workshops_city_idx").on(table.cityId),
    index("workshops_owner_idx").on(table.ownerId),
    /** The directory's order: paid placement first, then rating. */
    index("workshops_directory_idx").on(table.status, table.promoted, table.rating),
  ],
);

/**
 * One line on a workshop's menu.
 *
 * `durationMinutes` is what makes the booking safe. The customer picks a service
 * and a start time; how long that occupies the workshop is read from here, never
 * sent by the browser. Otherwise the end of an appointment would be whatever the
 * person booking it decided to claim.
 */
export const serviceItems = pgTable(
  "service_items",
  {
    id: text("id").primaryKey(),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<Localized>().notNull(),
    /** Indicative — the workshop confirms the real figure after looking. */
    priceFrom: integer("price_from").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    category: text("category").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("service_items_workshop_idx").on(table.workshopId, table.sortOrder)],
);

/**
 * An appointment.
 *
 * Same two-step shape as a rental booking, for the same reason: a request is a
 * request, not a hold. Several customers may ask for Tuesday at ten and the
 * workshop picks; only confirmation takes the slot, and only the database can
 * arbitrate that.
 *
 * The date and the minute range are kept apart rather than fused into a
 * timestamp so the exclusion constraint can compare them without a timezone
 * ever entering the question — see the note on `workshops`.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => serviceItems.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Free text, or the customer's own listing if they picked one. */
    vehicleLabel: text("vehicle_label").notNull(),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" }),
    appointmentDate: date("appointment_date").notNull(),
    startMinute: integer("start_minute").notNull(),
    /** Derived from the service's duration on the server. Never sent by a client. */
    endMinute: integer("end_minute").notNull(),
    /** Which of the workshop's concurrent slots this occupies once confirmed. */
    slotIndex: integer("slot_index").notNull().default(0),
    status: appointmentStatus("status").notNull().default("requested"),
    priceEstimate: integer("price_estimate").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("appointments_workshop_status_idx").on(table.workshopId, table.status),
    index("appointments_customer_idx").on(table.customerId),
    index("appointments_day_idx").on(table.workshopId, table.appointmentDate),
  ],
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" }),
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    /** Contact details unlock once a booking is confirmed — if deals move to
     *  messengers the platform earns nothing. */
    contactRevealed: boolean("contact_revealed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_threads_updated_idx").on(table.updatedAt)],
);

export const chatParticipants = pgTable(
  "chat_participants",
  {
    threadId: text("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Archived by *this* person.
     *
     * Filing a conversation away is a decision about your own inbox. The flag
     * used to live on the thread, which meant one side tidying up made the
     * conversation vanish for the other — who never asked for that and would
     * simply lose it.
     */
    archived: boolean("archived").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.userId] })],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body"),
    fileName: text("file_name"),
    fileSize: text("file_size"),
    /** The object's name in the bucket. The URL is derived from it at read
     *  time, so changing where files are served from is configuration rather
     *  than a migration over every message ever sent. */
    storageKey: text("storage_key"),
    /** Known before the image loads, so the bubble reserves the right space and
     *  the conversation does not jump under the reader's thumb. */
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    readByRecipient: boolean("read_by_recipient").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_thread_idx").on(table.threadId, table.createdAt)],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.listingId] })],
);

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, { fields: [listings.sellerId], references: [users.id] }),
  city: one(cities, { fields: [listings.cityId], references: [cities.id] }),
  district: one(districts, { fields: [listings.districtId], references: [districts.id] }),
  make: one(makes, { fields: [listings.makeId], references: [makes.id] }),
  model: one(models, { fields: [listings.modelId], references: [models.id] }),
  rentalOffer: one(rentalOffers, {
    fields: [listings.id],
    references: [rentalOffers.listingId],
  }),
  bookings: many(bookings),
}));

export const rentalOffersRelations = relations(rentalOffers, ({ one, many }) => ({
  listing: one(listings, { fields: [rentalOffers.listingId], references: [listings.id] }),
  owner: one(users, { fields: [rentalOffers.ownerId], references: [users.id] }),
  blackouts: many(rentalBlackouts),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  offer: one(rentalOffers, { fields: [bookings.offerId], references: [rentalOffers.id] }),
  listing: one(listings, { fields: [bookings.listingId], references: [listings.id] }),
  renter: one(users, { fields: [bookings.renterId], references: [users.id] }),
  owner: one(users, { fields: [bookings.ownerId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  city: one(cities, { fields: [users.cityId], references: [cities.id] }),
  district: one(districts, { fields: [users.districtId], references: [districts.id] }),
  listings: many(listings),
  offers: many(rentalOffers),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  listing: one(listings, { fields: [chatThreads.listingId], references: [listings.id] }),
  booking: one(bookings, { fields: [chatThreads.bookingId], references: [bookings.id] }),
  participants: many(chatParticipants),
  messages: many(messages),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  actor: one(users, { fields: [adminActions.actorId], references: [users.id] }),
}));

// No relations for `reviews`. It points at `users` twice — author and target —
// and drizzle needs a matching name on both sides of each to tell them apart.
// Declaring four relations to save one lookup is not the trade: the panel reads
// the names in a second query, the way the appointment screens already do.

export const workshopsRelations = relations(workshops, ({ one, many }) => ({
  owner: one(users, { fields: [workshops.ownerId], references: [users.id] }),
  city: one(cities, { fields: [workshops.cityId], references: [cities.id] }),
  district: one(districts, { fields: [workshops.districtId], references: [districts.id] }),
  services: many(serviceItems),
  appointments: many(appointments),
}));

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  workshop: one(workshops, { fields: [serviceItems.workshopId], references: [workshops.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  workshop: one(workshops, { fields: [appointments.workshopId], references: [workshops.id] }),
  service: one(serviceItems, { fields: [appointments.serviceId], references: [serviceItems.id] }),
  customer: one(users, { fields: [appointments.customerId], references: [users.id] }),
}));

/** SQL fragment for the overlap guard, applied in the migration below. */
export const bookingOverlapGuard = sql`
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (
      offer_id WITH =,
      daterange(start_date, end_date, '[]') WITH &&
    )
    WHERE (status IN ('confirmed', 'active'));
`;

/**
 * The same promise for appointments, keyed on the slot as well as the workshop
 * so a shop with three bays can hold three overlapping bookings and no more.
 */
export const appointmentOverlapGuard = sql`
  ALTER TABLE appointments
    ADD CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (
      workshop_id WITH =,
      slot_index WITH =,
      appointment_date WITH =,
      int4range(start_minute, end_minute) WITH &&
    )
    WHERE (status = 'confirmed');
`;
