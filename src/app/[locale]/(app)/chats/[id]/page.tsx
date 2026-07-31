import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatThread } from "@/components/chat/chat-thread";
import { VehicleArt } from "@/components/common/vehicle-art";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { getCatalogItem, getThread, getUser } from "@/server/data";
import { currentUserId } from "@/server/session";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const thread = await getThread(id);
  if (!thread) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);
  const userId = await currentUserId();
  const otherId = thread.participantIds.find((participant) => participant !== userId);
  const other = otherId ? await getUser(otherId) : undefined;
  const item = thread.listingId ? await getCatalogItem(thread.listingId) : undefined;
  const cover = item?.photos[0];

  return (
    <PageTransition>
      <AppHeader
        back
        title={
          <span className="flex items-center gap-2.5">
            <span className="bg-muted grid size-8 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold">
              {other?.initials}
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-sm font-extrabold">
                {other?.name}
              </span>
              <span className="text-subtle-foreground block truncate text-[0.625rem]">
                {other?.online
                  ? t("chat.online")
                  : other?.lastSeenAt
                    ? formatRelativeTime(other.lastSeenAt, locale)
                    : ""}
              </span>
            </span>
          </span>
        }
      />

      {/* The listing stays pinned so both sides always know what is being discussed. */}
      {item && (
        <Link
          href={`/${locale}/listing/${item.id}`}
          className="border-border bg-card flex shrink-0 items-center gap-2.5 border-b px-4 py-2.5 transition-colors active:opacity-70"
        >
          {cover && (
            <VehicleArt
              seed={cover.seed}
              tone={cover.tone}
              shape={item.category}
              className="size-10 shrink-0"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{item.title}</span>
            <span className="font-display tabular block text-sm font-extrabold">
              {formatPrice(item.price, locale)}
            </span>
          </span>
        </Link>
      )}

      <ChatThread
        threadId={thread.id}
        initialMessages={thread.messages}
        currentUserId={userId}
        otherName={other?.name ?? ""}
        contactRevealed={thread.contactRevealed}
        locale={locale}
        messages={messages}
      />
    </PageTransition>
  );
}
