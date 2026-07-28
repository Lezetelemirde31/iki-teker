import type { ID, LocalizedText } from "./common";

/** Every top-level section on the home grid. */
export type CategorySlug =
  | "motorcycles"
  | "scooters"
  | "electric"
  | "bicycles"
  | "parts"
  | "gear"
  | "services"
  | "rental";

/** Sections that hold an actual vehicle with a make, model and year. */
export type VehicleCategorySlug = "motorcycles" | "scooters" | "electric" | "bicycles";

/** Sections backed by the listing catalog (vehicles plus goods). */
export type CatalogCategorySlug = VehicleCategorySlug | "parts" | "gear";

export type Category = {
  slug: CategorySlug;
  /** i18n key under `categories.*`. */
  labelKey: string;
  /** Lucide icon name, resolved by the icon registry in module 3. */
  icon: string;
  kind: "vehicle" | "goods" | "service" | "rental";
  /** Sections that are entry points rather than catalogs of their own. */
  isEntryPoint: boolean;
};

export type Make = {
  id: ID;
  name: string;
  slug: string;
  categories: VehicleCategorySlug[];
  country: string;
  popular: boolean;
};

export type Model = {
  id: ID;
  makeId: ID;
  name: string;
  category: VehicleCategorySlug;
  /** Production window, used to bound the year picker in listing creation. */
  years: [number, number];
  bodyType?: string;
};

export type District = {
  id: ID;
  cityId: ID;
  name: LocalizedText;
};

export type City = {
  id: ID;
  name: LocalizedText;
  /** Drives the "Nearby" sort and distance labels in mock data. */
  coords: { lat: number; lng: number };
  primary: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Category attribute schemas                                                 */
/* -------------------------------------------------------------------------- */

export type AttributeType = "number" | "select" | "boolean";

export type AttributeOption = {
  value: string;
  label: LocalizedText;
};

/**
 * A single field on a category. One definition feeds three surfaces: the search
 * filter sheet, the create-listing form, and the spec table on the listing page.
 * This is what the source specification means by "filters built for vehicles,
 * not generic ones".
 */
export type AttributeDef = {
  key: string;
  label: LocalizedText;
  type: AttributeType;
  unit?: LocalizedText;
  options?: AttributeOption[];
  min?: number;
  max?: number;
  step?: number;
  /** Appears in the filter sheet. */
  filterable: boolean;
  /** Required to publish a listing. */
  required: boolean;
  /** Appears in the two-column spec table on the listing detail screen. */
  inSpecTable: boolean;
  /** Rendered as a chip under the title in search results. */
  inResultChips?: boolean;
  /** Preset ranges offered as quick-pick chips (e.g. engine displacement). */
  buckets?: { value: string; label: LocalizedText; min?: number; max?: number }[];
};

export type CategorySchema = Record<CatalogCategorySlug, AttributeDef[]>;

export type SortOption =
  | "newest"
  | "priceAsc"
  | "priceDesc"
  | "mileageAsc"
  | "yearDesc"
  | "nearest";
