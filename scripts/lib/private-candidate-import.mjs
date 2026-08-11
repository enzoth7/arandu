export const INSERT_RUN_SQL = `
  insert into discovery_private.facility_source_runs (
    run_key,
    source_type,
    source_url,
    source_license,
    storage_policy,
    status,
    started_at,
    completed_at,
    observation_count
  ) values ($1, 'openstreetmap', $2, $3, 'normalized_only', 'succeeded', $4, $4, $5)
  on conflict (run_key) do update set
    status = 'succeeded',
    completed_at = excluded.completed_at,
    observation_count = excluded.observation_count,
    error_summary = null
  returning id
`;

export const INSERT_OBSERVATIONS_SQL = `
  with incoming as (
    select *
    from jsonb_to_recordset($2::jsonb) as row(
      "sourceRecordKey" text,
      "sourceUrl" text,
      "retrievedAt" timestamptz,
      "sourceLicense" text,
      "normalizedName" text,
      "normalizedDepartment" text,
      "normalizedLocality" text,
      "normalizedAddress" text,
      lat double precision,
      lng double precision,
      "recordHash" text
    )
  )
  insert into discovery_private.facility_source_observations (
    run_id,
    source_type,
    source_record_key,
    source_url,
    retrieved_at,
    source_license,
    storage_policy,
    normalized_name,
    normalized_department,
    normalized_locality,
    normalized_address,
    lat,
    lng,
    raw_metadata_storage_permitted,
    raw_metadata,
    record_hash
  )
  select
    $1,
    'openstreetmap',
    incoming."sourceRecordKey",
    incoming."sourceUrl",
    incoming."retrievedAt",
    incoming."sourceLicense",
    'normalized_only',
    incoming."normalizedName",
    incoming."normalizedDepartment",
    incoming."normalizedLocality",
    incoming."normalizedAddress",
    incoming.lat,
    incoming.lng,
    false,
    null,
    incoming."recordHash"
  from incoming
  on conflict (source_type, source_record_key, record_hash) do nothing
  returning id
`;

export const UPSERT_CANDIDATES_SQL = `
  with incoming as (
    select *
    from jsonb_to_recordset($1::jsonb) as row(
      "candidateKey" text,
      "candidateName" text,
      "candidateDepartment" text,
      "candidateLocality" text,
      "candidateAddress" text,
      lat double precision,
      lng double precision,
      "candidateStatus" text,
      "bestMatchResidencialId" text,
      "bestMatchScore" numeric
    )
  ), valid as (
    select
      incoming.*,
      residencial.id as valid_match_id
    from incoming
    left join public.residenciales as residencial
      on residencial.id = incoming."bestMatchResidencialId"
    where incoming."candidateName" is not null
  )
  insert into discovery_private.facility_candidates (
    candidate_key,
    status,
    normalized_name,
    normalized_department,
    normalized_locality,
    normalized_address,
    lat,
    lng,
    best_match_residencial_id,
    best_match_score,
    evidence_tier,
    human_reviewed,
    public_eligible,
    first_seen_at,
    last_seen_at
  )
  select
    valid."candidateKey",
    valid."candidateStatus",
    valid."candidateName",
    valid."candidateDepartment",
    valid."candidateLocality",
    valid."candidateAddress",
    valid.lat,
    valid.lng,
    valid.valid_match_id,
    valid."bestMatchScore",
    'C',
    false,
    false,
    $2,
    $2
  from valid
  on conflict (candidate_key) do update set
    status = excluded.status,
    normalized_name = excluded.normalized_name,
    normalized_department = excluded.normalized_department,
    normalized_locality = excluded.normalized_locality,
    normalized_address = excluded.normalized_address,
    lat = excluded.lat,
    lng = excluded.lng,
    best_match_residencial_id = excluded.best_match_residencial_id,
    best_match_score = excluded.best_match_score,
    last_seen_at = greatest(discovery_private.facility_candidates.last_seen_at, excluded.last_seen_at),
    updated_at = now()
  where not discovery_private.facility_candidates.human_reviewed
  returning id
`;

export const UPSERT_NORMALIZED_CANDIDATES_SQL = `
  with incoming as (
    select *
    from jsonb_to_recordset($1::jsonb) as row(
      "candidateKey" text,
      "candidateName" text,
      "candidateDepartment" text,
      "candidateLocality" text,
      "candidateAddress" text,
      lat double precision,
      lng double precision,
      "candidateStatus" text,
      "bestMatchResidencialId" text,
      "bestMatchScore" numeric
    )
  ), resolved as (
    select
      incoming.*,
      facility.facility_id as valid_facility_id,
      legacy.legacy_residencial_id as valid_legacy_match_id
    from incoming
    left join elepem_core.legacy_facility_map as input_mapping
      on input_mapping.legacy_residencial_id = incoming."bestMatchResidencialId"
     and input_mapping.mapping_status = 'mapped'
    left join lateral (
      select current_facility.facility_id, current_facility.facility_key
      from public.facilities_current_internal as current_facility
      join public.known_facilities_exclusion_view as exclusion
        on exclusion.subject_type = 'normalized_facility'
       and exclusion.subject_id = current_facility.facility_key
      where current_facility.facility_key = incoming."bestMatchResidencialId"
         or current_facility.facility_id = input_mapping.facility_id
      order by (current_facility.facility_key = incoming."bestMatchResidencialId") desc
      limit 1
    ) as facility on true
    left join lateral (
      select mapping.legacy_residencial_id
      from elepem_core.legacy_facility_map as mapping
      where mapping.facility_id = facility.facility_id
        and mapping.mapping_status = 'mapped'
      order by mapping.legacy_residencial_id
      limit 1
    ) as legacy on true
    where incoming."candidateName" is not null
  )
  insert into discovery_private.facility_candidates (
    candidate_key,
    status,
    normalized_name,
    normalized_department,
    normalized_locality,
    normalized_address,
    lat,
    lng,
    best_match_residencial_id,
    resolved_facility_id,
    best_match_score,
    evidence_tier,
    human_reviewed,
    public_eligible,
    first_seen_at,
    last_seen_at
  )
  select
    resolved."candidateKey",
    resolved."candidateStatus",
    resolved."candidateName",
    resolved."candidateDepartment",
    resolved."candidateLocality",
    resolved."candidateAddress",
    resolved.lat,
    resolved.lng,
    resolved.valid_legacy_match_id,
    resolved.valid_facility_id,
    resolved."bestMatchScore",
    'C',
    false,
    false,
    $2,
    $2
  from resolved
  on conflict (candidate_key) do update set
    status = excluded.status,
    normalized_name = excluded.normalized_name,
    normalized_department = excluded.normalized_department,
    normalized_locality = excluded.normalized_locality,
    normalized_address = excluded.normalized_address,
    lat = excluded.lat,
    lng = excluded.lng,
    best_match_residencial_id = excluded.best_match_residencial_id,
    resolved_facility_id = excluded.resolved_facility_id,
    best_match_score = excluded.best_match_score,
    last_seen_at = greatest(discovery_private.facility_candidates.last_seen_at, excluded.last_seen_at),
    updated_at = now()
  where not discovery_private.facility_candidates.human_reviewed
  returning id
`;

export function candidateUpsertSql(dataSource = "legacy") {
  return dataSource === "normalized"
    ? UPSERT_NORMALIZED_CANDIDATES_SQL
    : UPSERT_CANDIDATES_SQL;
}

export const LINK_SOURCES_SQL = `
  with incoming as (
    select *
    from jsonb_to_recordset($1::jsonb) as row(
      "candidateKey" text,
      "sourceRecordKey" text,
      "recordHash" text
    )
  )
  insert into discovery_private.facility_candidate_sources (
    candidate_id,
    observation_id,
    evidence_role,
    link_method,
    linked_by
  )
  select
    candidate.id,
    observation.id,
    'lead',
    'automated',
    'arandu-osm-import/1.0'
  from incoming
  join discovery_private.facility_candidates as candidate
    on candidate.candidate_key = incoming."candidateKey"
  join discovery_private.facility_source_observations as observation
    on observation.source_type = 'openstreetmap'
   and observation.source_record_key = incoming."sourceRecordKey"
   and observation.record_hash = incoming."recordHash"
  on conflict (candidate_id, observation_id) do nothing
  returning candidate_id
`;

export const INSERT_EXTERNAL_IDS_SQL = `
  with incoming as (
    select *
    from jsonb_to_recordset($1::jsonb) as row(
      "candidateKey" text,
      "sourceRecordKey" text,
      "recordHash" text,
      "externalId" text,
      "externalUrl" text
    )
  )
  insert into discovery_private.facility_external_ids (
    candidate_id,
    residencial_id,
    observation_id,
    provider,
    external_id,
    external_url,
    link_method,
    linked_by
  )
  select
    candidate.id,
    null,
    observation.id,
    'openstreetmap',
    incoming."externalId",
    incoming."externalUrl",
    'source_observation',
    'arandu-osm-import/1.0'
  from incoming
  join discovery_private.facility_candidates as candidate
    on candidate.candidate_key = incoming."candidateKey"
  join discovery_private.facility_source_observations as observation
    on observation.source_type = 'openstreetmap'
   and observation.source_record_key = incoming."sourceRecordKey"
   and observation.record_hash = incoming."recordHash"
  where incoming."externalId" is not null and incoming."externalId" <> ''
  on conflict (provider, external_id) do nothing
  returning id
`;

export const PRIVATE_IMPORT_SQL = Object.freeze([
  INSERT_RUN_SQL,
  INSERT_OBSERVATIONS_SQL,
  UPSERT_CANDIDATES_SQL,
  UPSERT_NORMALIZED_CANDIDATES_SQL,
  LINK_SOURCES_SQL,
  INSERT_EXTERNAL_IDS_SQL,
]);

export function assertPrivateImportSql() {
  for (const sql of PRIVATE_IMPORT_SQL) {
    if (/\b(?:insert\s+into|update|delete\s+from)\s+public\./i.test(sql)) {
      throw new Error("El importador contiene una escritura fuera del esquema privado.");
    }
  }
}

async function countPublicResidenciales(client) {
  const result = await client.query(
    "select count(*)::integer as count from public.residenciales",
  );
  return result.rows[0].count;
}

export async function applyPrivateCandidates(client, { inputMetadata, rows, dataSource = "legacy" }) {
  assertPrivateImportSql();
  const requiredTables = await client.query(`
    select
      to_regclass('discovery_private.facility_source_runs') is not null as runs,
      to_regclass('discovery_private.facility_source_observations') is not null as observations,
      to_regclass('discovery_private.facility_candidates') is not null as candidates,
      to_regclass('discovery_private.facility_candidate_sources') is not null as sources,
      to_regclass('discovery_private.facility_external_ids') is not null as external_ids
  `);
  if (Object.values(requiredTables.rows[0]).some((value) => value !== true)) {
    throw new Error("Faltan tablas del workflow privado.");
  }

  await client.query("begin");
  try {
    await client.query("set local statement_timeout = '30s'");
    await client.query("set local lock_timeout = '5s'");
    const publicCountBefore = await countPublicResidenciales(client);
    const runKey = `osm:${inputMetadata.querySha256}:${inputMetadata.retrievedAt}`;
    const run = await client.query(INSERT_RUN_SQL, [
      runKey,
      inputMetadata.endpoint,
      inputMetadata.sourceLicense,
      inputMetadata.retrievedAt,
      rows.length,
    ]);
    const runId = run.rows[0].id;
    const observations = await client.query(INSERT_OBSERVATIONS_SQL, [
      runId,
      JSON.stringify(rows),
    ]);
    const candidates = await client.query(candidateUpsertSql(dataSource), [
      JSON.stringify(rows),
      inputMetadata.retrievedAt,
    ]);
    const links = await client.query(LINK_SOURCES_SQL, [JSON.stringify(rows)]);
    const externalIds = await client.query(INSERT_EXTERNAL_IDS_SQL, [
      JSON.stringify(rows),
    ]);
    const publicCountAfter = await countPublicResidenciales(client);
    if (publicCountAfter !== publicCountBefore) {
      throw new Error("Cambió el conteo de public.residenciales; se revierte la transacción.");
    }
    const totals = await client.query(`
      select
        (select count(*)::integer from discovery_private.facility_source_runs) as runs,
        (select count(*)::integer from discovery_private.facility_source_observations) as observations,
        (select count(*)::integer from discovery_private.facility_candidates) as candidates,
        (select count(*)::integer from discovery_private.facility_candidates where human_reviewed) as reviewed,
        (select count(*)::integer from discovery_private.facility_candidates where public_eligible) as public_eligible
    `);
    await client.query("commit");
    return {
      runId,
      publicResidencialesBefore: publicCountBefore,
      publicResidencialesAfter: publicCountAfter,
      insertedObservations: observations.rowCount,
      insertedOrUpdatedCandidates: candidates.rowCount,
      insertedLinks: links.rowCount,
      insertedExternalIds: externalIds.rowCount,
      dataSource,
      totals: totals.rows[0],
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
