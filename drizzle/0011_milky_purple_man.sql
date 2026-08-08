DROP INDEX "auth_codes_phone_idx";--> statement-breakpoint
ALTER TABLE "auth_codes" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD COLUMN "destination" text;--> statement-breakpoint
UPDATE "auth_codes" SET "destination" = "phone" WHERE "destination" IS NULL;--> statement-breakpoint
CREATE INDEX "auth_codes_destination_idx" ON "auth_codes" USING btree ("destination","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");