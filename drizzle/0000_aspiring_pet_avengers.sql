CREATE TYPE "public"."account_kind" AS ENUM('private', 'shop', 'rental');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'active', 'returned', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."catalog_kind" AS ENUM('vehicle', 'part');--> statement-breakpoint
CREATE TYPE "public"."condition_kind" AS ENUM('new', 'used');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('missing', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."licence_category" AS ENUM('A', 'A1', 'B', 'none');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'moderation', 'draft', 'sold', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('text', 'file', 'image', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cashOnPickup', 'card');--> statement-breakpoint
CREATE TYPE "public"."review_context" AS ENUM('rental', 'sale', 'service');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"offer_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"renter_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" integer NOT NULL,
	"day_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"service_fee" integer DEFAULT 0 NOT NULL,
	"deposit" integer NOT NULL,
	"total" integer NOT NULL,
	"commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cashOnPickup' NOT NULL,
	"licence_status" "document_status" DEFAULT 'missing' NOT NULL,
	"agreement_signed" boolean DEFAULT false NOT NULL,
	"handover" jsonb,
	"return_check" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "chat_participants_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"booking_id" text,
	"contact_revealed" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "catalog_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"negotiable" boolean DEFAULT false NOT NULL,
	"condition" "condition_kind" DEFAULT 'used' NOT NULL,
	"description" jsonb NOT NULL,
	"attributes" jsonb NOT NULL,
	"photos" jsonb NOT NULL,
	"seller_id" text NOT NULL,
	"city_id" text NOT NULL,
	"district_id" text NOT NULL,
	"delivery" boolean DEFAULT false NOT NULL,
	"status" "listing_status" DEFAULT 'moderation' NOT NULL,
	"make_id" text,
	"model_id" text,
	"year" integer,
	"customs_cleared" boolean,
	"brand" text,
	"part_type" text,
	"part_number" text,
	"stock" integer,
	"localized_title" jsonb,
	"compatibility" jsonb,
	"vip" boolean DEFAULT false NOT NULL,
	"vip_until" date,
	"bumps_left" integer,
	"last_bumped_at" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL,
	"contacts" integer DEFAULT 0 NOT NULL,
	"favorites" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "makes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"categories" jsonb NOT NULL,
	CONSTRAINT "makes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_id" text NOT NULL,
	"kind" "message_kind" DEFAULT 'text' NOT NULL,
	"body" text,
	"file_name" text,
	"file_size" text,
	"read_by_recipient" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"make_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"year_from" integer NOT NULL,
	"year_to" integer NOT NULL,
	"body_type" text
);
--> statement-breakpoint
CREATE TABLE "rental_blackouts" (
	"offer_id" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "rental_blackouts_offer_id_day_pk" PRIMARY KEY("offer_id","day")
);
--> statement-breakpoint
CREATE TABLE "rental_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"rate_per_hour" integer,
	"rate_per_day" integer NOT NULL,
	"rate_per_week" integer,
	"long_stay_min_days" integer,
	"long_stay_day_price" integer,
	"deposit" integer NOT NULL,
	"min_days" integer DEFAULT 1 NOT NULL,
	"max_days" integer DEFAULT 30 NOT NULL,
	"licence_required" "licence_category" DEFAULT 'none' NOT NULL,
	"free_cancellation_hours" integer DEFAULT 24 NOT NULL,
	"pickup" jsonb NOT NULL,
	"includes" jsonb NOT NULL,
	"handover_time" text DEFAULT '10:00' NOT NULL,
	"instant_book" boolean DEFAULT false NOT NULL,
	"commission_rate" numeric(4, 3) DEFAULT '0.08' NOT NULL,
	CONSTRAINT "rental_offers_listing_id_unique" UNIQUE("listing_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"target_id" text NOT NULL,
	"rating" integer NOT NULL,
	"text" jsonb NOT NULL,
	"context" "review_context" NOT NULL,
	"subject" jsonb NOT NULL,
	"booking_id" text,
	"verified_transaction" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"avatar_tone" text NOT NULL,
	"kind" "account_kind" DEFAULT 'private' NOT NULL,
	"phone" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"verified_badge" boolean DEFAULT false NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"rentals_count" integer DEFAULT 0 NOT NULL,
	"member_since" date NOT NULL,
	"response_minutes" integer DEFAULT 60 NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"city_id" text,
	"district_id" text,
	"address" jsonb,
	"hours" jsonb,
	"bio" jsonb,
	"specialties" jsonb,
	"subscription" text DEFAULT 'none'
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_rental_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."rental_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_make_id_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."makes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_make_id_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."makes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_blackouts" ADD CONSTRAINT "rental_blackouts_offer_id_rental_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."rental_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_offers" ADD CONSTRAINT "rental_offers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_offers" ADD CONSTRAINT "rental_offers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_offer_idx" ON "bookings" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "bookings_owner_status_idx" ON "bookings" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "bookings_renter_idx" ON "bookings" USING btree ("renter_id");--> statement-breakpoint
CREATE INDEX "chat_threads_updated_idx" ON "chat_threads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "districts_city_idx" ON "districts" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "listings_make_model_idx" ON "listings" USING btree ("make_id","model_id");--> statement-breakpoint
CREATE INDEX "listings_published_idx" ON "listings" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "models_make_idx" ON "models" USING btree ("make_id");--> statement-breakpoint
CREATE INDEX "rental_offers_owner_idx" ON "rental_offers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "reviews_target_idx" ON "reviews" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");