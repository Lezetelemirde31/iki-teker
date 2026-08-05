"use client";

import { ArrowLeft, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { PhoneField } from "@/components/auth/phone-field";
import { isValidPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * Signing in and registering.
 *
 * Password first, SMS second. A password works with no provider contract, no
 * network wait and no roaming charge, so it is the everyday path; the code is
 * kept for the three things that genuinely need proof the phone is yours —
 * verifying a number, resetting a forgotten password, and signing in when the
 * password is gone.
 *
 * Registering does not require a code either. The account is created with the
 * number unverified and the badge appears once it has been proved, which is
 * honest about what is known and lets the product work before an SMS contract
 * exists.
 */

type Step = "form" | "code" | "newPassword" | "done";

export function AuthForm({
  mode,
  locale,
  messages,
  redirectTo,
  initialPhone,
  smsAvailable,
}: {
  mode: "login" | "register";
  locale: Locale;
  messages: Messages;
  redirectTo: string;
  initialPhone?: string;
  /** False when no provider is configured and demo codes are switched off. */
  smsAvailable: boolean;
}) {
  const t = createTranslator(messages);
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  // Nine digits, no country code — the field prints +994 itself.
  const [national, setNational] = useState((initialPhone ?? "").replace(/D/g, "").replace(/^994/, "").slice(-9));
  const phone = national ? `+994${national}` : "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
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

  const phoneValid = isValidPhone(phone);
  const nameValid = mode === "login" || name.trim().length >= 2;
  const passwordValid = password.length >= 8;
  const codeValid = /^\d{6}$/.test(code);

  const phoneError = touched.phone && phone && !phoneValid ? t("auth.error.invalidPhone") : null;
  // Shown once the field has been visited or the form submitted, never while
  // someone is still halfway through typing their first character.
  const nameError = touched.name && !nameValid ? t("auth.error.nameRequired") : null;
  const passwordError =
    touched.password && password && !passwordValid ? t("auth.error.tooShort") : null;

  function explain(reason: unknown, retryAfter?: number): string {
    if (reason === "tooSoon" && retryAfter) {
      return t("auth.error.tooSoon", { seconds: String(retryAfter) });
    }
    const key = `auth.error.${reason}` as Parameters<typeof t>[0];
    const message = t(key);
    return message === key ? t("auth.error.generic") : message;
  }

  function finish() {
    setStep("done");
    // Identity lives in Server Components, so the tree has to rebuild before
    // the destination knows who arrived.
    router.refresh();
    setTimeout(() => router.replace(redirectTo), 900);
  }

  /* ---- password paths --------------------------------------------------- */

  async function submitPassword() {
    if (busy) return;

    // The button stays pressable even when the form is incomplete. A disabled
    // button explains nothing — you press it, nothing happens, and there is no
    // way to find out why. Pressing an enabled one reveals every problem at
    // once, which is the only version where the user learns something.
    if (!phoneValid || !passwordValid || (mode === "register" && !nameValid)) {
      setTouched({ name: true, phone: true, password: true });
      setError(
        !phoneValid
          ? t("auth.error.invalidPhone")
          : mode === "register" && !nameValid
            ? t("auth.error.nameRequired")
            : t("auth.error.tooShort"),
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/password";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { phone, name, password } : { phone, password },
        ),
      });
      const data = await response.json();

      if (!response.ok) {
        // Neither of these is a mistake — the person is on the wrong screen.
        // Carrying the number across means they do not retype it, and pressing
        // the button did something, which is the whole point.
        if (data?.error === "alreadyRegistered") {
          router.push(`/${locale}/login?phone=${encodeURIComponent(phone)}`);
          return;
        }
        if (data?.error === "noAccount") {
          router.push(`/${locale}/register?phone=${encodeURIComponent(phone)}`);
          return;
        }
        setError(explain(data?.error));
        return;
      }

      finish();
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  /* ---- code paths ------------------------------------------------------- */

  async function requestCode(resend = false) {
    if (busy || !phoneValid) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, name: name || "İstifadəçi" }),
      });
      const data = await response.json();

      if (!response.ok) {
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
        if (data?.error === "expired" || data?.error === "tooManyAttempts") {
          setStep("form");
          setCode("");
        }
        return;
      }

      // The code proved the phone, which is exactly the proof a password reset
      // needs — so offer it rather than making them find the setting later.
      setPassword("");
      setStep("newPassword");
    } catch {
      setError(t("auth.error.offline"));
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    if (busy || !passwordValid) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(explain((await response.json())?.error));
        return;
      }
      finish();
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

  /* ---- a new password after proving the phone --------------------------- */
  if (step === "newPassword") {
    return (
      <>
        <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-6 py-8">
            <div>
              <h1 className="font-display text-2xl font-extrabold">{t("auth.newPasswordTitle")}</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">{t("auth.newPasswordBody")}</p>
            </div>

            <PasswordField
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              label={t("auth.newPassword")}
              hint={t("auth.passwordHint")}
              error={passwordError}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            />

            {error && (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
                {error}
              </p>
            )}
          </div>
        </main>

        <div className="border-border bg-card safe-bottom shrink-0 border-t px-6 pt-3 pb-3">
          <Button
            size="lg"
            block
            className="font-display uppercase"
            disabled={!passwordValid || busy}
            onClick={submitNewPassword}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {busy ? t("common.loading") : t("auth.savePassword")}
          </Button>
        </div>
      </>
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
                setStep("form");
                setError(null);
              }}
              className="text-muted-foreground flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="size-4" />
              {t("auth.back")}
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
              {cooldown > 0 ? t("auth.resendIn", { seconds: String(cooldown) }) : t("auth.resend")}
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

  /* ---- phone and password ----------------------------------------------- */

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
            <PhoneField
              value={national}
              onChange={setNational}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
              invalid={Boolean(phoneError)}
              label={t("auth.phone")}
            />
          </Field>

          <PasswordField
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            label={t("auth.password")}
            hint={mode === "register" ? t("auth.passwordHint") : undefined}
            error={passwordError}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
          />

          {error && (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs leading-relaxed"
            >
              {error}
            </p>
          )}

          {/* The way back in when the password is gone. Needs a working SMS
              path, so it is hidden rather than offered and then refused. */}
          {mode === "login" && smsAvailable && (
            <button
              type="button"
              disabled={!phoneValid || busy}
              onClick={() => requestCode()}
              className="text-muted-foreground disabled:text-subtle-foreground text-sm underline-offset-4 hover:underline disabled:no-underline"
            >
              {t("auth.forgotPassword")}
            </button>
          )}

          <p className="text-subtle-foreground text-[0.6875rem] leading-relaxed">
            {t("auth.terms")}
          </p>

          {/* A real target, not a word inside a sentence. Half the people who
              land on sign-in do not have an account yet, so the way to make one
              has to be as pressable as the way in — and it carries the number
              across so nothing is retyped. */}
          <div className="border-border space-y-2 border-t pt-4">
            <p className="text-muted-foreground text-center text-sm">
              {mode === "register" ? t("auth.haveAccount") : t("auth.noAccount")}
            </p>
            <Button variant="outline" size="lg" block asChild>
              <Link
                href={
                  mode === "register"
                    ? `/${locale}/login${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`
                    : `/${locale}/register${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`
                }
              >
                {mode === "register" ? t("auth.login") : t("auth.register")}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <div className="border-border bg-card safe-bottom shrink-0 border-t px-6 pt-3 pb-3">
        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={busy}
          onClick={submitPassword}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy
            ? t("common.loading")
            : mode === "register"
              ? t("auth.createAccount")
              : t("auth.login")}
        </Button>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-subtle-foreground text-[0.6875rem]">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="text-destructive mt-1.5 block text-xs">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * A password field with a reveal toggle.
 *
 * Typing a password blind on a phone keyboard is how people end up locked out
 * of accounts they know the password to.
 */
function PasswordField({
  value,
  onChange,
  show,
  onToggle,
  label,
  hint,
  error,
  autoComplete = "new-password",
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  error?: string | null;
  autoComplete?: string;
  onBlur?: () => void;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <span className="relative block">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={cn(
            "bg-card border-border focus:border-primary h-12 w-full rounded-xl border px-3.5 pr-11 text-sm outline-none transition-colors",
            error && "border-destructive",
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
        >
          {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
        </button>
      </span>
    </Field>
  );
}
