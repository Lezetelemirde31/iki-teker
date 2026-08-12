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
import { categorySchemas, conditionLabels, makes } from "@/mocks/taxonomy";
import type { AttributeValues, Condition } from "@/types";

/**
 * Posting a spare part or a piece of gear.
 *
 * The vehicle form derives its title from a make, model and year. This one
 * cannot: "Brembo SA brake pads, front" is a fact only the seller knows, so the
 * title is typed and the server checks it rather than building it.
 *
 * Fitment is offered as a set of makes plus one year window rather than a
 * per-make matrix. That is what sellers actually list — a set of pads fits
 * several makes over the same generation — and a matrix is a screen nobody
 * finishes filling in. A part with nothing selected fits everything, which is
 * true of chain lube and phone mounts.
 */
export function PostPartScreen({
  category,
  locale,
  messages,
  accountPhone,
}: {
  category: "parts" | "gear";
  locale: Locale;
  messages: Messages;
  /** The number on the account, when there is one. */
  accountPhone?: string;
}) {
  const router = useRouter();
  const t = createTranslator(messages);

  const [partType, setPartType] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [stock, setStock] = useState("1");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState<Condition>("new");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [delivery, setDelivery] = useState(true);
  const [attributes, setAttributes] = useState<AttributeValues>({});
  const [fitsMakeIds, setFitsMakeIds] = useState<string[]>([]);
  const [fitsYearFrom, setFitsYearFrom] = useState("");
  const [fitsYearTo, setFitsYearTo] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const districts = useMemo(() => (cityId ? districtsOf(cityId) : []), [cityId]);
  const schema = categorySchemas[category];

  const types = category === "parts" ? partTypeKeys : gearTypeKeys;
  const required = schema.filter((definition) => definition.required);

  const complete =
    partType &&
    brand.trim().length >= 2 &&
    title.trim().length >= 6 &&
    price &&
    Number(stock) >= 1 &&
    cityId &&
    districtId &&
    required.every((definition) => {
      const value = attributes[definition.key];
      return value !== undefined && value !== "";
    });

  function toggleMake(id: string) {
    setFitsMakeIds((current) =>
      current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    );
  }

  async function submit() {
    if (!complete || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoKeys: photos.filter((photo) => photo.key).map((photo) => photo.key),
          category,
          partType,
          brand,
          title,
          partNumber: partNumber || undefined,
          stock: Number(stock),
          price: Number(price),
          negotiable,
          condition,
          cityId,
          districtId,
          description,
          contactPhone,
          delivery,
          attributes,
          fitsMakeIds: category === "parts" ? fitsMakeIds : [],
          fitsYearFrom: fitsYearFrom || undefined,
          fitsYearTo: fitsYearTo || undefined,
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
          {/* A part is bought on the picture of the part number and the wear.
              Text alone does not settle either. */}
          <PhotoPicker photos={photos} onChange={setPhotos} />

          <Field label={t("post.partType")}>
            <div className="flex flex-wrap gap-1.5">
              {types.map((key) => (
                <Chip key={key} selected={partType === key} onClick={() => setPartType(key)}>
                  {t(`partTypes.${key}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("post.brand")}>
            <Input value={brand} onChange={setBrand} placeholder="Brembo" />
          </Field>

          <Field label={t("post.partTitle")} hint={`${title.trim().length}/6`}>
            <Input value={title} onChange={setTitle} placeholder={t("post.partTitleExample")} />
          </Field>

          {category === "parts" && (
            <Field label={t("post.partNumber")} hint={t("post.optional")}>
              <Input value={partNumber} onChange={setPartNumber} placeholder="07BB33SA" />
            </Field>
          )}

          <Field label={t("post.condition")}>
            <div className="flex gap-2">
              {(["new", "used"] as const).map((value) => (
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

          {/* Category-specific: OEM and warranty for parts, size and
              certification for gear. */}
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
                <div className="flex flex-wrap gap-1.5">
                  {definition.options.map((option) => (
                    <Chip
                      key={option.value}
                      selected={attributes[definition.key] === option.value}
                      onClick={() =>
                        setAttributes((current) => ({
                          ...current,
                          [definition.key]: option.value,
                        }))
                      }
                    >
                      {localized(option.label, locale)}
                    </Chip>
                  ))}
                </div>
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

          {/* Fitment — parts only. Gear fits a person, not a motorcycle. */}
          {category === "parts" && (
            <Field label={t("post.fits")} hint={t("post.fitsHint")}>
              <div className="flex flex-wrap gap-1.5">
                {makes
                  .filter((make) => make.popular)
                  .map((make) => (
                    <Chip
                      key={make.id}
                      selected={fitsMakeIds.includes(make.id)}
                      onClick={() => toggleMake(make.id)}
                    >
                      {make.name}
                    </Chip>
                  ))}
              </div>
              {fitsMakeIds.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={fitsYearFrom}
                    onChange={setFitsYearFrom}
                    placeholder={t("post.yearFrom")}
                  />
                  <span className="text-subtle-foreground">–</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={fitsYearTo}
                    onChange={setFitsYearTo}
                    placeholder={t("post.yearTo")}
                  />
                </div>
              )}
            </Field>
          )}

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

          <Field label={t("post.stock")}>
            <Input type="number" inputMode="numeric" value={stock} onChange={setStock} />
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

          <Field label={t("post.district")}>
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

          <Toggle checked={delivery} onChange={setDelivery} label={t("listing.delivery")} />
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

const partTypeKeys = [
  "engine",
  "brakes",
  "tires",
  "transmission",
  "filters",
  "electrical",
  "body",
  "battery",
  "suspension",
] as const;

const gearTypeKeys = ["helmet", "jacket", "gloves", "boots", "protection", "luggage"] as const;

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
    <span className="relative block flex-1">
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
