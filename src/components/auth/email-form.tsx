"use client";

import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Signing in with an email address.
 *
 * Its own component rather than another branch inside the phone form, which is
 * six hundred lines of number handling this has nothing to do with. Two steps
 * and no password: type the address, type the code that arrives.
 *
 * It sits first on the screen because it is the path that currently works.
 * Sending an SMS needs a provider contract that needs a registered company;
 * sending an email does not.
 *
 * The name is asked for on the same screen rather than behind a separate
 * "register" tab, because the person typing does not know or care which they
 * are doing — an address either has an account or is about to.
 */
export function EmailForm({
  messages,
  redirectTo,
}: {
  messages: Messages;
  redirectTo: string;
}) {
  const t = createTranslator(messages);
  const router = useRouter();

  const [step, setStep] = useState<"address" | "code">("address");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const emailValid = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);

  function explain(reason: unknown): string {
    const key = `auth.error.${reason}` as Parameters<typeof t>[0];
    const message = t(key);
    return message === key ? t("auth.error.generic") : message;
  }

  async function requestCode() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setMasked(data?.masked ?? email.trim());
        setDevCode(data?.devCode ?? null);
        setCooldown(60);
        setStep("code");
        return;
      }

      // The one failure that is a request for more, not a refusal: an address
      // nobody has used needs something to call the account.
      if (data?.error === "nameRequired") {
        setNeedsName(true);
        setError(t("auth.error.nameRequired"));
        return;
      }

      if (data?.retryAfterSeconds) setCooldown(data.retryAfterSeconds);
      setError(explain(data?.error));
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (!codeValid || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        // Identity lives in Server Components, so the tree has to rebuild
        // before the destination knows who arrived — refresh first, navigate
        // after. Pushing straight away lands on a page still rendered for a
        // stranger.
        router.refresh();
        setTimeout(() => router.replace(redirectTo), 900);
        return;
      }

      setError(explain(data?.error));
      setCode("");
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "bg-card border-border focus:border-primary w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors";

  if (step === "code") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setStep("address");
            setCode("");
            setError(null);
          }}
          className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="size-3.5" />
          {t("auth.changeEmail")}
        </button>

        <p className="text-muted-foreground text-sm">
          {t("auth.codeSentTo")} <span className="font-semibold">{masked}</span>
        </p>

        {devCode && (
          <p className="bg-primary/10 text-foreground rounded-lg px-3 py-2 text-center text-sm">
            {t("auth.demoCode")} <span className="tabular font-bold">{devCode}</span>
          </p>
        )}

        <input
          ref={codeRef}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className={cn(field, "tabular text-center text-lg tracking-[0.4em]")}
        />

        {error && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
            {error}
          </p>
        )}

        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!codeValid || busy}
          onClick={submitCode}
        >
          {busy && <Loader2 className="animate-spin" />}
          {t("auth.login")}
        </Button>

        <button
          type="button"
          disabled={cooldown > 0 || busy}
          onClick={requestCode}
          className="text-muted-foreground w-full text-center text-xs disabled:opacity-50"
        >
          {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Mail className="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          className={cn(field, "pl-10")}
        />
      </div>

      {needsName && (
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          placeholder={t("auth.namePlaceholder")}
          className={field}
        />
      )}

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
          {error}
        </p>
      )}

      <Button
        size="lg"
        block
        className="font-display uppercase"
        disabled={!emailValid || busy || (needsName && name.trim().length < 2)}
        onClick={requestCode}
      >
        {busy && <Loader2 className="animate-spin" />}
        {t("auth.continueWithEmail")}
      </Button>

      <p className="text-subtle-foreground text-center text-[0.6875rem] leading-relaxed">
        {t("auth.emailNote")}
      </p>
    </div>
  );
}
