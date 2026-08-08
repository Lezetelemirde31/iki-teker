UPDATE "auth_codes" SET "destination" = "phone" WHERE "destination" IS NULL AND "phone" IS NOT NULL;--> statement-breakpoint
DELETE FROM "auth_codes" WHERE "destination" IS NULL;--> statement-breakpoint
ALTER TABLE "auth_codes" ALTER COLUMN "destination" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_codes" DROP COLUMN "phone";
