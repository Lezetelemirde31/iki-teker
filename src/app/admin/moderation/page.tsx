import { notFound } from "next/navigation";

import { ModerationScreen } from "@/components/screens/moderation-screen";
import { getMessages } from "@/i18n/dictionaries";
import { can } from "@/server/authorization";
import { moderationQueue } from "@/server/moderation";

/**
 * The listing queue, inside the panel.
 *
 * The screen itself is the one the mobile app used, unchanged — the decisions
 * a moderator makes are the same either way, and rewriting a working queue to
 * sit in a wider column would risk them for nothing. It is held to a readable
 * width here rather than stretched across a monitor.
 */
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  if (!(await can("moderateContent"))) notFound();

  const [messages, queue] = await Promise.all([getMessages("az"), moderationQueue()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Moderasiya</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {queue.length > 0
            ? `${queue.length} elan qərar gözləyir.`
            : "Gözləyən elan yoxdur."}
        </p>
      </div>

      <div className="max-w-2xl">
        <ModerationScreen queue={queue} locale="az" messages={messages} />
      </div>
    </div>
  );
}
