"use client";

import { ArrowLeft, Check, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { isValidPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Phone sign-in, both steps.
 *
 * Login and register are the same component because they are the same act: you
 * type your number and prove it is yours. Whether that ends in a new account or
 * an old one is the server's business, not something the user should have to
 * choose correctly before they start. The only difference is that the register
 * route also asks for a name up front.
 *
 * Validation runs on every change once a field has been touched, so the button
 * being disabled always has a visible reason next to it — a disabled button
 * with no explanation is the most common way a form dead-ends.
 */

type Step = "phone" | "code" | "done";

export function AuthForm({
  mode,
  locale,
  messages,
  redirectTo,
  initialPhone,
}: {
  mode: "login" | "register";
  locale: Locale;
  messages: Messages;
  redirectTo: string;
  initialPhone?: string;
}) {
  const t = createTranslator(messages);
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);

  // A countdown that is only ever decremented from one place.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const phoneValid = isValidPhone(phone);
  const nameValid = mode === "login" || name.trim().length >= 2;
  const codeValid = /^\d{6}$/.test(code);

  const phoneError = touched.phone && phone && !phoneValid ? t("auth.error.invalidPhone") : null;
  const nameError = touched.name && !nameValid ? t("auth.error.nameRequired") : null;

  /** Maps a server reason onto copy, falling back rather than showing a code. */
  function explain(reason: unknown, retryAfter?: number): string {
    if (reason === "tooSoon" && retryAfter) {
      return t("auth.error.tooSoon", { seconds: String(retryAfter) });
    }
    const key = `auth.error.${reason}` as Parameters<typeof t>[0];
    const message = t(key);
    return message === key ? t("auth.error.generic") : message;
  }

  async function requestCode(resend = false) {
    if (busy || !phoneValid || !nameValid) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, name: mode === "register" ? name : undefined }),
      });
      const data = await response.json();

      if (!response.ok) {
        // An unknown number on the sign-in screen is not an error, it is a
        // person who has not registered yet. Sending them to the right screen
        // with the number already filled in beats telling them a name is
        // required on a screen with no name field.
        if (data?.error === "nameRequired" && mode === "login") {
          router.push(`/${locale}/register?phone=${encodeURIComponent(phone)}`);
          return;
        }
        setError(explain(data?.error, data?.retryAfterSeconds));
        if (data?.retryAfterSeconds) setCooldown(data.retryAfterSeconds);
        return;
      }

      setMasked(data.masked);
      setDevCode(data.devCode ?? null);
      setCooldown(60);
      if (!resend) setStep("code");
      setCode("");
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (busy || !codeValid) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(explain(data?.error));
        // A dead code cannot be retried, so send them back for a fresh one
        // rather than leaving them typing into something that will never work.
        if (data?.error === "expired" || data?.error === "tooManyAttempts") {
          setStep("phone");
          setCode("");
        }
        return;
      }

      setStep("done");
      // Server Components hold the identity, so the whole tree has to re-render
      // before the destination will know who arrived.
      router.refresh();
      setTimeout(() => router.replace(redirectTo), 900);
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  /* ---- success ---------------------------------------------------------- */
  if (step === "done") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="bg-rental text-rental-foreground grid size-16 place-items-center rounded-full">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="font-display mt-4 text-xl font-extrabold">{t("auth.welcome")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("auth.redirecting")}</p>
      </div>
    );
  }

  /* ---- code ------------------------------------------------------------- */
  if (step === "code") {
    return (
      <>
        <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-6 py-8">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="text-muted-foreground flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="size-4" />
              {t("auth.changeNumber")}
            </button>

            <div>
              <h1 className="font-display text-2xl font-extrabold">{t("auth.codeTitle")}</h1>
              <p className="text-muted-foreground tabular mt-1.5 text-sm">
                {t("auth.codeSentTo", { phone: masked })}
              </p>
            </div>

            {devCode && (
              <p className="bg-warning-soft text-warning flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs leading-relaxed">
                <ShieldCheck className="mt-px size-4 shrink-0" strokeWidth={2.2} />
                <span>
                  {t("auth.demoNotice")} <strong className="tabular">{devCode}</strong>
                </span>
              </p>
            )}

            <div>
              <input
                ref={codeRef}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-label={t("auth.code")}
                className="bg-card border-border focus:border-primary tabular h-14 w-full rounded-xl border text-center text-2xl font-bold tracking-[0.4em] outline-none transition-colors"
              />
              {error && (
                <p role="alert" className="text-destructive mt-2 text-xs">
                  {error}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => requestCode(true)}
              className="text-muted-foreground disabled:text-subtle-foreground text-sm underline-offset-4 hover:underline disabled:no-underline"
            >
              {cooldown > 0
                ? t("auth.resendIn", { seconds: String(cooldown) })
                : t("auth.resend")}
            </button>
          </div>
        </main>

        <div className="border-border bg-card safe-bottom shrink-0 border-t px-6 pt-3 pb-3">
          <Button
            size="lg"
            block
            className="font-display uppercase"
            disabled={!codeValid || busy}
            onClick={submitCode}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {busy ? t("common.loading") : t("auth.verify")}
          </Button>
        </div>
      </>
    );
  }

  /* ---- phone ------------------------------------------------------------ */
  return (
    <>
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-6 py-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              {mode === "register" ? t("auth.registerTitle") : t("auth.loginTitle")}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
              {mode === "register" ? t("auth.registerBody") : t("auth.loginBody")}
            </p>
          </div>

          {mode === "register" && (
            <Field label={t("auth.name")} error={nameError}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, name: true }))}
                autoComplete="name"
                placeholder={t("auth.namePlaceholder")}
                className={cn(
                  "bg-card border-border focus:border-primary h-12 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors",
                  nameError && "border-destructive",
                )}
              />
            </Field>
          )}

          <Field label={t("auth.phone")} error={phoneError}>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+994 50 123 45 67"
              className={cn(
                "bg-card border-border focus:border-primary tabular h-12 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors",
                phoneError && "border-destructive",
              )}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs leading-relaxed"
            >
              {error}
            </p>
          )}

          <p className="text-subtle-foreground text-[0.6875rem] leading-relaxed">
            {t("auth.terms")}
          </p>

          <p className="text-muted-foreground text-sm">
            {mode === "register" ? (
              <>
                {t("auth.haveAccount")}{" "}
                <Link href={`/${locale}/login`} className="text-foreground font-semibold underline-offset-4 hover:underline">
                  {t("auth.login")}
                </Link>
              </>
            ) : (
              <>
                {t("auth.noAccount")}{" "}
                <Link href={`/${locale}/register`} className="text-foreground font-semibold underline-offset-4 hover:underline">
                  {t("auth.register")}
                </Link>
              </>
            )}
          </p>
        </div>
      </main>

      <div className="border-border bg-card safe-bottom shrink-0 border-t px-6 pt-3 pb-3">
        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!phoneValid || !nameValid || busy || cooldown > 0}
          onClick={() => requestCode()}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy
            ? t("common.loading")
            : cooldown > 0
              ? t("auth.resendIn", { seconds: String(cooldown) })
              : t("auth.sendCode")}
        </Button>
      </div>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {error && (
        <span role="alert" className="text-destructive mt-1.5 block text-xs">
          {error}
        </span>
      )}
    </label>
  );
}
