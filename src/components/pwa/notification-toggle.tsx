"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";

/**
 * Turning notifications on.
 *
 * Behind a button rather than a prompt on arrival. A permission dialogue that
 * appears before anyone knows what the site is gets denied, and a denial is
 * sticky — the browser will not ask again, and the person has to dig through
 * settings to undo it. Asking after they have a reason costs one tap and keeps
 * the option alive.
 *
 * Nothing is rendered where notifications cannot work, rather than offering a
 * button that fails.
 */
export function NotificationToggle({ publicKey }: { publicKey: string }) {
  const t = useT();
  const locale = useLocale();

  const [state, setState] = useState<"loading" | "off" | "on" | "blocked" | "unsupported">(
    "loading",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Required by every browser: a push service will not deliver a payload
        // the user cannot attribute to a site.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), locale }),
      });

      if (!response.ok) {
        // Registered with the browser but not with us: it would never fire.
        await subscription.unsubscribe();
        setState("off");
        return;
      }
      setState("on");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      // Left as it was; the button can be pressed again.
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "blocked") {
    return (
      <p className="bg-muted text-muted-foreground flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed">
        <BellOff className="mt-px size-4 shrink-0" strokeWidth={2} />
        {t("push.blocked")}
      </p>
    );
  }

  if (state === "on") {
    return (
      <div className="space-y-2">
        <p className="text-rental flex items-center gap-2 text-xs font-semibold">
          <Bell className="size-4" strokeWidth={2.4} />
          {t("push.enabled")}
        </p>
        <Button variant="ghost" size="sm" block disabled={busy} onClick={disable}>
          {t("push.disable")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">{t("push.why")}</p>
      <Button variant="outline" size="lg" block disabled={busy} onClick={enable}>
        {busy ? <Loader2 className="animate-spin" /> : <Bell />}
        {t("push.enable")}
      </Button>
    </div>
  );
}

/**
 * The VAPID key travels as base64url and the subscribe call wants bytes.
 *
 * Written out rather than pulled from a library: it is eight lines, and the
 * alternative is shipping a package to the browser for one conversion.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

  // Backed by a plain ArrayBuffer rather than the generic default, which is
  // what `applicationServerKey` accepts.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
