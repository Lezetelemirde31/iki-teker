CREATE TYPE "public"."vip_order_status" AS ENUM('pending', 'paid', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "vip_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"listing_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"days" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" "vip_order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_id" text,
	"decided_at" timestamp with time zone,
	"note" text,
	CONSTRAINT "vip_orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "vip_orders" ADD CONSTRAINT "vip_orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_orders" ADD CONSTRAINT "vip_orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_orders" ADD CONSTRAINT "vip_orders_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vip_orders_pending_idx" ON "vip_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "vip_orders_seller_idx" ON "vip_orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "vip_orders_listing_idx" ON "vip_orders" USING btree ("listing_id");