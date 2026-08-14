export const PROTOTYPE_PRICE_METHODOLOGY_VERSION = "prototype_v1_2026_08";

export const PROTOTYPE_PRICE_WARNING =
  "Estimación orientativa del prototipo. No constituye una cotización ni confirma disponibilidad. Puede variar según habitación, autonomía, dependencia, servicios e insumos.";

export type PrototypePriceGuidanceType =
  | "public_recent"
  | "public_undated_context"
  | "historical_context"
  | "territorial_capacity"
  | "territorial_reference";

export type PrototypePriceConfidence = "high" | "medium" | "low" | "very_low";

export type PrototypePriceGuidance = {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  mspFinal: boolean;
  midesSocial: boolean;
  priceMinUyu: number;
  priceMidUyu: number;
  priceMaxUyu: number;
  guidanceType: PrototypePriceGuidanceType;
  confidence: PrototypePriceConfidence;
  territoryTier: string;
  methodologyVersion: string;
  methodologyNote: string;
  observedReferenceText?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sourceDate?: string;
  sourceYear?: number;
  computedAt: string;
};

export const PROTOTYPE_PRICE_TYPE_LABELS: Record<PrototypePriceGuidanceType, string> = {
  public_recent: "Precio público encontrado",
  public_undated_context: "Referencia pública + estimación",
  historical_context: "Antecedente histórico + estimación",
  territorial_capacity: "Estimación territorial y por capacidad",
  territorial_reference: "Referencia territorial",
};

export const PROTOTYPE_PRICE_CONFIDENCE_LABELS: Record<PrototypePriceConfidence, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  very_low: "Muy baja",
};

const uyuFormatter = new Intl.NumberFormat("es-UY", {
  maximumFractionDigits: 0,
});

export function formatPrototypePriceRange(minUyu: number, maxUyu: number) {
  if (minUyu === maxUyu) return `UYU ${uyuFormatter.format(minUyu)}`;
  return `UYU ${uyuFormatter.format(minUyu)}–${uyuFormatter.format(maxUyu)}`;
}
