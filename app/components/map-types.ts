export type FacilityStatus = "habilitado" | "mides" | "verificar" | "app";
export type FacilityQualityRating = "outstanding" | "good" | "requires_improvement" | "inadequate";

export const QUALITY_RATING_LABELS: Record<FacilityQualityRating, string> = {
  outstanding: "Sobresaliente",
  good: "Bueno",
  requires_improvement: "Requiere mejoras",
  inadequate: "Inadecuado",
};

export type FacilitySituation =
  | "habilitacion_msp"
  | "certificado_social_mides"
  | "situacion_no_confirmada"
  | "demo";

export type Facility = {
  /** Stable public code. The bigint database id is kept behind the API. */
  id: string;
  legacyId?: string;
  name: string;
  alternativeNames?: string[];
  department: string;
  locality: string;
  address: string;
  lat: number;
  lng: number;
  precision: "puerta" | "calle" | "referencial";
  precisionLabel: string;
  situacion: FacilitySituation;
  statusGroup: FacilityStatus;
  statusShort: string;
  sourceLabel: string;
  mspFinal: boolean;
  midesSocial: boolean;
  createdAt?: string;
  updatedAt?: string;
  contactPhone?: string;
  contactPhones?: string[];
  contactEmail?: string;
  contactEmails?: string[];
  websites?: string[];
  instagramUrls?: string[];
  facebookUrls?: string[];
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
  monthlyPriceUyu?: number;
  monthlyPriceAsOf?: string;
  monthlyPriceIncludes?: string[];
  /** Synthetic values remain visible but are always identified as demo. */
  priceIsDemo?: boolean;
  /** Clasificación futura del cuestionario; por ahora sólo existe en la ficha demo. */
  qualityRating?: FacilityQualityRating;
  sourceUrl?: string;
  sourceLinks?: Array<{
    label: string;
    url: string;
    sourceDate?: string;
    retrievedAt?: string;
    backedFields?: string[];
  }>;
  /** Fictitious isolated record; never part of productive KPI. */
  isDemo?: boolean;
};

export type MapMode = "streets" | "list";
