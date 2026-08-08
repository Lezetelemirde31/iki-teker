"use client";

import { Check, Loader2, Lock, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { localized } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { cities, districtsOf } from "@/mocks/geo";
import type { User } from "@/types";

/**
 * Editing your account.
 *
 * Two independent forms on one screen, saved separately, because they fail for
 * unrelated reasons: a rejected password should not discard a corrected city,
 * and a name that is too long should not silently leave the password unchanged.
 *
 * The phone is shown and not editable. It is what sign-in checks, so moving an
 * account to a new number needs proof from both numbers — a different operation
 * that does not belong next to a display name.
 */
export function ProfileEditScreen({
  user,
  locale,
  messages,
}: {
  user: User;
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [cityId, setCityId] = useState(user.cityId ?? "");
  const [districtId, setDistrictId] = useState(user.districtId ?? "");
  const [bio, setBio] = useState(localized(user.bio, locale));

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const districts = useMemo(() => (cityId ? districtsOf(cityId) : []), [cityId]);

  function explain(reason: unknown): string {
    const key = `profile.error.${reason}` as Parameters<typeof t>[0];
    const message = t(key);
    if (message !== key) return message;
    const authKey = `auth.error.${reason}` as Parameters<typeof t>[0];
    const authMessage = t(authKey);
    return authMessage === authKey ? t("profile.error.generic") : authMessage;
  }

  async function saveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, cityId, districtId: districtId || undefined, bio }),
      });
      if (!response.ok) {
        setProfileError(explain((await response.json())?.error));
        return;
      }
      setProfileSaved(true);
      // The header, the avatar initials and every listing card carry this name,
      // so the whole tree has to be rebuilt rather than this screen alone.
      router.refresh();
    } catch {
      setProfileError(t("profile.error.offline"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (savingPassword || password.length < 8) return;
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSaved(false);

    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setPasswordError(explain((await response.json())?.error));
        return;
      }
      setPasswordSaved(true);
      setPassword("");
    } catch {
      setPasswordError(t("profile.error.offline"));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
      <div className="space-y-6 px-4 py-4">
        {/* Identity, stated rather than offered for editing — whichever of the
            two they signed up with. */}
        <div className="bg-muted flex items-center gap-3 rounded-xl px-3.5 py-3">
          {user.phone ? (
            <Phone className="text-muted-foreground size-4.5 shrink-0" strokeWidth={2} />
          ) : (
            <Mail className="text-muted-foreground size-4.5 shrink-0" strokeWidth={2} />
          )}
          <div className="min-w-0 flex-1">
            <p className="tabular truncate text-sm font-semibold">
              {user.phone ? formatPhone(user.phone) : (user.email ?? "—")}
            </p>
            <p className="text-subtle-foreground mt-0.5 text-[0.6875rem] leading-relaxed">
              {t("profile.phoneFixed")}
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <Field label={t("auth.name")}>
            <Input value={name} onChange={setName} placeholder={t("auth.namePlaceholder")} />
          </Field>

          <Field label={t("post.city")}>
            <Select
              value={cityId}
              placeholder={t("post.choose")}
              onChange={(value) => {
                setCityId(value);
                setDistrictId("");
              }}
              options={cities.map((city) => ({
                value: city.id,
                label: localized(city.name, locale),
              }))}
            />
          </Field>

          <Field label={t("post.district")} hint={t("post.optional")}>
            <Select
              value={districtId}
              placeholder={cityId ? t("post.choose") : t("post.chooseCityFirst")}
              disabled={!cityId}
              onChange={setDistrictId}
              options={districts.map((d) => ({
                value: d.id,
                label: localized(d.name, locale),
              }))}
            />
          </Field>

          <Field label={t("profile.bio")} hint={t("post.optional")}>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              placeholder={t("profile.bioPlaceholder")}
              className="bg-card border-border focus:border-primary w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors"
            />
          </Field>

          {profileError && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
              {profileError}
            </p>
          )}
          {profileSaved && (
            <p className="bg-rental-soft text-rental flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <Check className="size-4" strokeWidth={2.6} />
              {t("profile.saved")}
            </p>
          )}

          <Button
            size="lg"
            block
            className="font-display uppercase"
            disabled={savingProfile}
            onClick={saveProfile}
          >
            {savingProfile ? <Loader2 className="animate-spin" /> : null}
            {savingProfile ? t("common.loading") : t("profile.save")}
          </Button>
        </section>

        {/* Its own form, saved on its own. */}
        <section className="border-border space-y-3 border-t pt-6">
          <h2 className="text-subtle-foreground flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            <Lock className="size-3.5" strokeWidth={2.4} />
            {t("profile.changePassword")}
          </h2>

          <Input
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <p className="text-subtle-foreground text-[0.6875rem]">{t("auth.passwordHint")}</p>

          {passwordError && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
              {passwordError}
            </p>
          )}
          {passwordSaved && (
            <p className="bg-rental-soft text-rental flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <Check className="size-4" strokeWidth={2.6} />
              {t("profile.passwordSaved")}
            </p>
          )}

          <Button
            variant="outline"
            size="lg"
            block
            disabled={password.length < 8 || savingPassword}
            onClick={savePassword}
          >
            {savingPassword ? <Loader2 className="animate-spin" /> : null}
            {savingPassword ? t("common.loading") : t("profile.savePassword")}
          </Button>
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
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
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      className="bg-card border-border focus:border-primary h-12 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "bg-card border-border focus:border-primary h-12 w-full rounded-xl border px-3 text-sm outline-none transition-colors",
        !value && "text-muted-foreground",
        disabled && "opacity-50",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="text-foreground">
          {option.label}
        </option>
      ))}
    </select>
  );
}
