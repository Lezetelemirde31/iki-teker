CREATE TYPE "public"."complaint_reason" AS ENUM('fraud', 'wrongCategory', 'sold', 'offensive', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_label" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" "complaint_reason" NOT NULL,
	"note" text,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by_id" text,
	"resolved_at" timestamp with time zone,
	"resolution_note" text
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "complaints_reporter_target_idx" ON "complaints" USING btree ("reporter_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "complaints_open_idx" ON "complaints" USING btree ("status","created_at");