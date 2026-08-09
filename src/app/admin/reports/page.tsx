import { notFound } from "next/navigation";

import { ComplaintsScreen } from "@/components/screens/complaints-screen";
import { getMessages } from "@/i18n/dictionaries";
import { can } from "@/server/authorization";
import { complaintQueue } from "@/server/complaints";

/** Reports, inside the panel. Same reuse as the moderation queue next door. */
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  if (!(await can("moderateContent"))) notFound();

  const [messages, queue] = await Promise.all([getMessages("az"), complaintQueue()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">Şikayətlər</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {queue.length > 0 ? `${queue.length} şikayət açıqdır.` : "Açıq şikayət yoxdur."}
        </p>
      </div>

      <div className="max-w-2xl">
        <ComplaintsScreen queue={queue} locale="az" messages={messages} />
      </div>
    </div>
  );
}
