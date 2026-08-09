"use client";

import { ArrowLeft, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Registering.
 *
 * One form, filled top to bottom, then a code to prove the address — the shape
 * everybody has already used somewhere else, which is the whole argument for it.
 *
 * Everything is checked before the code is sent. Letting somebody complete five
 * fields, wait for a message, type the code and only then hear that the address
 * was taken is the failure this ordering exists to avoid.
 *
 * The account itself is not written until the code comes back, so an abandoned
 * form leaves nothing behind.
 */
export function RegisterForm({
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [national, setNational] = useState("");
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

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const emailValid = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim());
  const phone = national ? `+994${national}` : "";
  const ready =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    (national === "" || national.length === 9);
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

  async function submitForm() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await send("/api/auth/register/check", {
        email: email.trim(),
        name: fullName,
        password,
        ...(phone ? { phone } : {}),
      });
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
        name: fullName,
        password,
        ...(phone ? { phone } : {}),
      });
      if (ok) {
        // Identity lives in Server Components, so the tree has to rebuild
        // before the destination knows who arrived.
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

        <div>
          <h2 className="font-display text-lg font-extrabold">{t("auth.confirmEmail")}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t("auth.codeSentTo")} <span className="font-semibold">{masked}</span>
          </p>
        </div>

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
          {t("auth.createAccount")}
        </Button>

        <button
          type="button"
          disabled={cooldown > 0 || busy}
          onClick={submitForm}
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
        <User className={icon} />
        <input
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
          placeholder={t("auth.firstName")}
          className={cn(field, "pl-10")}
        />
      </div>

      <div className="relative">
        <User className={icon} />
        <input
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
          placeholder={t("auth.lastName")}
          className={cn(field, "pl-10")}
        />
      </div>

      <div className="relative">
        <Mail className={icon} />
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

      <div>
        <div className="relative">
          <Phone className={icon} />
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
        <p className="text-subtle-foreground mt-1 text-[0.6875rem]">{t("auth.phoneOptional")}</p>
      </div>

      <div className="relative">
        <Lock className={icon} />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.passwordPlaceholder")}
          className={cn(field, "pl-10")}
        />
      </div>

      {alert}

      <Button
        size="lg"
        block
        className="font-display uppercase"
        disabled={!ready || busy}
        onClick={submitForm}
      >
        {busy && <Loader2 className="animate-spin" />}
        {t("auth.register")}
      </Button>

      <p className="text-subtle-foreground text-center text-[0.6875rem] leading-relaxed">
        {t("auth.emailNote")}
      </p>

      <p className="text-muted-foreground pt-2 text-center text-xs">
        {t("auth.haveAccount")}{" "}
        <Link href={`/${locale}/login`} className="text-primary font-semibold">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
