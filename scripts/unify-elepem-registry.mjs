import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";
import { loadManualDiscoveryPilot } from "../lib/manual-discovery-pilot.mjs";

const { Client } = pg;

const MANUAL_INPUTS = Object.freeze([
  "artigas_department_elepem_public_candidates_2026-08-02.json",
  "instagram_paysandu_candidates_2026-08-02.json",
]);
const MSP_URL = "https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-06/ELEPEM%20HABILITADOS%20JUNIO%202026.pdf";
const MIDES_URL = "https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social";
const PRICE_BUCKETS = Object.freeze([55_000, 65_000, 75_000, 85_000, 95_000, 110_000]);

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function required(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`Falta --${name}.`);
  return value;
}

function sourceType(value) {
  if (value === "instagram_public_profile" || value === "facebook_public_page") return "social_public_url";
  if (value === "public_directory") return "public_directory";
  if (value === "facility_website") return "facility_website";
  if (value === "news") return "news";
  if (value === "official") return "official";
  return "other";
}

function sourceChannel(type) {
  if (type === "official") return "official_sources";
  if (type === "social_public_url") return "public_social_sources";
  if (type === "openstreetmap") return "public_maps";
  return "other_public_sources";
}

function sourceLabel(url, type) {
  const lower = String(url || "").toLowerCase();
  if (lower.includes("instagram.com/")) return "Instagram";
  if (lower.includes("facebook.com/")) return "Facebook";
  if (type === "official") return "Organismo publico";
  if (type === "facility_website") return "Sitio institucional";
  if (type === "public_directory") return "Directorio publico";
  if (type === "news") return "Medio de prensa";
  if (type === "openstreetmap") return "OpenStreetMap";
  return "Otra fuente publica";
}

async function readManualDocuments() {
  const documents = await Promise.all(MANUAL_INPUTS.map(async (file) => ({
    file,
    value: JSON.parse(await readFile(resolve(PROJECT_ROOT, "data/discovery", file), "utf8")),
  })));
  const pilot = await loadManualDiscoveryPilot(PROJECT_ROOT);
  const rawByKey = new Map(documents.flatMap(({ file, value }) =>
    (Array.isArray(value.records) ? value.records : []).map((row) => [row.candidate_key, {
      file,
      dataset: value.dataset,
      generatedAt: value.generated_at,
      row,
    }])));
  return { pilot, rawByKey };
}

async function collectState(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'legacy_total', (select count(*) from public.residenciales),
      'legacy_msp', (select count(*) from public.residenciales where msp_final),
      'legacy_mides', (select count(*) from public.residenciales where mides_social),
      'legacy_both', (select count(*) from public.residenciales where msp_final and mides_social),
      'core_total', (select count(*) from elepem_core.facilities),
      'core_current', (select count(*) from elepem_core.facilities where lifecycle_status = 'current'),
      'candidates', (select count(*) from discovery_private.facility_candidates),
      'candidates_without_location', (
        select count(*) from discovery_private.facility_candidates where lat is null and lng is null
      ),
      'resolved_candidates', (
        select count(*) from discovery_private.facility_candidates where resolved_facility_id is not null
      ),
      'unified_schema', exists (
        select 1 from information_schema.columns
        where table_schema = 'elepem_core' and table_name = 'facilities'
          and column_name = 'identity_status'
      )
    ) as value
  `);
  const state = result.rows[0].value;
  if (state.unified_schema && (await client.query("select to_regclass('public.arandu_facilities_registry') is not null as present")).rows[0].present) {
    const unified = await client.query(`
      select
        (select count(*)::integer from public.arandu_facilities_registry) as public_registry,
        (select count(*)::integer from public.arandu_facilities_registry where msp_final) as public_msp,
        (select count(*)::integer from public.arandu_facilities_registry where mides_social) as public_mides,
        (select count(*)::integer from public.arandu_facilities_registry where not msp_final and not mides_social) as public_unconfirmed,
        (select count(*)::integer from elepem_core.facilities
          where origin_candidate_id is not null and location_status = 'location_pending') as location_pending,
        (select count(*)::integer from elepem_core.facilities
          where demo_monthly_price_uyu is not null) as demo_prices
    `);
    Object.assign(state, unified.rows[0]);
  }
  return state;
}

function assertPreflight(state, manualMissing) {
  const expected = {
    legacy_total: 801,
    legacy_msp: 212,
    legacy_mides: 275,
    legacy_both: 170,
    core_total: 893,
    core_current: 874,
    candidates: 226,
    candidates_without_location: 81,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(state[key]) !== value) {
      throw new Error(`Preflight rechazado: ${key}=${state[key]}, esperado=${value}.`);
    }
  }
  if (manualMissing.length !== 3) {
    throw new Error(`Preflight rechazado: candidatos manuales ausentes=${manualMissing.length}, esperado=3.`);
  }
}

async function collectBackup(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'captured_at', now(),
      'residenciales', (select jsonb_agg(to_jsonb(row) order by row.id) from public.residenciales as row),
      'facilities', (select jsonb_agg(to_jsonb(row) order by row.id) from elepem_core.facilities as row),
      'facility_names', (select jsonb_agg(to_jsonb(row) order by row.id) from elepem_core.facility_names as row),
      'facility_addresses', (select jsonb_agg(to_jsonb(row) order by row.id) from elepem_core.facility_addresses as row),
      'facility_geocodes', (select jsonb_agg(to_jsonb(row) order by row.id) from elepem_core.facility_geocodes as row),
      'facility_observation_links', (select jsonb_agg(to_jsonb(row) order by row.facility_id, row.observation_id) from elepem_core.facility_observation_links as row),
      'candidates', (select jsonb_agg(to_jsonb(row) order by row.id) from discovery_private.facility_candidates as row),
      'candidate_sources', (select jsonb_agg(to_jsonb(row) order by row.candidate_id, row.observation_id) from discovery_private.facility_candidate_sources as row),
      'source_observations', (select jsonb_agg(to_jsonb(row) order by row.id) from discovery_private.facility_source_observations as row)
    ) as value
  `);
  return result.rows[0].value;
}

async function importMissingManualCandidates(client, missing, rawByKey) {
  for (const candidate of missing) {
    const origin = rawByKey.get(candidate.candidateKey);
    if (!origin) throw new Error(`No se encontro el JSON de origen para ${candidate.candidateKey}.`);
    const raw = origin.row;
    const inserted = await client.query(`
      insert into discovery_private.facility_candidates (
        candidate_key, status, normalized_name, normalized_department,
        normalized_locality, normalized_address, lat, lng, evidence_tier,
        human_reviewed, review_note, public_eligible,
        first_seen_at, last_seen_at
      ) values ($1, 'needs_review', $2, $3, $4, $5, $6, $7, $8, false, $9, false, $10, $10)
      on conflict (candidate_key) do update set
        last_seen_at = greatest(discovery_private.facility_candidates.last_seen_at, excluded.last_seen_at)
      returning id
    `, [
      candidate.candidateKey,
      candidate.name,
      candidate.department,
      candidate.locality,
      candidate.address,
      candidate.hasCoordinates ? candidate.latitude : null,
      candidate.hasCoordinates ? candidate.longitude : null,
      candidate.evidenceTier,
      String(raw.notes || "Importado sin publicacion automatica desde JSON de investigacion publica.").slice(0, 2000),
      candidate.retrievedAt || origin.generatedAt || new Date().toISOString(),
    ]);
    const candidateId = inserted.rows[0].id;

    for (const source of Array.isArray(raw.sources) ? raw.sources : []) {
      if (!/^https?:\/\//i.test(String(source.url || ""))) continue;
      const type = sourceType(source.type);
      const sourceHash = sha256({ candidateKey: candidate.candidateKey, source });
      const runKey = `unified-manual:${type}:${sourceHash.slice(0, 20)}`;
      const catalogKey = `unified:${type}:${sourceHash.slice(0, 20)}`;
      const label = sourceLabel(source.url, type);
      const catalog = await client.query(`
        insert into elepem_core.source_catalog (
          source_key, display_name, source_type, source_channel, base_url,
          authority_level, storage_policy
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (source_key) do update set updated_at = now()
        returning id
      `, [
        catalogKey, label, type, sourceChannel(type), source.url,
        type === "official" ? "official_nominal" : "lead",
        type === "social_public_url" ? "reference_only" : "normalized_only",
      ]);
      const run = await client.query(`
        insert into discovery_private.facility_source_runs (
          run_key, source_type, source_url, storage_policy, status,
          started_at, completed_at, observation_count, source_catalog_id
        ) values ($1, $2, $3, $4, 'succeeded', $5, $5, 1, $6)
        on conflict (run_key) do update set completed_at = excluded.completed_at
        returning id
      `, [
        runKey, type, source.url,
        type === "social_public_url" ? "reference_only" : "normalized_only",
        candidate.retrievedAt || origin.generatedAt || new Date().toISOString(),
        catalog.rows[0].id,
      ]);
      const social = type === "social_public_url";
      const observation = await client.query(`
        insert into discovery_private.facility_source_observations (
          run_id, source_type, source_record_key, source_url, retrieved_at,
          source_date, storage_policy, normalized_name, normalized_department,
          normalized_locality, normalized_address, human_note,
          raw_metadata_storage_permitted, raw_metadata, record_hash, source_catalog_id
        ) values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, false, null, $13, $14
        )
        on conflict (run_id, source_type, source_record_key) do update set
          retrieved_at = excluded.retrieved_at,
          source_date = excluded.source_date,
          human_note = excluded.human_note
        returning id
      `, [
        run.rows[0].id,
        type,
        `${candidate.candidateKey}:${sourceHash.slice(0, 16)}`.slice(0, 300),
        source.url,
        candidate.retrievedAt || origin.generatedAt || new Date().toISOString(),
        source.observed_at || null,
        social ? "reference_only" : "normalized_only",
        social ? null : candidate.name,
        social ? null : candidate.department,
        social ? null : candidate.locality,
        social ? null : candidate.address,
        `Fuente publica de ${candidate.name}; claims: ${(source.claims || []).join(", ")}`.slice(0, 500),
        sourceHash,
        catalog.rows[0].id,
      ]);
      await client.query(`
        insert into discovery_private.facility_candidate_sources (
          candidate_id, observation_id, evidence_role, independence_key,
          link_method, linked_by
        ) values ($1, $2, 'lead', $3, 'human', 'arandu-unified-registry-migration')
        on conflict do nothing
      `, [candidateId, observation.rows[0].id, new URL(source.url).hostname.slice(0, 200)]);
    }
  }
}

async function synchronizeRegistry(client, rawByKey) {
  await client.query("set local arandu.allow_official_snapshot_change = 'on'");

  await client.query(`
    update elepem_core.facilities as facility
    set
      identity_status = case
        when facility.lifecycle_status = 'merged' then 'duplicate'
        when facility.review_status = 'rejected' then 'discarded'
        else 'confirmed_facility'
      end,
      registry_visibility = case
        when facility.lifecycle_status <> 'current' then 'archived'
        when exists (select 1 from elepem_core.facility_geocodes geocode
          where geocode.facility_id = facility.id and geocode.is_current) then 'public'
        else 'held_location'
      end,
      location_status = case
        when exists (select 1 from elepem_core.facility_geocodes geocode
          where geocode.facility_id = facility.id and geocode.is_current) then 'mapped'
        else 'location_pending'
      end,
      registry_msp_final = coalesce(legacy.msp_final, false),
      registry_mides_social = coalesce(legacy.mides_social, false),
      migration_payload = coalesce(facility.migration_payload, '{}'::jsonb)
        || case when legacy.id is null then '{}'::jsonb
          else jsonb_build_object('legacy_residencial', to_jsonb(legacy)) end
    from elepem_core.facilities as target
    left join elepem_core.legacy_facility_map as mapping
      on mapping.facility_id = target.id and mapping.mapping_status = 'mapped'
    left join public.residenciales as legacy
      on legacy.id = mapping.legacy_residencial_id
    where facility.id = target.id
      and facility.origin_candidate_id is null
  `);

  await client.query(`
    insert into elepem_core.facilities (
      facility_key, lifecycle_status, review_status, publication_status,
      identity_status, registry_visibility, location_status,
      registry_msp_final, registry_mides_social,
      primary_source_label, primary_source_url, source_link_status,
      migration_payload, origin_candidate_id, created_at, updated_at
    )
    select
      format('FAC-CANDIDATE-%s', candidate.id),
      case when candidate.status in ('rejected', 'closed') then 'closed' else 'current' end,
      case when candidate.status = 'verified_new' and candidate.human_reviewed
        and candidate.evidence_tier in ('A', 'B') then 'verified' else 'needs_review' end,
      'private',
      case when candidate.status = 'verified_new' and candidate.human_reviewed
        and candidate.evidence_tier in ('A', 'B') then 'confirmed_facility'
        when candidate.status in ('rejected', 'closed') then 'discarded'
        else 'pending_identity_review' end,
      case when candidate.status = 'verified_new' and candidate.human_reviewed
        and candidate.evidence_tier in ('A', 'B') and candidate.lat is not null then 'public'
        when candidate.status = 'verified_new' and candidate.human_reviewed
        and candidate.evidence_tier in ('A', 'B') then 'held_location'
        else 'held_identity' end,
      case when candidate.lat is not null then 'mapped' else 'location_pending' end,
      false, false,
      primary_source.source_label, primary_source.source_url,
      case when primary_source.source_url is null then 'pending' else 'verified' end,
      jsonb_build_object('facility_candidate', to_jsonb(candidate)),
      candidate.id, candidate.created_at, candidate.updated_at
    from discovery_private.facility_candidates as candidate
    left join lateral (
      select
        case
          when observation.source_url ilike '%instagram.com/%' then 'Instagram'
          when observation.source_url ilike '%facebook.com/%' then 'Facebook'
          when observation.source_type = 'official' then 'Organismo publico'
          when observation.source_type = 'facility_website' then 'Sitio institucional'
          when observation.source_type = 'public_directory' then 'Directorio publico'
          when observation.source_type = 'news' then 'Medio de prensa'
          when observation.source_type = 'openstreetmap' then 'OpenStreetMap'
          else 'Otra fuente publica'
        end as source_label,
        observation.source_url
      from discovery_private.facility_candidate_sources as source_link
      join discovery_private.facility_source_observations as observation
        on observation.id = source_link.observation_id
      where source_link.candidate_id = candidate.id
        and observation.source_url ~* '^https?://'
        and observation.source_url !~* 'supabase\\.co(?:/|$)'
      order by
        case observation.source_type
          when 'official' then 1 when 'facility_website' then 2
          when 'social_public_url' then 3 when 'public_directory' then 4
          when 'news' then 5 when 'openstreetmap' then 6 else 7 end,
        observation.retrieved_at desc
      limit 1
    ) as primary_source on true
    where candidate.status <> 'duplicate'
    on conflict (origin_candidate_id) where origin_candidate_id is not null do update set
      identity_status = excluded.identity_status,
      registry_visibility = excluded.registry_visibility,
      location_status = excluded.location_status,
      primary_source_label = excluded.primary_source_label,
      primary_source_url = excluded.primary_source_url,
      source_link_status = excluded.source_link_status,
      migration_payload = excluded.migration_payload,
      updated_at = excluded.updated_at
  `);

  await client.query(`
    insert into elepem_core.facility_names (
      facility_id, name, normalized_name, name_type, is_preferred, observation_id
    )
    select facility.id, candidate.normalized_name, candidate.normalized_name,
      'canonical', true, primary_observation.observation_id
    from elepem_core.facilities as facility
    join discovery_private.facility_candidates as candidate
      on candidate.id = facility.origin_candidate_id
    left join lateral (
      select source_link.observation_id
      from discovery_private.facility_candidate_sources as source_link
      where source_link.candidate_id = candidate.id
      order by source_link.linked_at, source_link.observation_id limit 1
    ) as primary_observation on true
    on conflict on constraint facility_names_value_unique do nothing
  `);

  await client.query(`
    insert into elepem_core.facility_addresses (
      facility_id, address_line, normalized_address, locality, department,
      address_type, is_current, observation_id
    )
    select facility.id, candidate.normalized_address, candidate.normalized_address,
      coalesce(nullif(candidate.normalized_locality, ''), 'Sin localidad'),
      coalesce(nullif(candidate.normalized_department, ''), 'Sin departamento'),
      'physical', true, primary_observation.observation_id
    from elepem_core.facilities as facility
    join discovery_private.facility_candidates as candidate
      on candidate.id = facility.origin_candidate_id
    left join lateral (
      select source_link.observation_id
      from discovery_private.facility_candidate_sources as source_link
      where source_link.candidate_id = candidate.id
      order by source_link.linked_at, source_link.observation_id limit 1
    ) as primary_observation on true
    where nullif(trim(candidate.normalized_address), '') is not null
    on conflict on constraint facility_addresses_value_unique do nothing
  `);

  await client.query(`
    insert into elepem_core.facility_geocodes (
      facility_id, address_id, provider, query_original, query_normalized,
      lat, lng, precision, precision_label, checked_at, is_current,
      observation_id
    )
    select facility.id, address.id, 'legacy', candidate.normalized_address,
      candidate.normalized_address, candidate.lat, candidate.lng, 'referencial',
      'Coordenada heredada; pendiente de revision individual',
      candidate.last_seen_at, true, primary_observation.observation_id
    from elepem_core.facilities as facility
    join discovery_private.facility_candidates as candidate
      on candidate.id = facility.origin_candidate_id
    join lateral (
      select address.id
      from elepem_core.facility_addresses as address
      where address.facility_id = facility.id and address.is_current
      order by address.id desc limit 1
    ) as address on true
    left join lateral (
      select source_link.observation_id
      from discovery_private.facility_candidate_sources as source_link
      where source_link.candidate_id = candidate.id
      order by source_link.linked_at, source_link.observation_id limit 1
    ) as primary_observation on true
    where candidate.lat is not null and candidate.lng is not null
    on conflict on constraint facility_geocodes_value_unique do nothing
  `);

  await client.query(`
    insert into elepem_core.facility_observation_links (
      facility_id, observation_id, evidence_role, independence_key,
      linked_by, linked_at
    )
    select facility.id, source_link.observation_id,
      case source_link.evidence_role
        when 'evidence_a' then 'evidence_a'
        when 'evidence_b' then 'evidence_b'
        when 'conflict' then 'conflict'
        when 'duplicate' then 'conflict'
        else 'context'
      end,
      source_link.independence_key,
      coalesce(source_link.linked_by, 'arandu-unified-registry-migration'),
      source_link.linked_at
    from elepem_core.facilities as facility
    join discovery_private.facility_candidate_sources as source_link
      on source_link.candidate_id = facility.origin_candidate_id
    on conflict do nothing
  `);

  await client.query(`
    insert into elepem_core.facility_reviews (
      facility_id, review_type, outcome, evidence_tier,
      reviewer_identifier, review_note, created_at
    )
    select facility.id, 'identity', 'verified', candidate.evidence_tier,
      candidate.reviewed_by,
      format('Migracion trazable desde candidato verificado %s. %s',
        candidate.candidate_key, coalesce(candidate.review_note, 'Sin nota adicional.')),
      candidate.reviewed_at
    from elepem_core.facilities as facility
    join discovery_private.facility_candidates as candidate
      on candidate.id = facility.origin_candidate_id
    where candidate.status = 'verified_new'
      and candidate.human_reviewed
      and candidate.evidence_tier in ('A', 'B')
      and not exists (
        select 1 from elepem_core.facility_reviews as review
        where review.facility_id = facility.id
          and review.review_type = 'identity'
          and review.review_note like format('Migracion trazable desde candidato verificado %s.%%', candidate.candidate_key)
      )
  `);

  await client.query(`
    update discovery_private.facility_candidates as candidate
    set resolved_facility_id = facility.id
    from elepem_core.facilities as facility
    where facility.origin_candidate_id = candidate.id
      and candidate.resolved_facility_id is distinct from facility.id
  `);

  await client.query(`
    update elepem_core.facilities as facility
    set
      primary_source_label = source.source_label,
      primary_source_url = source.source_url,
      source_link_status = case when source.source_url is null then 'pending' else 'verified' end
    from elepem_core.facilities as target
    left join lateral (
      select link.source_label, link.source_url
      from public.arandu_facility_source_links as link
      where link.facility_id = target.id
      order by
        case link.source_label when 'MSP' then 1 when 'MIDES' then 2
          when 'Instagram' then 3 when 'Facebook' then 4 else 5 end,
        link.source_url
      limit 1
    ) as source on true
    where facility.id = target.id
  `);

  await client.query(`
    update elepem_core.facilities as facility
    set
      demo_monthly_price_uyu = case
        when facility.registry_msp_final or facility.registry_mides_social
          then (array[55000,65000,75000,85000,95000,110000])[
            (1 + mod(abs(hashtextextended(facility.facility_key, 0)), 6))::integer
          ]
        else null
      end,
      demo_price_as_of = case
        when facility.registry_msp_final or facility.registry_mides_social then date '2026-08-10'
        else null
      end,
      demo_price_includes = case
        when facility.registry_msp_final or facility.registry_mides_social
          then array['Alojamiento', 'Alimentacion', 'Apoyo cotidiano']::text[]
        else '{}'::text[]
      end
  `);

  for (const [candidateKey, origin] of rawByKey.entries()) {
    const result = await client.query(`
      update elepem_core.facilities as facility
      set migration_payload = coalesce(facility.migration_payload, '{}'::jsonb)
        || jsonb_build_object('manual_json_origin', $2::jsonb)
      from discovery_private.facility_candidates as candidate
      where candidate.id = facility.origin_candidate_id
        and candidate.candidate_key = $1
      returning facility.id
    `, [candidateKey, JSON.stringify({ inputFile: origin.file, dataset: origin.dataset, row: origin.row })]);
    if (!result.rowCount) continue;

    const phoneObservation = await client.query(`
      select source_link.observation_id
      from discovery_private.facility_candidates as candidate
      join discovery_private.facility_candidate_sources as source_link
        on source_link.candidate_id = candidate.id
      where candidate.candidate_key = $1
      order by source_link.linked_at, source_link.observation_id limit 1
    `, [candidateKey]);
    const observationId = phoneObservation.rows[0]?.observation_id ?? null;
    for (const phone of Array.isArray(origin.row.phones) ? origin.row.phones : []) {
      const normalized = String(phone).replace(/\D+/g, "");
      if (!normalized) continue;
      await client.query(`
        insert into elepem_core.facility_contacts (
          facility_id, contact_type, contact_value, normalized_value,
          is_current, observation_id
        ) values ($1, 'phone', $2, $3, true, $4)
        on conflict on constraint facility_contacts_value_unique do nothing
      `, [result.rows[0].id, String(phone).slice(0, 500), normalized.slice(0, 500), observationId]);
    }
  }

  await client.query(`
    insert into elepem_core.audit_log (
      entity_type, entity_key, action, actor_identifier, after_state, request_id
    )
    select 'registry_migration', 'arandu-unified-registry-2026-08-10',
      'unify_operational_facilities', 'arandu-unified-registry-migration',
      jsonb_build_object(
        'automatic_publication', false,
        'official_msp_frozen', 212,
        'official_mides_frozen', 275,
        'legacy_tables_deleted', false
      ), '20260810183000'
    where not exists (
      select 1 from elepem_core.audit_log
      where entity_type = 'registry_migration'
        and entity_key = 'arandu-unified-registry-2026-08-10'
        and request_id = '20260810183000'
    )
  `);
}

function assertFinal(state) {
  const expected = {
    legacy_total: 801,
    legacy_msp: 212,
    legacy_mides: 275,
    candidates: 229,
    resolved_candidates: 229,
    public_registry: 910,
    public_msp: 212,
    public_mides: 275,
    public_unconfirmed: 593,
    location_pending: 83,
    demo_prices: 317,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(state[key]) !== value) {
      throw new Error(`Reconciliacion final fallida: ${key}=${state[key]}, esperado=${value}.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply !== true && args["preflight-only"] !== true && args["backup-only"] !== true) {
    throw new Error("Use --preflight-only, --backup-only o --apply. La escritura remota nunca es el modo predeterminado.");
  }
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef) throw new Error("Falta SUPABASE_PROJECT_REF.");
  if (args.apply === true && required(args, "acknowledge-project") !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }

  const { pilot, rawByKey } = await readManualDocuments();
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    application_name: "arandu-unified-registry-migration",
    connectionTimeoutMillis: 20_000,
  });
  await client.connect();
  const outputDirectory = resolve(PROJECT_ROOT, "data/migration");
  try {
    const before = await collectState(client);
    const existingKeys = new Set((await client.query(
      "select candidate_key from discovery_private.facility_candidates",
    )).rows.map((row) => row.candidate_key));
    const manualMissing = pilot.candidates.filter((candidate) => !existingKeys.has(candidate.candidateKey));
    assertPreflight(before, manualMissing);

    const plan = {
      before,
      manualCandidatesToImport: manualMissing.map((candidate) => ({
        candidateKey: candidate.candidateKey,
        hasCoordinates: candidate.hasCoordinates,
        source: rawByKey.get(candidate.candidateKey)?.file,
      })),
      expected: {
        publicRegistry: 910,
        msp: 212,
        mides: 275,
        unconfirmed: 593,
        heldWithoutLocation: 83,
        demoPrices: 317,
      },
      legacyTablesDeleted: false,
      automaticPublication: false,
    };
    if (args["preflight-only"] === true) {
      console.log(JSON.stringify({ preflightOnly: true, projectRef, plan }, null, 2));
      return;
    }

    await mkdir(outputDirectory, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const backupPath = resolve(outputDirectory, `pre_unified_registry_${uruguayDateStamp()}_${stamp}.json`);
    const reportPath = resolve(outputDirectory, `unified_registry_${uruguayDateStamp()}_${stamp}.json`);
    const backup = await collectBackup(client);
    await writeFile(backupPath, `${JSON.stringify({ projectRef, before, backup }, null, 2)}\n`, { flag: "wx" });
    if (args["backup-only"] === true) {
      console.log(JSON.stringify({ backupOnly: true, projectRef, backupPath, before }, null, 2));
      return;
    }
    if (!before.unified_schema) {
      throw new Error(`La migracion 20260810183000_unify_elepem_registry.sql no esta aplicada. Respaldo creado en ${backupPath}.`);
    }

    await client.query("begin isolation level serializable");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '30s'");
      await client.query(`
        lock table public.residenciales,
          elepem_core.facilities,
          elepem_core.facility_names,
          elepem_core.facility_addresses,
          elepem_core.facility_geocodes,
          elepem_core.facility_observation_links,
          discovery_private.facility_candidates,
          discovery_private.facility_candidate_sources
        in share row exclusive mode
      `);
      assertPreflight(await collectState(client), manualMissing);
      await importMissingManualCandidates(client, manualMissing, rawByKey);
      await synchronizeRegistry(client, rawByKey);
      const after = await collectState(client);
      assertFinal(after);
      await client.query("commit");
      await writeFile(reportPath, `${JSON.stringify({ projectRef, appliedAt: new Date().toISOString(), before, after,
        backupPath, legacyTablesDeleted: false, automaticPublication: false }, null, 2)}\n`, { flag: "wx" });
      console.log(JSON.stringify({ applied: true, projectRef, backupPath, reportPath, after }, null, 2));
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export {
  PRICE_BUCKETS,
  MIDES_URL,
  MSP_URL,
  importMissingManualCandidates,
  sourceLabel,
  sourceType,
  synchronizeRegistry,
};
