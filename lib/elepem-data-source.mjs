const DATA_SOURCES = new Set(["legacy", "compatibility", "normalized"]);

export function readElepemDataSource(value = process.env.ELEPEM_DATA_SOURCE) {
  const selected = String(value || "normalized").trim().toLowerCase();
  if (!DATA_SOURCES.has(selected)) {
    throw new Error(
      `ELEPEM_DATA_SOURCE inválido: ${selected}. Use legacy, compatibility o normalized.`,
    );
  }
  return selected;
}

// El runtime web siempre consulta el padrón canónico unificado. Las variantes
// legacy quedan disponibles únicamente para scripts de migración y auditoría
// que las seleccionan de forma explícita.
export function runtimeElepemDataSource() {
  return "normalized";
}

export function publicFacilityRelation(dataSource) {
  if (dataSource === "normalized") return "public.arandu_facilities_registry";
  if (dataSource === "compatibility") return "public.residenciales_legacy_compat";
  return "public.residenciales";
}

export function matchingFacilityRelation(dataSource) {
  if (dataSource === "normalized") return "public.known_facilities_exclusion_view";
  return publicFacilityRelation(dataSource);
}

export function candidateSuggestionSql(dataSource) {
  if (dataSource === "normalized") {
    return `
      select jsonb_agg(
        jsonb_build_object(
          'rank', suggestion.rank,
          'score', suggestion.score,
          'components', suggestion.components,
          'generatedAt', suggestion.generated_at,
          'residencialId', facility.facility_key,
          'name', facility.name,
          'department', facility.department,
          'locality', facility.locality,
          'address', facility.address,
          'latitude', facility.lat,
          'longitude', facility.lng
        ) order by suggestion.rank
      )
      from discovery_private.facility_candidate_match_suggestions as suggestion
      join public.facilities_current_internal as facility
        on facility.facility_id = suggestion.facility_id
      where suggestion.candidate_id = candidate.id
    `;
  }

  const relation = publicFacilityRelation(dataSource);
  return `
    select jsonb_agg(
      jsonb_build_object(
        'rank', suggestion.rank,
        'score', suggestion.score,
        'components', suggestion.components,
        'generatedAt', suggestion.generated_at,
        'residencialId', residencial.id,
        'name', residencial.name,
        'department', residencial.department,
        'locality', residencial.locality,
        'address', residencial.address,
        'latitude', residencial.lat,
        'longitude', residencial.lng
      ) order by suggestion.rank
    )
    from discovery_private.facility_candidate_match_suggestions as suggestion
    join ${relation} as residencial
      on residencial.id = suggestion.residencial_id
    where suggestion.candidate_id = candidate.id
  `;
}
