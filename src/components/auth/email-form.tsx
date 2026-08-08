"use client";

import { ArrowLeft, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Signing in and registering with an email address.
 *
 * Its own component rather than another branch inside the phone form, which is
 * six hundred lines of number handling this has nothing to do with. It sits
 * first on the screen because it is the path that currently works: sending an
 * SMS needs a provider contract that needs a registered company, and sending
 * an email does not.
 *
 * Three steps, and the middle one is the point:
 *
 *   address  — nothing else is asked, so the answer cannot reveal whether the
 *              address already has an account
 *   code     — proves the inbox is theirs
 *   details  — name, number and password, shown only if it turns out to be a
 *              new account
 *
 * Collecting the details before the code would mean typing a password into a
 * form that has not established the address is even reachable. Collecting them
 * after is also why there is no separate "register" tab: nobody has to know in
 * advance which of the two they are doing.
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

  const [step, setStep] = useState<"address" | "code" | "details">("address");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [national, setNational] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

  const emailValid = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);
  const detailsValid = name.trim().length >= 2 && newPassword.length >= 8;

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
    // Identity lives in Server Components, so the tree has to rebuild before
    // the destination knows who arrived.
    router.refresh();
    setTimeout(() => router.replace(redirectTo), 900);
  }

  /* ---- the quick way back in, for anyone who set a password ------------- */

  async function signInWithPassword() {
    if (!emailValid || password.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/email/password", {
        email: email.trim(),
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

  /* ---- the code path ---------------------------------------------------- */

  async function requestCode() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/email/start", { email: email.trim() });
      if (ok) {
        setMasked(data?.masked ?? email.trim());
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
        email: email.trim(),
        code,
        // Empty on this pass. If the address turns out to be new the server
        // says so, and the details step collects them.
        name: "",
      });
      if (ok) return arrive();

      // Not a refusal — a request for the rest.
      if (data?.error === "nameRequired") {
        setStep("details");
        setError(null);
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

  async function submitDetails() {
    if (!detailsValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/email/verify", {
        email: email.trim(),
        code,
        name: name.trim(),
        password: newPassword,
        ...(national ? { phone: `+994${national}` } : {}),
      });
      if (ok) return arrive();

      // The code was spent proving the address; only the details were wrong,
      // so they stay on this step and fix them.
      setError(explain(data?.error));
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "bg-card border-border focus:border-primary w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors";
  const withIcon = cn(field, "pl-10");

  const alert = error && (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
      {error}
    </p>
  );

  /* ---- step three ------------------------------------------------------- */

  if (step === "details") {
    return (
      <div className="space-y-3">
        <div>
          <p className="font-display text-base font-extrabold">{t("auth.almostThere")}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{t("auth.detailsBody")}</p>
        </div>

        <div className="relative">
          <User className="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder={t("auth.namePlaceholder")}
            className={withIcon}
          />
        </div>

        <div className="relative">
          <Phone className="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <span className="text-muted-foreground tabular pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm">
            +994
          </span>
          <input
            value={national}
            onChange={(event) => setNational(event.target.value.replace(/\D/g, "").slice(0, 9))}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="50 123 45 67"
            className={cn(field, "tabular pl-[4.75rem]")}
          />
        </div>
        <p className="text-subtle-foreground -mt-1 text-[0.6875rem]">{t("auth.phoneOptional")}</p>

        <div className="relative">
          <Lock className="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.passwordPlaceholder")}
            className={withIcon}
          />
        </div>

        {alert}

        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!detailsValid || busy}
          onClick={submitDetails}
        >
          {busy && <Loader2 className="animate-spin" />}
          {t("auth.createAccount")}
        </Button>
      </div>
    );
  }

  /* ---- step two --------------------------------------------------------- */

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

        {alert}

        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!codeValid || busy}
          onClick={submitCode}
        >
          {busy && <Loader2 className="animate-spin" />}
          {t("common.continue")}
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

  /* ---- step one --------------------------------------------------------- */

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
          className={withIcon}
        />
      </div>

      <div className="relative">
        <Lock className="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.passwordOptional")}
          className={withIcon}
        />
      </div>

      {alert}

      <Button
        size="lg"
        block
        className="font-display uppercase"
        disabled={!emailValid || password.length < 8 || busy}
        onClick={signInWithPassword}
      >
        {busy && <Loader2 className="animate-spin" />}
        {t("auth.login")}
      </Button>

      {/* The way in for anybody who has no password yet — everybody, the first
          time — and the way back for anybody who has lost it. */}
      <Button
        size="lg"
        block
        variant="outline"
        className="font-display uppercase"
        disabled={!emailValid || busy}
        onClick={requestCode}
      >
        {t("auth.continueWithEmail")}
      </Button>

      <p className="text-subtle-foreground text-center text-[0.6875rem] leading-relaxed">
        {t("auth.emailNote")}
      </p>
    </div>
  );
}
