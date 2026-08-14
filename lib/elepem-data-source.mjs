export function readElepemDataSource(value = process.env.ELEPEM_DATA_SOURCE) {
  const selected = String(value || "flat").trim().toLowerCase();
  if (selected !== "flat") {
    throw new Error("El runtime sÃ³lo admite el padrÃ³n directo public.elepem.");
  }
  return "flat";
}

export function runtimeElepemDataSource() {
  return "flat";
}

export function publicFacilityRelation() {
  return "public.elepem";
}

export function matchingFacilityRelation() {
  return "public.elepem";
}

export function candidateSuggestionSql() {
  throw new Error("La cola de candidatos en base de datos fue retirada; use la importaciÃ³n de archivos con dry-run.");
}
