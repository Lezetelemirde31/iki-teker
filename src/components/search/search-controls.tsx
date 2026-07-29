"use client";

import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import { useT } from "@/i18n/provider";
import { formatNumber, formatPrice, localized } from "@/lib/format";
import { countMatches } from "@/lib/queries";
import { activeFilterCount, serialiseSearchQuery } from "@/lib/search-params";
import { categories, cities, makesFor, sortLabels } from "@/mocks";
import { cityById } from "@/mocks/geo";
import {
  categorySchemas,
  conditionLabels,
  makeById,
  modelById,
  modelsFor,
} from "@/mocks/taxonomy";
import { cn } from "@/lib/utils";
import type { SearchQuery, SortOption, VehicleCategorySlug } from "@/types";

const sortOptions: SortOption[] = [
  "newest",
  "priceAsc",
  "priceDesc",
  "yearDesc",
  "mileageAsc",
  "nearest",
];

/**
 * Search bar, active-filter chips, sort and the filter sheet.
 *
 * The applied query lives in the URL; this component only edits a draft and
 * pushes the serialised result. The sheet recounts matches on every keystroke
 * so the primary button always says exactly how many listings you will get —
 * the behaviour the source design calls for.
 */
export function SearchControls({
  query,
  locale,
  engineBucket,
  resultCount,
}: {
  query: SearchQuery;
  locale: Locale;
  engineBucket?: string;
  resultCount: number;
}) {
  const router = useRouter();
  const t = useT();

  const [term, setTerm] = useState(query.q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState<SearchQuery>(query);
  const [draftEngine, setDraftEngine] = useState(engineBucket);

  const appliedCount = activeFilterCount(query);

  function push(next: SearchQuery, nextEngine?: string) {
    const params = serialiseSearchQuery(next, nextEngine);
    router.push(`/${locale}/search${params.size ? `?${params}` : ""}`);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    push({ ...query, q: term || undefined }, engineBucket);
  }

  function openFilters() {
    setDraft(query);
    setDraftEngine(engineBucket);
    setFiltersOpen(true);
  }

  const draftCount = useMemo(() => countMatches(draft), [draft]);

  const vehicleCategories = categories.filter((category) => category.kind === "vehicle");
  const draftMakes = draft.category
    ? makesFor(draft.category as VehicleCategorySlug)
    : [];
  const draftModels =
    draft.makeId && draft.category
      ? modelsFor(draft.makeId, draft.category as VehicleCategorySlug)
      : [];
  const engineBuckets =
    draft.category && draft.category in categorySchemas
      ? (categorySchemas[draft.category as keyof typeof categorySchemas].find(
          (attribute) => attribute.key === "engineCc",
        )?.buckets ?? [])
      : [];

  const update = (patch: Partial<SearchQuery>) => setDraft((current) => ({ ...current, ...patch }));

  /**
   * Applied values shown as removable chips — "Baku", "≤ ₼15,000", "2015+" —
   * so what is filtering the list is visible and can be undone without
   * reopening the sheet.
   */
  const appliedChips: { key: string; label: string; onClear: () => void }[] = [];

  if (query.cityId) {
    appliedChips.push({
      key: "city",
      label: localized(cityById.get(query.cityId)?.name, locale),
      onClear: () => push({ ...query, cityId: undefined }, engineBucket),
    });
  }
  if (query.makeId) {
    appliedChips.push({
      key: "make",
      label: makeById.get(query.makeId)?.name ?? "",
      onClear: () => push({ ...query, makeId: undefined, modelId: undefined }, engineBucket),
    });
  }
  if (query.modelId) {
    appliedChips.push({
      key: "model",
      label: modelById.get(query.modelId)?.name ?? "",
      onClear: () => push({ ...query, modelId: undefined }, engineBucket),
    });
  }
  if (query.priceMax !== undefined) {
    appliedChips.push({
      key: "priceMax",
      label: `≤ ${formatPrice(query.priceMax, locale)}`,
      onClear: () => push({ ...query, priceMax: undefined }, engineBucket),
    });
  }
  if (query.priceMin !== undefined) {
    appliedChips.push({
      key: "priceMin",
      label: `≥ ${formatPrice(query.priceMin, locale)}`,
      onClear: () => push({ ...query, priceMin: undefined }, engineBucket),
    });
  }
  if (query.yearMin !== undefined) {
    appliedChips.push({
      key: "yearMin",
      label: `${query.yearMin}+`,
      onClear: () => push({ ...query, yearMin: undefined }, engineBucket),
    });
  }
  if (query.condition) {
    appliedChips.push({
      key: "condition",
      label: localized(conditionLabels[query.condition as "new" | "used"], locale),
      onClear: () => push({ ...query, condition: undefined }, engineBucket),
    });
  }
  if (engineBucket) {
    // Label comes from the applied category's schema, not the sheet's draft —
    // the two diverge while the sheet is open.
    const applied =
      query.category && query.category in categorySchemas
        ? (categorySchemas[query.category as keyof typeof categorySchemas].find(
            (attribute) => attribute.key === "engineCc",
          )?.buckets ?? [])
        : [];
    const bucket = applied.find((entry) => entry.value === engineBucket);
    appliedChips.push({
      key: "engine",
      label: `${bucket ? localized(bucket.label, locale) : engineBucket} cm³`,
      onClear: () => push({ ...query, attributes: undefined }, undefined),
    });
  }

  return (
    <>
      <div className="glass border-border z-30 shrink-0 border-b">
        {/* Browsing a category names it, the way a pushed screen would. */}
        {query.category && (
          <h1 className="font-display px-4 pt-2.5 text-base font-extrabold">
            {t(`categories.${query.category}` as Parameters<typeof t>[0])}
          </h1>
        )}

        <form onSubmit={submitSearch} className="px-4 pt-2 pb-2.5">
          <div className="bg-card border-border flex h-11 items-center gap-2.5 rounded-xl border px-3.5">
            <Search className="text-subtle-foreground size-4.5 shrink-0" strokeWidth={2} />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("search.placeholder")}
              enterKeyHint="search"
              aria-label={t("search.placeholder")}
              className="placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {term && (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  push({ ...query, q: undefined }, engineBucket);
                }}
                aria-label={t("common.close")}
                className="text-subtle-foreground hover:text-foreground shrink-0"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </form>

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-2.5">
          <button
            type="button"
            onClick={openFilters}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors active:scale-[0.97]",
              appliedCount > 0
                ? "bg-secondary text-secondary-foreground"
                : "bg-card border-border text-foreground border",
            )}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={2.4} />
            {t("search.filters")}
            {appliedCount > 0 && (
              <span className="bg-primary text-primary-foreground ml-0.5 grid size-4 place-items-center rounded-full text-[0.5625rem] font-bold">
                {appliedCount}
              </span>
            )}
          </button>

          {appliedChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="bg-secondary text-secondary-foreground flex h-9 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-3.5 text-xs font-semibold whitespace-nowrap transition-transform active:scale-[0.97]"
            >
              {chip.label}
              <X className="size-3.5 opacity-70" strokeWidth={2.8} />
            </button>
          ))}

          <Chip
            selected={query.hasRental}
            onClick={() =>
              push({ ...query, hasRental: query.hasRental ? undefined : true }, engineBucket)
            }
          >
            {t("search.hasRental")}
          </Chip>
          <Chip
            selected={query.vipOnly}
            onClick={() =>
              push({ ...query, vipOnly: query.vipOnly ? undefined : true }, engineBucket)
            }
          >
            {t("search.vipOnly")}
          </Chip>
          <Chip
            selected={query.customsCleared}
            onClick={() =>
              push(
                { ...query, customsCleared: query.customsCleared ? undefined : true },
                engineBucket,
              )
            }
          >
            {t("search.customsCleared")}
          </Chip>
          <Chip
            selected={query.delivery}
            onClick={() =>
              push({ ...query, delivery: query.delivery ? undefined : true }, engineBucket)
            }
          >
            {t("search.withDelivery")}
          </Chip>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-2.5">
          <p className="text-muted-foreground text-xs font-semibold" aria-live="polite">
            {t("search.results", { count: formatNumber(resultCount, locale) })}
          </p>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold transition-colors"
          >
            <ArrowUpDown className="size-3.5" strokeWidth={2.2} />
            {localized(sortLabels[query.sort ?? "newest"], locale)}
          </button>
        </div>
      </div>

      {/* ---------------------------- Sort sheet ---------------------------- */}
      <Sheet open={sortOpen} onOpenChange={setSortOpen} title={t("search.sort")}>
        <div className="space-y-1 pb-2">
          {sortOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSortOpen(false);
                push({ ...query, sort: option }, engineBucket);
              }}
              className={cn(
                "w-full rounded-xl px-3.5 py-3 text-left text-sm transition-colors",
                (query.sort ?? "newest") === option ? "bg-muted font-semibold" : "hover:bg-muted",
              )}
            >
              {localized(sortLabels[option], locale)}
            </button>
          ))}
        </div>
      </Sheet>

      {/* --------------------------- Filter sheet --------------------------- */}
      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t("search.filters")}
        action={
          <button
            type="button"
            onClick={() => {
              setDraft({ sort: draft.sort });
              setDraftEngine(undefined);
            }}
            className="text-primary px-2 text-sm font-semibold"
          >
            {t("common.reset")}
          </button>
        }
        footer={
          <Button
            size="lg"
            block
            className="font-display uppercase"
            onClick={() => {
              setFiltersOpen(false);
              push(draft, draftEngine);
            }}
          >
            {t("search.show", { count: formatNumber(draftCount, locale) })}
          </Button>
        }
      >
        <div className="space-y-5 pb-2">
          <Group label={t("search.category")}>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <Chip
                selected={!draft.category}
                onClick={() => update({ category: undefined, makeId: undefined })}
              >
                {t("common.any")}
              </Chip>
              {vehicleCategories.map((category) => (
                <Chip
                  key={category.slug}
                  selected={draft.category === category.slug}
                  onClick={() => {
                    update({ category: category.slug, makeId: undefined });
                    setDraftEngine(undefined);
                  }}
                >
                  {t(category.labelKey as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </div>
          </Group>

          {draftMakes.length > 0 && (
            <Group label={t("search.make")}>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <Chip selected={!draft.makeId} onClick={() => update({ makeId: undefined })}>
                  {t("common.any")}
                </Chip>
                {draftMakes.map((make) => (
                  <Chip
                    key={make.id}
                    selected={draft.makeId === make.id}
                    onClick={() =>
                      update({
                        makeId: make.id,
                        // A model from the previous make can't apply to this one.
                        modelId: undefined,
                      })
                    }
                  >
                    {make.name}
                  </Chip>
                ))}
              </div>
            </Group>
          )}

          {draftModels.length > 0 && (
            <Group label={t("search.model")}>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <Chip selected={!draft.modelId} onClick={() => update({ modelId: undefined })}>
                  {t("common.any")}
                </Chip>
                {draftModels.map((model) => (
                  <Chip
                    key={model.id}
                    selected={draft.modelId === model.id}
                    onClick={() => update({ modelId: model.id })}
                  >
                    {model.name}
                  </Chip>
                ))}
              </div>
            </Group>
          )}

          <Group label={`${t("search.price")}, ₼`}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("common.min")}
                value={draft.priceMin}
                placeholder="0"
                onChange={(value) => update({ priceMin: value })}
              />
              <NumberField
                label={t("common.max")}
                value={draft.priceMax}
                placeholder={formatPrice(50_000, locale)}
                onChange={(value) => update({ priceMax: value })}
              />
            </div>
          </Group>

          <Group label={t("search.year")}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("common.from")}
                value={draft.yearMin}
                placeholder="2010"
                onChange={(value) => update({ yearMin: value })}
              />
              <NumberField
                label={t("common.max")}
                value={draft.yearMax}
                placeholder="2026"
                onChange={(value) => update({ yearMax: value })}
              />
            </div>
          </Group>

          {engineBuckets.length > 0 && (
            <Group label="cm³">
              <div className="flex flex-wrap gap-2">
                {engineBuckets.map((bucket) => (
                  <Chip
                    key={bucket.value}
                    selected={draftEngine === bucket.value}
                    onClick={() => {
                      const next = draftEngine === bucket.value ? undefined : bucket.value;
                      setDraftEngine(next);
                      update({
                        attributes: next && bucket.min ? { engineCc: bucket.min } : undefined,
                      });
                    }}
                  >
                    {localized(bucket.label, locale)}
                  </Chip>
                ))}
              </div>
            </Group>
          )}

          <Group label={t("search.condition")}>
            <div className="flex gap-2">
              <Chip selected={!draft.condition} onClick={() => update({ condition: undefined })}>
                {t("common.any")}
              </Chip>
              {(["new", "used"] as const).map((condition) => (
                <Chip
                  key={condition}
                  selected={draft.condition === condition}
                  onClick={() => update({ condition })}
                >
                  {localized(conditionLabels[condition], locale)}
                </Chip>
              ))}
            </div>
          </Group>

          <Group label={t("search.city")}>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <Chip selected={!draft.cityId} onClick={() => update({ cityId: undefined })}>
                {t("common.any")}
              </Chip>
              {cities.map((city) => (
                <Chip
                  key={city.id}
                  selected={draft.cityId === city.id}
                  onClick={() => update({ cityId: city.id })}
                >
                  {localized(city.name, locale)}
                </Chip>
              ))}
            </div>
          </Group>

          <Group label={t("search.additional")}>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={draft.hasRental}
                onClick={() => update({ hasRental: draft.hasRental ? undefined : true })}
              >
                {t("search.hasRental")}
              </Chip>
              <Chip
                selected={draft.customsCleared}
                onClick={() =>
                  update({ customsCleared: draft.customsCleared ? undefined : true })
                }
              >
                {t("search.customsCleared")}
              </Chip>
              <Chip
                selected={draft.delivery}
                onClick={() => update({ delivery: draft.delivery ? undefined : true })}
              >
                {t("search.withDelivery")}
              </Chip>
              <Chip
                selected={draft.vipOnly}
                onClick={() => update({ vipOnly: draft.vipOnly ? undefined : true })}
              >
                {t("search.vipOnly")}
              </Chip>
            </div>
          </Group>
        </div>
      </Sheet>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
        {label}
      </h3>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="bg-surface-2 border-border block rounded-xl border px-3 py-2">
      <span className="text-subtle-foreground block text-[0.625rem] font-semibold tracking-wide uppercase">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
        className="tabular placeholder:text-subtle-foreground w-full bg-transparent text-sm font-semibold outline-none"
      />
    </label>
  );
}
