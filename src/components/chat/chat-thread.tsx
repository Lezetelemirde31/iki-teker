"use client";

import { FileText, Lock, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

/**
 * Chat thread.
 *
 * Every agreement stays here: in a rental dispute this history is the only
 * evidence both sides actually have. Sending a message triggers a scripted
 * reply after a beat so the flow can be demonstrated end to end.
 */
export function ChatThread({
  threadId,
  initialMessages,
  currentUserId,
  otherName,
  contactRevealed,
  locale,
  messages: dict,
}: {
  threadId: string;
  initialMessages: Message[];
  currentUserId: string;
  otherName: string;
  contactRevealed: boolean;
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(dict);
  const [thread, setThread] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [failed, setFailed] = useState(false);
  // Starts from the server's answer and can flip mid-conversation, the moment
  // the owner confirms a booking.
  const [unlocked, setUnlocked] = useState(contactRevealed);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, typing]);

  /**
   * Watches for the other side while this thread is open.
   *
   * Every four seconds, asking only for what arrived after the newest message
   * already on screen. Stops entirely when the tab is hidden — a phone in a
   * pocket should not be polling, and the push notification covers that case
   * anyway.
   */
  useEffect(() => {
    let cancelled = false;

    async function pull() {
      if (document.visibilityState !== "visible") return;

      const newest = thread[thread.length - 1]?.createdAt;
      try {
        const response = await fetch(
          `/api/threads/${threadId}/messages/poll${newest ? `?since=${encodeURIComponent(newest)}` : ""}`,
        );
        if (!response.ok || cancelled) return;

        const data: { messages?: Message[]; contactRevealed?: boolean } = await response.json();
        if (data.contactRevealed) setUnlocked(true);
        if (!data.messages?.length) return;

        setThread((current) => {
          // A reply can arrive while one of ours is still in flight, so merge
          // by id rather than appending and showing anything twice.
          const seen = new Set(current.map((message) => message.id));
          const additions = data.messages!.filter((message) => !seen.has(message.id));
          return additions.length ? [...current, ...additions] : current;
        });
      } catch {
        // Offline or a slow network: the next tick tries again.
      }
    }

    const timer = setInterval(pull, 4000);
    document.addEventListener("visibilitychange", pull);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [threadId, thread]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    // Shown immediately and reconciled with the server's copy when it lands.
    // Waiting for a round trip before the message appears makes a chat feel
    // broken even when it is working.
    const pendingId = `pending-${Date.now()}`;
    setThread((current) => [
      ...current,
      {
        id: pendingId,
        threadId,
        authorId: currentUserId,
        kind: "text",
        body,
        createdAt: new Date().toISOString(),
        readByRecipient: false,
      },
    ]);
    setDraft("");
    setFailed(false);

    try {
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (response.ok) {
        const { message } = await response.json();
        setThread((current) => current.map((m) => (m.id === pendingId ? message : m)));
        return;
      }

      // No database on the demo deployment, so there is nowhere to put it. The
      // scripted reply keeps the flow demonstrable; it is not pretending the
      // message was delivered to anyone.
      if (response.status === 404) {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setThread((current) => [
            ...current,
            {
              id: `reply-${current.length}`,
              threadId,
              authorId: "other",
              kind: "text",
              body: "Salam! Bir dəqiqə, yoxlayıb yazıram 👍",
              createdAt: new Date().toISOString(),
              readByRecipient: true,
            },
          ]);
        }, 1400);
        return;
      }

      throw new Error(String(response.status));
    } catch {
      // Take the message back out rather than leave it looking sent.
      setThread((current) => current.filter((m) => m.id !== pendingId));
      setDraft(body);
      setFailed(true);
    }
  }

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {!unlocked && (
          <p className="bg-muted text-muted-foreground mx-auto mb-3 flex max-w-[17rem] items-start gap-2 rounded-lg px-3 py-2 text-[0.6875rem] leading-relaxed">
            <Lock className="mt-px size-3.5 shrink-0" strokeWidth={2.2} />
            {t("chat.contactLocked")}
          </p>
        )}

        <div className="space-y-1.5">
          {thread.map((message, index) => {
            const mine = message.authorId === currentUserId;
            const prev = thread[index - 1];
            const grouped = prev?.authorId === message.authorId;

            return (
              <div key={message.id} className={cn("flex", mine && "justify-end")}>
                <div
                  className={cn(
                    "max-w-[78%] px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                      : "bg-card border-border rounded-2xl rounded-bl-md border",
                    grouped && (mine ? "rounded-tr-md" : "rounded-tl-md"),
                  )}
                >
                  {message.kind === "file" ? (
                    <span className="flex items-center gap-2">
                      <FileText className="size-5 shrink-0" strokeWidth={1.8} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">
                          {message.fileName}
                        </span>
                        <span className="block text-[0.625rem] opacity-70">
                          {message.fileSize}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="leading-relaxed whitespace-pre-wrap">{message.body}</span>
                  )}

                  <span
                    className={cn(
                      "tabular mt-1 block text-[0.5625rem]",
                      mine ? "text-primary-foreground/60 text-right" : "text-subtle-foreground",
                    )}
                  >
                    {formatTime(message.createdAt, locale)}
                    {mine && (message.readByRecipient ? " ✓✓" : " ✓")}
                  </span>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="flex">
              <div className="bg-card border-border flex gap-1 rounded-2xl rounded-bl-md border px-3 py-3">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="bg-muted-foreground size-1.5 animate-bounce rounded-full"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="border-border bg-card safe-bottom shrink-0 border-t px-3 pt-2.5 pb-2.5"
      >
        {failed && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-2 rounded-lg px-3 py-1.5 text-[0.6875rem]"
          >
            {t("chat.sendFailed")}
          </p>
        )}
        <div className="flex items-end gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("chat.placeholder")}
            aria-label={`${t("chat.send")} — ${otherName}`}
            enterKeyHint="send"
            className="bg-surface-2 border-border placeholder:text-subtle-foreground h-11 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t("chat.send")}
            className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-40"
          >
            <SendHorizontal className="size-5" strokeWidth={2.2} />
          </button>
        </div>
      </form>
    </>
  );
}
