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
export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

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
    phone: text("phone").notNull(),
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
    /** Optional contact, never an identity. Sign-in is by phone; this exists so
     *  receipts and rental agreements have somewhere to go later. */
    email: text("email"),
    /** scrypt, with its parameters embedded. Null for accounts created before
     *  passwords existed, and for anyone who only ever signs in by SMS. */
    passwordHash: text("password_hash"),
  },
  (table) => [uniqueIndex("users_phone_idx").on(table.phone)],
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
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    /** Present when this code is for a phone that has no account yet. */
    pendingName: text("pending_name"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_codes_phone_idx").on(table.phone, table.createdAt)],
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
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => users.id),
    /** "approve" or "reject" — text rather than an enum so adding a third
     *  outcome later does not need a migration on a live database. */
    action: text("action").notNull(),
    reason: rejectionReason("reason"),
    /** Free text the seller sees alongside the reason. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_listing_idx").on(table.listingId, table.createdAt),
    index("moderation_moderator_idx").on(table.moderatorId),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_target_idx").on(table.targetId)],
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
    archived: boolean("archived").notNull().default(false),
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
