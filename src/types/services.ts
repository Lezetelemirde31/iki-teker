import type { ID, ISODate, LocalizedText, Photo } from "./common";
import type { CategorySlug } from "./taxonomy";

export type ServiceItem = {
  id: ID;
  workshopId: ID;
  name: LocalizedText;
  /** Indicative "from" price — the workshop confirms after inspection. */
  priceFrom: number;
  durationMinutes: number;
  category: CategorySlug;
};

export type Workshop = {
  id: ID;
  slug: string;
  name: string;
  ownerId: ID;
  rating: number;
  reviewsCount: number;
  /** Straight-line distance from the selected city centre, in km. */
  distanceKm: number;
  specialties: CategorySlug[];
  summary: LocalizedText;
  about: LocalizedText;
  cityId: ID;
  districtId: ID;
  address: LocalizedText;
  phone: string;
  hours: { open: string; close: string; days: LocalizedText };
  /** Sends a mechanic to the customer instead of the other way round. */
  mobileService: boolean;
  verified: boolean;
  /** Paid priority placement in the directory — a phase-two revenue line. */
  promoted: boolean;
  photos: Photo[];
  services: ServiceItem[];
};

export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export type Appointment = {
  id: ID;
  workshopId: ID;
  serviceId: ID;
  customerId: ID;
  /** Free-text vehicle label, or a reference to one of the user's listings. */
  vehicleLabel: string;
  listingId?: ID;
  date: ISODate;
  time: string;
  status: AppointmentStatus;
  priceEstimate: number;
  note?: LocalizedText;
};
