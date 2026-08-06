import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { VehicleArt } from "@/components/common/vehicle-art";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { formatRelativeTime } from "@/lib/format";
import { getCatalogItem, getInbox, getUser } from "@/server/data";
import { currentUserId } from "@/server/session";
import { cn } from "@/lib/utils";

export default async function ChatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const userId = await currentUserId();
  const threads = await getInbox(userId);

  // Both lookups are resolved before rendering: awaiting inside the list would
  // fire a query per row and run them one after another.
  const otherIds = [
    ...new Set(
      threads
        .map((thread) => thread.participantIds.find((id) => id !== userId))
        .filter((id) => id !== undefined),
    ),
  ];
  const listingIds = [
    ...new Set(threads.map((thread) => thread.listingId).filter((id) => id !== undefined)),
  ];

  const [people, items] = await Promise.all([
    Promise.all(otherIds.map((id) => getUser(id))).then(
      (users) => new Map(users.filter((u) => u !== undefined).map((u) => [u.id, u])),
    ),
    Promise.all(listingIds.map((id) => getCatalogItem(id))).then(
      (found) => new Map(found.filter((i) => i !== undefined).map((i) => [i.id, i])),
    ),
  ]);

  return (
    <PageTransition>
      <AppHeader title={t("chat.title")} hazard />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        {threads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="size-6" strokeWidth={1.7} />}
            title={t("chat.empty")}
            body={t("chat.emptyBody")}
          />
        ) : (
          <ul className="divide-border divide-y">
            {threads.map((thread) => {
              const otherId = thread.participantIds.find((id) => id !== userId);
              const other = otherId ? people.get(otherId) : undefined;
              const item = thread.listingId ? items.get(thread.listingId) : undefined;
              const last = thread.messages[thread.messages.length - 1];
              const cover = item?.photos[0];

              return (
                <li key={thread.id}>
                  <Link
                    href={`/${locale}/chats/${thread.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <span className="relative shrink-0">
                      {cover ? (
                        <VehicleArt
                          src={cover.url}
                          seed={cover.seed}
                          tone={cover.tone}
                          shape={item!.category}
                          className="size-12"
                        />
                      ) : (
                        <span className="bg-muted font-display grid size-12 place-items-center rounded-md text-xs font-extrabold">
                          {other?.initials}
                        </span>
                      )}
                      {other?.online && (
                        <span className="bg-rental border-background absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            thread.unreadCount > 0 ? "font-bold" : "font-semibold",
                          )}
                        >
                          {other?.name}
                        </span>
                        <span className="text-subtle-foreground shrink-0 text-[0.625rem]">
                          {formatRelativeTime(thread.updatedAt, locale)}
                        </span>
                      </span>

                      {item && (
                        <span className="text-subtle-foreground mt-0.5 block truncate text-[0.6875rem]">
                          {item.title}
                        </span>
                      )}

                      <span className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs",
                            thread.unreadCount > 0
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          {last?.body ?? `📎 ${t("chat.attachment")}`}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground grid size-4.5 shrink-0 place-items-center rounded-full text-[0.5625rem] font-bold">
                            {thread.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </PageTransition>
  );
}
