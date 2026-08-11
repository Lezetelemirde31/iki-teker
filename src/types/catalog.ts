import type { ID, ISODate, ISODateTime, LocalizedText, Photo } from "./common";
import type { CatalogCategorySlug, VehicleCategorySlug } from "./taxonomy";

export type Condition = "new" | "used";

export type ListingStatus = "active" | "moderation" | "draft" | "sold" | "archived";

export type Promotion = {
  vip: boolean;
  /** Expiry shown to the seller in their dashboard ("VIP until July 31"). */
  vipUntil?: ISODate;
  /** Bump packs are sold in fives; this is how many are left. */
  bumpsLeft?: number;
  lastBumpedAt?: ISODateTime;
};

export type ListingStats = {
  views: number;
  /** Phone-number reveals — the metric the seller is actually paying for. */
  contacts: number;
  favorites: number;
};

/** Attribute values keyed by `AttributeDef.key`. */
export type AttributeValues = Record<string, string | number | boolean>;

type CatalogItemBase = {
  id: ID;
  slug: string;
  title: string;
  price: number;
  negotiable: boolean;
  condition: Condition;
  description: LocalizedText;
  photos: Photo[];
  attributes: AttributeValues;
  sellerId: ID;
  /** Shown instead of the owning account, when staff published for somebody else. */
  contactName?: string;
  contactPhone?: string;
  cityId: ID;
  districtId: ID;
  delivery: boolean;
  status: ListingStatus;
  promotion: Promotion;
  stats: ListingStats;
  publishedAt: ISODateTime;
};

/** A vehicle listing: motorcycle, scooter, electric vehicle or bicycle. */
export type Listing = CatalogItemBase & {
  kind: "vehicle";
  category: VehicleCategorySlug;
  makeId: ID;
  modelId: ID;
  makeName: string;
  modelName: string;
  year: number;
  /** Import duty status — a decisive filter for buyers in Azerbaijan. */
  customsCleared: boolean;
  /** Set when the owner also offers this vehicle for rent. */
  rentalOfferId?: ID;
};

export type PartType =
  | "engine"
  | "brakes"
  | "tires"
  | "transmission"
  | "filters"
  | "electrical"
  | "body"
  | "battery"
  | "suspension";

export type GearType = "helmet" | "jacket" | "gloves" | "boots" | "protection" | "luggage";

export type Compatibility = {
  makeId: ID;
  makeName: string;
  /** Empty means the part fits every model of that make in the year window. */
  modelIds: ID[];
  modelNames: string[];
  yearFrom?: number;
  yearTo?: number;
};

/** A spare part or piece of riding gear. */
export type Part = CatalogItemBase & {
  kind: "part";
  category: Extract<CatalogCategorySlug, "parts" | "gear">;
  partType: PartType | GearType;
  brand: string;
  partNumber?: string;
  stock: number;
  /** Only spare parts carry fitment data; gear uses size attributes instead. */
  compatibility: Compatibility[];
  localizedTitle: LocalizedText;
};

export type CatalogItem = Listing | Part;

export function isListing(item: CatalogItem): item is Listing {
  return item.kind === "vehicle";
}

export function isPart(item: CatalogItem): item is Part {
  return item.kind === "part";
}
