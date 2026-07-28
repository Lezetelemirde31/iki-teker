import { daysAgo, hoursAgo, minutesAgo } from "@/lib/demo-clock";
import type {
  AdminMetrics,
  ArtTone,
  AuditEntry,
  Complaint,
  Dispute,
  ModerationItem,
  Photo,
  RevenueRecord,
} from "@/types";

import { listings } from "./listings";
import { models, makes } from "./taxonomy";
import { parts } from "./parts";
import { users } from "./users";

function makePhotos(seed: string, count: number, tone: ArtTone, alt: string): Photo[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${seed}-mp${index + 1}`,
    seed: `${seed}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
  }));
}

/**
 * The moderation queue. Every listing is reviewed before it goes live, and the
 * system pre-flags the suspicious ones so a moderator triages by exception
 * rather than reading all fourteen.
 *
 * The first three rows are the ones shown in the source prototype, timings
 * included: 4, 11 and 22 minutes ago.
 */
export const moderationQueue: ModerationItem[] = [
  {
    id: "mod-1",
    entityType: "listing",
    entityId: "l-monster821-tural",
    title: "Ducati Monster 821, 2017",
    price: 9_800,
    sellerId: "u-tural",
    cityId: "city-baku",
    submittedAt: minutesAgo(4),
    flags: [],
    photos: makePhotos("mod-1", 5, "clay", "Ducati Monster 821"),
  },
  {
    id: "mod-2",
    entityType: "part",
    entityId: "p-chain-kit-used",
    title: "Zəncir dəsti 525 VX3, b/u",
    price: 45,
    sellerId: "u-tural",
    cityId: "city-sumqayit",
    submittedAt: minutesAgo(11),
    flags: ["duplicatePhoto"],
    photos: makePhotos("mod-2", 3, "steel", "Chain kit"),
  },
  {
    id: "mod-3",
    entityType: "listing",
    entityId: "l-ninebot-f40-tural",
    title: "Ninebot F40, 2024",
    price: 560,
    sellerId: "u-tural",
    cityId: "city-sumqayit",
    submittedAt: minutesAgo(22),
    flags: [],
    photos: makePhotos("mod-3", 4, "slate", "Ninebot F40"),
  },
  {
    id: "mod-4",
    entityType: "listing",
    entityId: "pending-yamaha-r6",
    title: "Yamaha YZF-R6, 2016",
    price: 15_900,
    sellerId: "u-aysel",
    cityId: "city-baku",
    submittedAt: minutesAgo(38),
    flags: ["contactInDescription", "unverifiedSeller"],
    photos: makePhotos("mod-4", 6, "dusk", "Yamaha YZF-R6"),
  },
  {
    id: "mod-5",
    entityType: "listing",
    entityId: "pending-honda-pcx",
    title: "Honda PCX 125, 2021",
    price: 5_800,
    sellerId: "u-kamran",
    cityId: "city-baku",
    submittedAt: hoursAgo(1),
    flags: ["duplicateListing"],
    photos: makePhotos("mod-5", 5, "sage", "Honda PCX 125"),
  },
  {
    id: "mod-6",
    entityType: "part",
    entityId: "pending-brake-disc",
    title: "Əyləc diski, ön",
    price: 2,
    sellerId: "u-aysel",
    cityId: "city-baku",
    submittedAt: hoursAgo(2),
    flags: ["priceAnomaly", "noPhotos"],
    photos: [],
  },
  {
    id: "mod-7",
    entityType: "listing",
    entityId: "pending-bmw-s1000rr",
    title: "BMW S 1000 RR, 2019",
    price: 34_500,
    sellerId: "u-veli-motors",
    cityId: "city-ganja",
    submittedAt: hoursAgo(3),
    flags: [],
    photos: makePhotos("mod-7", 8, "steel", "BMW S 1000 RR"),
  },
  {
    id: "mod-8",
    entityType: "listing",
    entityId: "pending-vespa-sprint",
    title: "Vespa Sprint 150, 2019",
    price: 6_100,
    sellerId: "u-nermin",
    cityId: "city-baku",
    submittedAt: hoursAgo(4),
    flags: [],
    photos: makePhotos("mod-8", 6, "sand", "Vespa Sprint 150"),
  },
  {
    id: "mod-9",
    entityType: "part",
    entityId: "pending-air-filter",
    title: "K&N hava filtri",
    price: 68,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    submittedAt: hoursAgo(5),
    flags: [],
    photos: makePhotos("mod-9", 2, "olive", "K&N air filter"),
  },
  {
    id: "mod-10",
    entityType: "listing",
    entityId: "pending-xiaomi-m365",
    title: "Xiaomi M365, 2020",
    price: 380,
    sellerId: "u-aysel",
    cityId: "city-baku",
    submittedAt: hoursAgo(6),
    flags: ["duplicatePhoto", "unverifiedSeller"],
    photos: makePhotos("mod-10", 3, "amber", "Xiaomi M365"),
  },
  {
    id: "mod-11",
    entityType: "listing",
    entityId: "pending-giant-talon",
    title: "Giant Talon 3, 2022",
    price: 890,
    sellerId: "u-elvin",
    cityId: "city-baku",
    submittedAt: hoursAgo(8),
    flags: [],
    photos: makePhotos("mod-11", 5, "sage", "Giant Talon 3"),
  },
  {
    id: "mod-12",
    entityType: "listing",
    entityId: "pending-ktm-790",
    title: "KTM 790 Duke, 2020",
    price: 19_200,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    submittedAt: hoursAgo(11),
    flags: [],
    photos: makePhotos("mod-12", 9, "clay", "KTM 790 Duke"),
  },
  {
    id: "mod-13",
    entityType: "part",
    entityId: "pending-shoei-visor",
    title: "Shoei viziru, şəffaf",
    price: 95,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    submittedAt: hoursAgo(14),
    flags: [],
    photos: makePhotos("mod-13", 2, "slate", "Shoei visor"),
  },
  {
    id: "mod-14",
    entityType: "listing",
    entityId: "pending-suzuki-burgman",
    title: "Suzuki Burgman 400, 2018",
    price: 8_900,
    sellerId: "u-veli-motors",
    cityId: "city-ganja",
    submittedAt: hoursAgo(18),
    flags: ["bannedWord"],
    photos: makePhotos("mod-14", 4, "dusk", "Suzuki Burgman 400"),
  },
];

/* -------------------------------------------------------------------------- */
/*  Complaints                                                                 */
/* -------------------------------------------------------------------------- */

export const complaints: Complaint[] = [
  {
    id: "cmp-1",
    entityType: "listing",
    entityId: "l-classic350-aysel",
    entityLabel: "Royal Enfield Classic 350, 2022",
    reason: "sold",
    reporterId: "u-kamran",
    note: {
      az: "Satıcı deyir ki, artıq satılıb, amma elan aktivdir.",
      en: "Seller says it's already sold but the listing is still live.",
      ru: "Продавец говорит, что уже продан, но объявление активно.",
    },
    createdAt: hoursAgo(7),
    status: "open",
  },
  {
    id: "cmp-2",
    entityType: "listing",
    entityId: "l-gsxs750-veli",
    entityLabel: "Suzuki GSX-S750, 2018",
    reason: "wrongCategory",
    reporterId: "u-elvin",
    createdAt: hoursAgo(16),
    status: "open",
  },
  {
    id: "cmp-3",
    entityType: "user",
    entityId: "u-aysel",
    entityLabel: "Aysel R.",
    reason: "spam",
    reporterId: "u-nermin",
    note: {
      az: "Eyni elanı üç dəfə yerləşdirib.",
      en: "Posted the same listing three times.",
      ru: "Разместила одно и то же объявление трижды.",
    },
    createdAt: daysAgo(1),
    status: "open",
  },
];

/* -------------------------------------------------------------------------- */
/*  Disputes                                                                   */
/* -------------------------------------------------------------------------- */

export const disputes: Dispute[] = [
  {
    id: "dsp-1",
    bookingId: "bk-2390",
    openedById: "u-baku-moto-rent",
    againstId: "u-tural",
    reason: "damage",
    summary: {
      az: "Qaytarma zamanı sol yan panel cızılmış vəziyyətdə idi. Depozitdən 180 ₼ tutulması tələb olunur.",
      en: "Left side panel came back scratched. Claiming ₼180 from the deposit.",
      ru: "При возврате поцарапана левая боковая панель. Требуется удержать 180 ₼ из залога.",
    },
    amountClaimed: 180,
    status: "reviewing",
    openedAt: "2026-07-01T11:20:00+04:00",
    evidence: {
      handoverPhotos: 9,
      returnPhotos: 11,
      chatMessages: 24,
      agreementSigned: true,
      odometerDelta: 748,
    },
  },
  {
    id: "dsp-2",
    bookingId: "bk-2455",
    openedById: "u-rashad",
    againstId: "u-elektro-ride",
    reason: "depositWithheld",
    summary: {
      az: "Depozit qaytarılmayıb, səbəb izah edilməyib.",
      en: "Deposit not returned and no reason given.",
      ru: "Залог не вернули, причину не объяснили.",
    },
    amountClaimed: 100,
    status: "open",
    openedAt: hoursAgo(20),
    evidence: {
      handoverPhotos: 4,
      returnPhotos: 4,
      chatMessages: 8,
      agreementSigned: true,
      odometerDelta: 13,
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                  */
/* -------------------------------------------------------------------------- */

export const auditLog: AuditEntry[] = [
  {
    id: "au-1",
    actorId: "u-moderator",
    action: "approveListing",
    entityType: "listing",
    entityLabel: "Harley-Davidson Iron 883, 2018",
    at: daysAgo(1),
  },
  {
    id: "au-2",
    actorId: "u-moderator",
    action: "rejectListing",
    entityType: "listing",
    entityLabel: "Yamaha YZF-R1, 2015",
    at: hoursAgo(21),
    note: {
      az: "Təsvirdə telefon nömrəsi var, qaydalara ziddir.",
      en: "Phone number in the description, against platform rules.",
      ru: "В описании указан номер телефона, что запрещено правилами.",
    },
  },
  {
    id: "au-3",
    actorId: "u-moderator",
    action: "verifySeller",
    entityType: "user",
    entityLabel: "Elektro Ride Baku",
    at: daysAgo(2),
  },
  {
    id: "au-4",
    actorId: "u-moderator",
    action: "editCatalog",
    entityType: "model",
    entityLabel: "CFMoto 700CL-X",
    at: daysAgo(3),
    note: {
      az: "İstifadəçi sorğusu ilə əlavə edildi.",
      en: "Added following a user request.",
      ru: "Добавлено по запросу пользователя.",
    },
  },
  {
    id: "au-5",
    actorId: "u-moderator",
    action: "resolveDispute",
    entityType: "dispute",
    entityLabel: "IT-2317 · Vespa GTS 300",
    at: daysAgo(5),
    note: {
      az: "Depozitin yarısı sahibin xeyrinə bölüşdürüldü.",
      en: "Half the deposit awarded to the owner.",
      ru: "Половина залога присуждена владельцу.",
    },
  },
  {
    id: "au-6",
    actorId: "u-moderator",
    action: "banUser",
    entityType: "user",
    entityLabel: "sahtekar_2026",
    at: daysAgo(6),
    note: {
      az: "Beş saxta elan, ödəniş tələbi.",
      en: "Five fraudulent listings soliciting upfront payment.",
      ru: "Пять мошеннических объявлений с требованием предоплаты.",
    },
  },
  {
    id: "au-7",
    actorId: "u-moderator",
    action: "refundCommission",
    entityType: "booking",
    entityLabel: "IT-2344 · Ninebot Max",
    at: daysAgo(8),
  },
];

/* -------------------------------------------------------------------------- */
/*  Revenue                                                                    */
/* -------------------------------------------------------------------------- */

export const revenueRecords: RevenueRecord[] = [
  { id: "rv-1", kind: "vip", amount: 42, sellerId: "u-caspian-bikes", reference: "BMW R 1250 GS · 30 days", at: daysAgo(4) },
  { id: "rv-2", kind: "vip", amount: 24, sellerId: "u-caspian-bikes", reference: "Yamaha MT-07 · 14 days", at: daysAgo(2) },
  { id: "rv-3", kind: "vip", amount: 12, sellerId: "u-rashad", reference: "Honda CB650R · 7 days", at: daysAgo(6) },
  { id: "rv-4", kind: "vip", amount: 24, sellerId: "u-caspian-bikes", reference: "Super Soco TC Max · 14 days", at: daysAgo(6) },
  { id: "rv-5", kind: "vip", amount: 12, sellerId: "u-motoparts-az", reference: "Brembo brake pads · 7 days", at: daysAgo(4) },
  { id: "rv-6", kind: "vip", amount: 24, sellerId: "u-caspian-bikes", reference: "Shoei NXR2 · 14 days", at: daysAgo(5) },
  { id: "rv-7", kind: "vip", amount: 12, sellerId: "u-kamran", reference: "Giant TCR Advanced · 7 days", at: daysAgo(5) },
  { id: "rv-8", kind: "vip", amount: 24, sellerId: "u-caspian-bikes", reference: "Yamaha XMAX 300 · 14 days", at: daysAgo(5) },
  { id: "rv-9", kind: "bump", amount: 8, sellerId: "u-kamran", reference: "Kawasaki Z900 · pack of 5", at: hoursAgo(20) },
  { id: "rv-10", kind: "bump", amount: 8, sellerId: "u-nermin", reference: "Honda PCX 125 · pack of 5", at: daysAgo(3) },
  { id: "rv-11", kind: "bump", amount: 8, sellerId: "u-tural", reference: "KTM 390 Duke · pack of 5", at: daysAgo(7) },
  { id: "rv-12", kind: "bump", amount: 8, sellerId: "u-elvin", reference: "Trek Marlin 7 · pack of 5", at: daysAgo(9) },
  { id: "rv-13", kind: "subscription", amount: 180, sellerId: "u-caspian-bikes", reference: "Shop plan · July", at: daysAgo(12) },
  { id: "rv-14", kind: "subscription", amount: 180, sellerId: "u-motoparts-az", reference: "Shop plan · July", at: daysAgo(12) },
  { id: "rv-15", kind: "subscription", amount: 320, sellerId: "u-baku-moto-rent", reference: "Shop+ plan · July", at: daysAgo(12) },
  { id: "rv-16", kind: "subscription", amount: 180, sellerId: "u-elektro-ride", reference: "Shop plan · July", at: daysAgo(12) },
  { id: "rv-17", kind: "servicePromo", amount: 90, sellerId: "u-moto-servis-baki", reference: "Directory priority · July", at: daysAgo(14) },
  { id: "rv-18", kind: "servicePromo", amount: 90, sellerId: "u-elektro-ride", reference: "Directory priority · July", at: daysAgo(14) },
  { id: "rv-19", kind: "commission", amount: 21.6, sellerId: "u-rashad", reference: "IT-2402 · Vespa Primavera 150", at: "2026-07-08T11:00:00+04:00" },
  { id: "rv-20", kind: "commission", amount: 14.4, sellerId: "u-rashad", reference: "IT-2418 · Vespa Primavera 150", at: "2026-07-16T18:30:00+04:00" },
  { id: "rv-21", kind: "commission", amount: 15.2, sellerId: "u-rashad", reference: "IT-2436 · Vespa Primavera 150", at: "2026-07-24T13:00:00+04:00" },
  { id: "rv-22", kind: "commission", amount: 2.2, sellerId: "u-elektro-ride", reference: "IT-2455 · Ninebot Max G30", at: "2026-07-24T11:30:00+04:00" },
  { id: "rv-23", kind: "commission", amount: 28.8, sellerId: "u-baku-moto-rent", reference: "IT-2390 · Honda Rebel 500", at: "2026-06-30T22:00:00+04:00" },
  { id: "rv-24", kind: "commission", amount: 44.5, sellerId: "u-baku-moto-rent", reference: "July rentals · 9 bookings", at: daysAgo(1) },
];

/** Total revenue for a month key such as "2026-07". */
export function revenueForMonth(month: string) {
  return revenueRecords
    .filter((record) => record.at.startsWith(month))
    .reduce((total, record) => total + record.amount, 0);
}

export function revenueByKind(month: string) {
  const totals: Record<string, number> = {};
  for (const record of revenueRecords) {
    if (!record.at.startsWith(month)) continue;
    totals[record.kind] = (totals[record.kind] ?? 0) + record.amount;
  }
  return totals;
}

/* -------------------------------------------------------------------------- */
/*  Headline metrics                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Counts are derived from the datasets above wherever the prototype has real
 * data, and scaled up for the population a live platform would have. A reviewer
 * who adds up the moderation queue gets the same number the tile shows.
 */
export const adminMetrics: AdminMetrics = {
  pendingModeration: moderationQueue.length,
  openComplaints: complaints.filter((complaint) => complaint.status === "open").length,
  openDisputes: disputes.filter((dispute) => dispute.status !== "resolved").length,
  totalUsers: 3_412,
  totalListings: 1_987,
  monthlyRevenue: Math.round(revenueForMonth("2026-07")),
  monthlyBookings: 148,
  makesModelsCount: makes.length + models.length,
};

/** Sanity references so the console can cross-check against the live datasets. */
export const catalogCounts = {
  seededListings: listings.length,
  seededParts: parts.length,
  seededUsers: users.length,
};
