export type FacilityStatus =
  | "habilitado"
  | "registro"
  | "mides"
  | "otra_fuente"
  | "verificar"
  | "app"
  | "candidate_private";

export type Facility = {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  lat: number;
  lng: number;
  precision: "puerta" | "calle" | "referencial";
  precisionLabel: string;
  statusGroup: FacilityStatus;
  statusStage: string;
  statusShort: string;
  sourceLabel: string;
  mspFinal: boolean;
  mspRegistroHistorico: boolean;
  midesSocial: boolean;
  pacp: boolean;
  otherSource: boolean;
  pendingVerification: boolean;
  appDiscovered: boolean;
  sourceCategories?: Array<"official" | "public_maps" | "social_public" | "other_public">;
  privateCandidate?: boolean;
  privateCandidateStatus?: string;
  privateCandidateEvidenceTier?: "A" | "B" | "C";
  privateCandidateSourceUrl?: string;
  privateCandidateRetrievedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  contactPhone?: string;
  contactEmail?: string;
  description?: string;
  photoUrl?: string;
  monthlyPriceUyu?: number;
  monthlyPriceAsOf?: string;
  monthlyPriceIncludes?: string[];
  sourceUrl?: string;
  sourceLinks?: Array<{
    label: string;
    url: string;
    sourceDate?: string;
    retrievedAt?: string;
  }>;
  validThrough?: string;
  /** Registro ficticio aislado; nunca forma parte de los conteos oficiales. */
  isDemo?: boolean;
};

export type MapMode = "streets" | "list";
