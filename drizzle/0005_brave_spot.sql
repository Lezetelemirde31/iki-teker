ALTER TABLE "chat_participants" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Carry the old thread-level flag onto both members before it is dropped, so
-- anything already archived stays archived instead of reappearing in an inbox.
--
-- Guarded because the seed replays every migration against whatever database it
-- finds, and on a second run the source column is already gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'archived'
  ) THEN
    UPDATE "chat_participants" SET "archived" = "chat_threads"."archived"
      FROM "chat_threads" WHERE "chat_threads"."id" = "chat_participants"."thread_id";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "chat_threads" DROP COLUMN IF EXISTS "archived";
