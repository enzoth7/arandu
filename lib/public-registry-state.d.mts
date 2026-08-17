export type PublicRegistryView = "list" | "map" | "mixed";
export type PublicRegistryStatus = "" | "habilitado" | "mides" | "verificar";
export type PublicRegistryQualityRating = "" | "outstanding" | "good" | "requires_improvement" | "inadequate" | "unrated";
export type PublicRegistryPriceOrder = "" | "asc" | "desc";
export type PublicRegistryPhotoAvailability = "" | "with" | "without";

export type PublicRegistryViewport = {
  center: [number, number];
  zoom: number;
};

export type PublicRegistryState = {
  version: 1;
  savedAt: number;
  filters: {
    query: string;
    department: string;
    monthlyPriceRange: { min: number; max: number } | null;
    status: PublicRegistryStatus;
    qualityRating: PublicRegistryQualityRating;
    priceOrder: PublicRegistryPriceOrder;
    photoAvailability: PublicRegistryPhotoAvailability;
  };
  registryView: PublicRegistryView;
  selectedId: string | null;
  scroll: {
    windowY: number;
    resultsY: number;
  };
  mapViewport: PublicRegistryViewport | null;
};

export const PUBLIC_REGISTRY_STATE_VERSION: 1;
export const PUBLIC_REGISTRY_STATE_KEY: "arandu:public-registry-return:v1";
export const PUBLIC_REGISTRY_STATE_MAX_AGE_MS: number;

export function parsePublicRegistryState(raw: string | null, now?: number): PublicRegistryState | null;
