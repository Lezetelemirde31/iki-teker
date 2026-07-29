import type { ID, ISODate, ISODateTime, LocalizedText } from "./common";

export type LicenceCategory = "A" | "A1" | "B" | "none";

export type RateCard = {
  hour?: number;
  day: number;
  week?: number;
  /** Long-stay discount: from `minDays`, the daily rate drops to `dayPrice`. */
  longStay?: { minDays: number; dayPrice: number };
};

export type RentalInclusion =
  | "helmet"
  | "secondHelmet"
  | "insurance"
  | "fuel"
  | "delivery"
  | "lock"
  | "charger"
  | "phoneMount";

/**
 * The rental terms attached to a vehicle. Owners set their own rules — rates,
 * deposit, minimum period, licence requirement and cancellation window — which
 * is what separates this from a fixed-fleet rental service.
 */
export type RentalOffer = {
  id: ID;
  listingId: ID;
  ownerId: ID;
  rates: RateCard;
  deposit: number;
  minDays: number;
  maxDays: number;
  licenceRequired: LicenceCategory;
  /** Hours before pickup during which cancellation is free. */
  freeCancellationHours: number;
  pickup: LocalizedText;
  includes: RentalInclusion[];
  /** Dates already taken or blocked by the owner — the source of truth for the
   *  availability calendar and the "no double booking" guarantee. */
  blockedDates: ISODate[];
  /** First date the vehicle is free, used for the "TODAY" / "FROM AUG 2" badge. */
  availableFrom: ISODate;
  /** Time of day handover and return happen, e.g. "10:00". */
  handoverTime: string;
  instantBook: boolean;
  rating: number;
  rentalsCount: number;
  /** Platform commission rate applied to the subtotal. Configurable, and may be
   *  zero at launch — habit first, revenue second. */
  commissionRate: number;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "returned"
  | "cancelled"
  | "disputed";

export type BookingStepKey = "confirm" | "sign" | "handover" | "return";

export type BookingStep = {
  key: BookingStepKey;
  status: "done" | "current" | "upcoming";
  /** Either a date or an estimate such as "~12 min". */
  meta?: string;
};

export type DocumentStatus = "missing" | "pending" | "verified" | "rejected";

/** Photo and odometer capture at handover and at return — the evidence that
 *  settles a dispute. */
export type Inspection = {
  at: ISODateTime;
  odometer: number;
  fuelPercent?: number;
  photoCount: number;
  note?: LocalizedText;
};

export type Booking = {
  id: ID;
  /** Short human-readable reference shown in chat and the agreement. */
  code: string;
  offerId: ID;
  listingId: ID;
  renterId: ID;
  ownerId: ID;
  start: ISODate;
  end: ISODate;
  days: number;
  dayPrice: number;
  subtotal: number;
  serviceFee: number;
  deposit: number;
  /** Amount due on pickup — subtotal + fee + deposit while payment is cash. */
  total: number;
  /** Platform earnings on this booking. */
  commission: number;
  status: BookingStatus;
  paymentMethod: "cashOnPickup" | "card";
  licenceStatus: DocumentStatus;
  agreementSigned: boolean;
  steps: BookingStep[];
  handover?: Inspection;
  returnCheck?: Inspection;
  createdAt: ISODateTime;
  respondsInMinutes: number;
};
