export type FacilityDocumentStatus = {
  key: "outstanding" | "good" | "needs-improvement";
  label: "Sobresaliente" | "Bueno" | "Requiere mejoras";
  stars: 2 | 3 | 4;
  tone: "strong-green" | "light-green" | "yellow";
};

export function facilityDocumentStatus(facility: { mspFinal?: boolean; midesSocial?: boolean } | null | undefined): FacilityDocumentStatus;
export function facilityDocumentStatusDescription(status: FacilityDocumentStatus): string;
