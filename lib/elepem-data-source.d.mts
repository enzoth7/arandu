export type ElepemDataSource = "legacy" | "compatibility" | "normalized";

export function readElepemDataSource(value?: string): ElepemDataSource;
export function runtimeElepemDataSource(): "normalized";
export function publicFacilityRelation(dataSource: ElepemDataSource):
  | "public.residenciales"
  | "public.residenciales_legacy_compat"
  | "public.arandu_facilities_registry";
export function matchingFacilityRelation(dataSource: ElepemDataSource):
  | "public.residenciales"
  | "public.residenciales_legacy_compat"
  | "public.known_facilities_exclusion_view";
export function candidateSuggestionSql(dataSource: ElepemDataSource): string;
