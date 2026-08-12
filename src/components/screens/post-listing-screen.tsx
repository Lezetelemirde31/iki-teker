"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PhotoPicker, type PickedPhoto } from "@/components/post/photo-picker";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";
import { localized } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cities, districtsOf } from "@/mocks/geo";
import { categorySchemas, conditionLabels, makesFor, modelsFor } from "@/mocks/taxonomy";
import type { AttributeValues, Condition, VehicleCategorySlug } from "@/types";

/**
 * Posting a vehicle.
 *
 * Ordered the way a seller thinks about the thing they are selling — what it
 * is, then what it costs, then where it is — rather than the order the database
 * wants. Make and model are dependent selects, so choosing Honda and then
 * switching to Vespa cannot leave a Honda model attached.
 *
 * The server validates all of this again. This is here so the seller is told
 * before they submit, not after.
 */
export function PostListingScreen({
  category,
  locale,
  messages,
  accountPhone,
}: {
  category: VehicleCategorySlug;
  locale: Locale;
  messages: Messages;
  /** The number on the account, when there is one. */
  accountPhone?: string;
}) {
  const router = useRouter();
  const t = createTranslator(messages);

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState<Condition>("used");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [customsCleared, setCustomsCleared] = useState(true);
  const [attributes, setAttributes] = useState<AttributeValues>({});

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const makes = useMemo(() => makesFor(category), [category]);
  const models = useMemo(() => (makeId ? modelsFor(makeId, category) : []), [makeId, category]);
  const districts = useMemo(() => (cityId ? districtsOf(cityId) : []), [cityId]);
  const schema = categorySchemas[category];

  const model = models.find((m) => m.id === modelId);
  const yearRange = model?.years;

  const required = schema.filter((definition) => definition.required);
  const complete =
    makeId &&
    modelId &&
    year &&
    price &&
    cityId &&
    districtId &&
    required.every((definition) => {
      const value = attributes[definition.key];
      return value !== undefined && value !== "";
    });

  async function submit() {
    if (!complete || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          photoKeys: photos.filter((photo) => photo.key).map((photo) => photo.key),
          makeId,
          modelId,
          year: Number(year),
          price: Number(price),
          negotiable,
          condition,
          cityId,
          districtId,
          description,
          contactPhone,
          delivery,
          customsCleared,
          attributes,
          locale,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const key = `post.error.${data?.error}` as Parameters<typeof t>[0];
        const message = t(key);
        setError(message === key ? t("post.error.generic") : message);
        setSending(false);
        return;
      }

      // On the demo deployment there is no database, so the listing exists only
      // in this response. Showing it here beats navigating to a page that would
      // 404, and beats claiming it was saved when it was not.
      if (data.persisted === false) {
        setCreated(data.listing.title);
        setSending(false);
        return;
      }

      router.push(`/${locale}/listing/${data.listing.id}`);
    } catch {
      setError(t("post.error.offline"));
      setSending(false);
    }
  }

  if (created) {
    return (
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="bg-rental text-rental-foreground grid size-16 place-items-center rounded-full">
            <Check className="size-8" strokeWidth={3} />
          </span>
          <h1 className="font-display mt-4 text-xl font-extrabold">{t("post.created")}</h1>
          <p className="mt-1.5 text-sm font-semibold">{created}</p>
          <p className="text-muted-foreground mt-3 max-w-[20rem] text-sm text-pretty">
            {t("post.demoNotStored")}
          </p>
          <Button className="mt-6" onClick={() => router.push(`/${locale}/home`)}>
            {t("confirmation.backHome")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-4 py-4">
          {/* First, because it is the first thing a seller has in hand and half
              of what the listing is worth. */}
          <PhotoPicker photos={photos} onChange={setPhotos} />

          <Field label={t("post.make")}>
            <Select
              value={makeId}
              placeholder={t("post.choose")}
              onChange={(value) => {
                setMakeId(value);
                setModelId("");
              }}
              options={makes.map((make) => ({ value: make.id, label: make.name }))}
            />
          </Field>

          <Field label={t("post.model")}>
            <Select
              value={modelId}
              placeholder={makeId ? t("post.choose") : t("post.chooseMakeFirst")}
              disabled={!makeId}
              onChange={setModelId}
              options={models.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Field>

          <Field
            label={t("post.year")}
            hint={yearRange ? `${yearRange[0]}–${yearRange[1]}` : undefined}
          >
            <Input
              type="number"
              inputMode="numeric"
              value={year}
              onChange={setYear}
              placeholder={yearRange ? String(yearRange[1]) : "2020"}
            />
          </Field>

          <Field label={t("post.condition")}>
            <div className="flex gap-2">
              {(["used", "new"] as const).map((value) => (
                <Chip
                  key={value}
                  selected={condition === value}
                  onClick={() => setCondition(value)}
                >
                  {localized(conditionLabels[value], locale)}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Category-specific: engine size, mileage, range, and so on. */}
          {schema.map((definition) => (
            <Field
              key={definition.key}
              label={localized(definition.label, locale)}
              hint={definition.required ? undefined : t("post.optional")}
            >
              {definition.type === "boolean" ? (
                <Toggle
                  checked={Boolean(attributes[definition.key])}
                  onChange={(next) =>
                    setAttributes((current) => ({ ...current, [definition.key]: next }))
                  }
                  label={localized(definition.label, locale)}
                />
              ) : definition.options ? (
                <Select
                  value={String(attributes[definition.key] ?? "")}
                  placeholder={t("post.choose")}
                  onChange={(value) =>
                    setAttributes((current) => ({ ...current, [definition.key]: value }))
                  }
                  options={definition.options.map((option) => ({
                    value: option.value,
                    label: localized(option.label, locale),
                  }))}
                />
              ) : (
                <Input
                  type="number"
                  inputMode="numeric"
                  value={String(attributes[definition.key] ?? "")}
                  onChange={(value) =>
                    setAttributes((current) => ({ ...current, [definition.key]: value }))
                  }
                  placeholder={definition.unit ? localized(definition.unit, locale) : ""}
                />
              )}
            </Field>
          ))}

          <Field label={t("post.price")}>
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={setPrice}
              placeholder="0"
              suffix="₼"
            />
            <Toggle
              className="mt-2"
              checked={negotiable}
              onChange={setNegotiable}
              label={t("listing.negotiable")}
            />
          </Field>

          <Field label={t("post.city")}>
            <Select
              value={cityId}
              placeholder={t("post.choose")}
              onChange={(value) => {
                setCityId(value);
                setDistrictId("");
              }}
              options={cities.map((city) => ({ value: city.id, label: localized(city.name, locale) }))}
            />
          </Field>

          <Field label={t("post.district")}>
            <Select
              value={districtId}
              placeholder={cityId ? t("post.choose") : t("post.chooseCityFirst")}
              disabled={!cityId}
              onChange={setDistrictId}
              options={districts.map((d) => ({ value: d.id, label: localized(d.name, locale) }))}
            />
          </Field>

          <Field label={t("post.description")} hint={t("post.descriptionOptional")}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder={t("post.descriptionPlaceholder")}
              className="bg-card border-border focus:border-primary w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors"
            />
          </Field>

          <Field label={t("post.contactPhone")} hint={t("post.contactPhoneHint")}>
            <input
              type="tel"
              inputMode="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder={accountPhone ?? t("post.contactPhonePlaceholder")}
              className="bg-card border-border focus:border-primary w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors"
            />
            <p className="text-subtle-foreground mt-1.5 text-[0.6875rem] leading-relaxed">
              {accountPhone ? t("post.contactPhoneHelp") : t("post.contactPhoneMissing")}
            </p>
          </Field>

          <div className="space-y-2">
            <Toggle
              checked={customsCleared}
              onChange={setCustomsCleared}
              label={t("listing.customsCleared")}
            />
            <Toggle checked={delivery} onChange={setDelivery} label={t("listing.delivery")} />
          </div>
        </div>
      </main>

      <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-2.5 rounded-lg px-3 py-2 text-xs leading-relaxed"
          >
            {error}
          </p>
        )}
        <Button
          size="lg"
          block
          className="font-display uppercase"
          disabled={!complete || sending}
          onClick={submit}
        >
          {sending ? t("common.loading") : t("post.publish")}
        </Button>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form parts                                                                 */
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
        {hint && <span className="text-subtle-foreground tabular text-[0.6875rem]">{hint}</span>}
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
  inputMode,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text";
  suffix?: string;
}) {
  return (
    <span className="relative block">
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "bg-card border-border focus:border-primary h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors",
          suffix && "pr-9",
        )}
      />
      {suffix && (
        <span className="text-muted-foreground absolute top-1/2 right-3.5 -translate-y-1/2 text-sm">
          {suffix}
        </span>
      )}
    </span>
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
        "bg-card border-border focus:border-primary h-11 w-full rounded-xl border px-3 text-sm outline-none transition-colors",
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

function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("flex cursor-pointer items-center gap-2.5", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary size-4 shrink-0"
      />
      <span className="text-muted-foreground text-sm">{label}</span>
    </span>
  );
}
