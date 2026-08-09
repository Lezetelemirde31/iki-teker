"use client";

import { ArrowLeft, AtSign, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Signing in.
 *
 * One field for who you are and one for the password. Which of the two you
 * typed — an address or a number — is not a decision worth making somebody
 * make: they remember one of them, and the shape of what they typed says which.
 *
 * The code underneath is the way back for anybody without a password: everyone
 * who registered before passwords existed, and everyone who has forgotten
 * theirs. It only works for an address, because sending an SMS still needs a
 * provider contract that does not exist.
 */
export function LoginForm({
  locale,
  messages,
  redirectTo,
}: {
  locale: Locale;
  messages: Messages;
  redirectTo: string;
}) {
  const t = createTranslator(messages);
  const router = useRouter();

  const [step, setStep] = useState<"form" | "code">("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
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

  const looksLikeEmail = identifier.includes("@");
  const identifierValid = looksLikeEmail
    ? /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(identifier.trim())
    : identifier.replace(/\D/g, "").length >= 9;
  const codeValid = /^\d{6}$/.test(code);

  function explain(reason: unknown): string {
    const key = `auth.error.${reason}` as Parameters<typeof t>[0];
    const message = t(key);
    return message === key ? t("auth.error.generic") : message;
  }

  async function send(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  }

  function arrive() {
    router.refresh();
    setTimeout(() => router.replace(redirectTo), 900);
  }

  async function signIn() {
    if (!identifierValid || password.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/signin", {
        identifier: identifier.trim(),
        password,
      });
      if (ok) return arrive();
      setError(explain(data?.error));
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    if (!looksLikeEmail || !identifierValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/email/start", { email: identifier.trim() });
      if (ok) {
        setMasked(data?.masked ?? identifier.trim());
        setDevCode(data?.devCode ?? null);
        setCooldown(60);
        setStep("code");
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
      const { ok, data } = await send("/api/auth/email/verify", {
        email: identifier.trim(),
        code,
        name: "",
      });
      if (ok) return arrive();
      // No account behind this address. Registering is a form, not a code.
      if (data?.error === "nameRequired") {
        router.push(`/${locale}/register`);
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
  const icon = "text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2";

  const alert = error && (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
      {error}
    </p>
  );

  if (step === "code") {
    return (
      <div className="space-y-3 px-4 py-4">
        <button
          type="button"
          onClick={() => {
            setStep("form");
            setCode("");
            setError(null);
          }}
          className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="size-3.5" />
          {t("common.back")}
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

        {alert}

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
    <div className="space-y-3 px-4 py-4">
      <div className="relative">
        <AtSign className={icon} />
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          placeholder={t("auth.identifierPlaceholder")}
          className={cn(field, "pl-10")}
        />
      </div>

      <div className="relative">
        <Lock className={icon} />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.passwordOptional")}
          className={cn(field, "pl-10")}
        />
      </div>

      {alert}

      <Button
        size="lg"
        block
        className="font-display uppercase"
        disabled={!identifierValid || password.length < 8 || busy}
        onClick={signIn}
      >
        {busy && <Loader2 className="animate-spin" />}
        {t("auth.login")}
      </Button>

      {/* Only offered for an address: a code can be emailed, and cannot yet be
          texted. Saying so only when it applies keeps the screen honest. */}
      {looksLikeEmail && (
        <button
          type="button"
          disabled={!identifierValid || busy}
          onClick={requestCode}
          className="text-primary w-full text-center text-xs font-semibold disabled:opacity-50"
        >
          {t("auth.signInWithCode")}
        </button>
      )}

      <p className="text-muted-foreground pt-2 text-center text-xs">
        {t("auth.noAccount")}{" "}
        <Link href={`/${locale}/register`} className="text-primary font-semibold">
          {t("auth.register")}
        </Link>
      </p>
    </div>
  );
}
