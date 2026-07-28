import type { ID, ISODateTime, LocalizedText, Photo } from "./common";

/** Heuristics the system raises automatically so a moderator can triage fast. */
export type ModerationFlag =
  | "duplicatePhoto"
  | "duplicateListing"
  | "bannedWord"
  | "priceAnomaly"
  | "noPhotos"
  | "contactInDescription"
  | "unverifiedSeller";

export type ModerationItem = {
  id: ID;
  entityType: "listing" | "part";
  entityId: ID;
  title: string;
  price: number;
  sellerId: ID;
  cityId: ID;
  submittedAt: ISODateTime;
  flags: ModerationFlag[];
  photos: Photo[];
};

export type ComplaintReason = "fraud" | "wrongCategory" | "sold" | "offensive" | "spam";

export type Complaint = {
  id: ID;
  entityType: "listing" | "user" | "review";
  entityId: ID;
  entityLabel: string;
  reason: ComplaintReason;
  reporterId: ID;
  note?: LocalizedText;
  createdAt: ISODateTime;
  status: "open" | "resolved" | "rejected";
};

export type DisputeReason = "damage" | "lateReturn" | "noShow" | "depositWithheld" | "condition";

/**
 * Everything a moderator needs in one window: handover and return photos, the
 * chat history, and the signed agreement. Decisions get made on facts.
 */
export type Dispute = {
  id: ID;
  bookingId: ID;
  openedById: ID;
  againstId: ID;
  reason: DisputeReason;
  summary: LocalizedText;
  amountClaimed: number;
  status: "open" | "reviewing" | "resolved";
  openedAt: ISODateTime;
  evidence: {
    handoverPhotos: number;
    returnPhotos: number;
    chatMessages: number;
    agreementSigned: boolean;
    odometerDelta?: number;
  };
  resolution?: LocalizedText;
};

export type AuditAction =
  | "approveListing"
  | "rejectListing"
  | "banUser"
  | "verifySeller"
  | "resolveDispute"
  | "editCatalog"
  | "refundCommission";

export type AuditEntry = {
  id: ID;
  actorId: ID;
  action: AuditAction;
  entityType: string;
  entityLabel: string;
  at: ISODateTime;
  note?: LocalizedText;
};

export type RevenueKind = "commission" | "vip" | "bump" | "subscription" | "servicePromo";

export type RevenueRecord = {
  id: ID;
  kind: RevenueKind;
  amount: number;
  sellerId: ID;
  reference: string;
  at: ISODateTime;
};

export type AdminMetrics = {
  pendingModeration: number;
  openComplaints: number;
  openDisputes: number;
  totalUsers: number;
  totalListings: number;
  monthlyRevenue: number;
  monthlyBookings: number;
  makesModelsCount: number;
};
