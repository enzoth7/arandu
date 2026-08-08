import type { SourceCategory } from "./facility-sources.mjs";

export type EvidenceTier = "A" | "B" | "C";

export type PrivateQueueCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  status: string;
  evidenceTier: EvidenceTier;
  humanReviewed: boolean;
  hasCoordinates: boolean;
  sourceCategories: SourceCategory[];
  pendingImport: boolean;
  details: Record<string, unknown>;
};

export type PrivateUnlocatedCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  evidenceTier: EvidenceTier;
  historical: boolean;
  alreadyInQueue: boolean;
};

export type UnlocatedDiscoveryCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  coordinateStatus: string;
  mapAction: string;
  reviewStatus: string;
  evidenceTier: EvidenceTier;
  historical: boolean;
  hasCoordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  geocodingSourceUrl: string | null;
  dataset: string;
  retrievedAt: string;
};

export type PrivateCandidateSummary = {
  total: number;
  needsReview: number;
  possibleMatch: number;
  verifiedNew: number;
  otherStatuses: number;
  mappedFromDatabase: number;
  mappedFromManualSources: number;
  visibleOnMap: number;
  unlocatedCandidates: PrivateUnlocatedCandidate[];
  queueCandidates: PrivateQueueCandidate[];
};

export const EMPTY_CANDIDATE_SUMMARY: PrivateCandidateSummary;

export function buildPrivateCandidateLayer<TFacility>(
  databaseCandidates: unknown,
  manualCandidates?: readonly UnlocatedDiscoveryCandidate[],
): { facilities: TFacility[]; summary: PrivateCandidateSummary };
