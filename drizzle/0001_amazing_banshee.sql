CREATE TYPE "public"."rejection_reason" AS ENUM('prohibited', 'misleading', 'duplicate', 'contactInfo', 'poorQuality', 'wrongCategory', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" "rejection_reason",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_listing_idx" ON "moderation_actions" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_moderator_idx" ON "moderation_actions" USING btree ("moderator_id");