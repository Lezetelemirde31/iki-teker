import type { SearchQuery, SortOption } from "@/types";

const sorts: SortOption[] = ["newest", "priceAsc", "priceDesc", "mileageAsc", "yearDesc", "nearest"];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function num(value: string | string[] | undefined) {
  const raw = first(value);
  if (raw === undefined || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function bool(value: string | string[] | undefined) {
  return first(value) === "true" ? true : undefined;
}

/**
 * Search state lives in the URL, not in a store: every result view is
 * shareable, the back button behaves, and a saved search is just a serialised
 * query.
 */
export function parseSearchQuery(params: RawParams): SearchQuery {
  const sort = first(params.sort);
  const engineBucket = first(params.engine);

  const query: SearchQuery = {
    q: first(params.q) || undefined,
    category: first(params.category) || undefined,
    makeId: first(params.makeId) || undefined,
    modelId: first(params.modelId) || undefined,
    cityId: first(params.cityId) || undefined,
    priceMin: num(params.priceMin),
    priceMax: num(params.priceMax),
    yearMin: num(params.yearMin),
    yearMax: num(params.yearMax),
    hasRental: bool(params.hasRental),
    customsCleared: bool(params.customsCleared),
    delivery: bool(params.delivery),
    vipOnly: bool(params.vipOnly),
    condition: first(params.condition) || undefined,
    sort: sorts.includes(sort as SortOption) ? (sort as SortOption) : "newest",
  };

  // Engine displacement is filtered through preset buckets rather than a free
  // range, matching the quick-pick chips in the source design.
  if (engineBucket) {
    const [min] = engineBucket.split("-");
    const parsed = Number(min);
    if (Number.isFinite(parsed)) query.attributes = { engineCc: parsed };
  }

  return query;
}

export function serialiseSearchQuery(query: SearchQuery, engineBucket?: string) {
  const params = new URLSearchParams();
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === "" || value === false) return;
    params.set(key, String(value));
  };

  set("q", query.q);
  set("category", query.category);
  set("makeId", query.makeId);
  set("modelId", query.modelId);
  set("cityId", query.cityId);
  set("priceMin", query.priceMin);
  set("priceMax", query.priceMax);
  set("yearMin", query.yearMin);
  set("yearMax", query.yearMax);
  set("hasRental", query.hasRental);
  set("customsCleared", query.customsCleared);
  set("delivery", query.delivery);
  set("vipOnly", query.vipOnly);
  set("condition", query.condition);
  set("engine", engineBucket);
  if (query.sort && query.sort !== "newest") set("sort", query.sort);

  return params;
}

/** Count of user-applied filters, for the badge on the Filters button. */
export function activeFilterCount(query: SearchQuery) {
  const keys: (keyof SearchQuery)[] = [
    "category",
    "makeId",
    "modelId",
    "cityId",
    "priceMin",
    "priceMax",
    "yearMin",
    "yearMax",
    "hasRental",
    "customsCleared",
    "delivery",
    "vipOnly",
    "condition",
  ];
  let count = keys.reduce((total, key) => total + (query[key] === undefined ? 0 : 1), 0);
  if (query.attributes && Object.keys(query.attributes).length > 0) count += 1;
  return count;
}
