CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'banned');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'support' BEFORE 'moderator';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'superadmin';--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_label" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"reason" "rejection_reason",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "moderation_listing_idx";--> statement-breakpoint
DROP INDEX "moderation_moderator_idx";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_recent_idx" ON "admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_actions_entity_idx" ON "admin_actions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "admin_actions_actor_idx" ON "admin_actions" USING btree ("actor_id");