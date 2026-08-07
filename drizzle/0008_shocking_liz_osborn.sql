CREATE TYPE "public"."appointment_status" AS ENUM('requested', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workshop_status" AS ENUM('active', 'moderation', 'draft', 'archived');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"workshop_id" text NOT NULL,
	"service_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"vehicle_label" text NOT NULL,
	"listing_id" text,
	"appointment_date" date NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"slot_index" integer DEFAULT 0 NOT NULL,
	"status" "appointment_status" DEFAULT 'requested' NOT NULL,
	"price_estimate" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"price_from" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"city_id" text NOT NULL,
	"district_id" text NOT NULL,
	"address" jsonb NOT NULL,
	"phone" text NOT NULL,
	"summary" jsonb NOT NULL,
	"about" jsonb NOT NULL,
	"specialties" jsonb NOT NULL,
	"open_minute" integer NOT NULL,
	"close_minute" integer NOT NULL,
	"days_label" jsonb NOT NULL,
	"mobile_service" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"promoted" boolean DEFAULT false NOT NULL,
	"concurrent_slots" integer DEFAULT 1 NOT NULL,
	"photos" jsonb NOT NULL,
	"status" "workshop_status" DEFAULT 'moderation' NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workshops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_service_items_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_workshop_status_idx" ON "appointments" USING btree ("workshop_id","status");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "appointments_day_idx" ON "appointments" USING btree ("workshop_id","appointment_date");--> statement-breakpoint
CREATE INDEX "service_items_workshop_idx" ON "service_items" USING btree ("workshop_id","sort_order");--> statement-breakpoint
CREATE INDEX "workshops_city_idx" ON "workshops" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "workshops_owner_idx" ON "workshops" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "workshops_directory_idx" ON "workshops" USING btree ("status","promoted","rating");