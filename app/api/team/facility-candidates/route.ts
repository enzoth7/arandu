import { NextRequest, NextResponse } from "next/server";
import {
  candidateSuggestionSql,
  readElepemDataSource,
  runtimeElepemDataSource,
} from "../../../../lib/elepem-data-source.mjs";
import { validateCandidateReviewInput } from "../../../../lib/facility-candidate-review.mjs";
import { querySupabaseDatabase, withSupabaseTransaction } from "../../../../lib/supabase-db";
import { hasSameOrigin } from "../../../../lib/institutional-session.mjs";
import { teamSessionOrUnauthorized } from "../../../../lib/team-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANDIDATE_STATUSES = new Set([
  "discovered",
  "possible_match",
  "needs_review",
  "verified_new",
  "verified_match",
  "rejected",
  "duplicate",
  "closed",
]);
const SOURCE_TYPES = new Set([
  "official",
  "openstreetmap",
  "public_directory",
  "facility_website",
  "news",
  "social_public_url",
  "manual_referral",
  "other",
]);

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function filterText(value: string | null, maximum: number) {
  const result = value?.trim() || "";
  return result.slice(0, maximum);
}

function buildCandidateQuery(
  request: NextRequest,
  dataSource: ReturnType<typeof readElepemDataSource>,
) {
  const values: unknown[] = [];
  const where = ["true"];
  const parameter = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const department = filterText(request.nextUrl.searchParams.get("department"), 100);
  const locality = filterText(request.nextUrl.searchParams.get("locality"), 160);
  const source = filterText(request.nextUrl.searchParams.get("source"), 80);
  const status = filterText(request.nextUrl.searchParams.get("status"), 40);
  const evidenceTier = filterText(request.nextUrl.searchParams.get("evidenceTier"), 1);

  if (department) where.push(`candidate.normalized_department = ${parameter(department)}`);
  if (locality) where.push(`candidate.normalized_locality = ${parameter(locality)}`);
  if (status && CANDIDATE_STATUSES.has(status)) {
    where.push(`candidate.status = ${parameter(status)}`);
  }
  if (evidenceTier && ["A", "B", "C"].includes(evidenceTier)) {
    where.push(`candidate.evidence_tier = ${parameter(evidenceTier)}`);
  }
  if (source && SOURCE_TYPES.has(source)) {
    where.push(`exists (
      select 1
      from discovery_private.facility_candidate_sources as source_link
      join discovery_private.facility_source_observations as source_observation
        on source_observation.id = source_link.observation_id
      where source_link.candidate_id = candidate.id
        and source_observation.source_type = ${parameter(source)}
    )`);
  }

  return {
    values,
    sql: `
      select
        candidate.id::text,
        candidate.candidate_key,
        candidate.status,
        candidate.normalized_name as name,
        candidate.normalized_department as department,
        candidate.normalized_locality as locality,
        candidate.normalized_address as address,
        candidate.lat as latitude,
        candidate.lng as longitude,
        candidate.best_match_residencial_id,
        candidate.best_match_score,
        candidate.evidence_tier,
        candidate.human_reviewed,
        candidate.reviewed_at,
        candidate.reviewed_by,
        candidate.review_note,
        candidate.public_eligible,
        candidate.first_seen_at,
        candidate.last_seen_at,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'sourceType', observation.source_type,
              'sourceRecordKey', observation.source_record_key,
              'sourceUrl', observation.source_url,
              'retrievedAt', observation.retrieved_at,
              'sourceDate', observation.source_date,
              'sourceLicense', observation.source_license,
              'observedName', observation.normalized_name,
              'observedAddress', observation.normalized_address,
              'evidenceRole', candidate_source.evidence_role
            ) order by observation.retrieved_at desc, observation.id desc
          )
          from discovery_private.facility_candidate_sources as candidate_source
          join discovery_private.facility_source_observations as observation
            on observation.id = candidate_source.observation_id
          where candidate_source.candidate_id = candidate.id
        ), '[]'::jsonb) as sources,
        coalesce((
          ${candidateSuggestionSql(dataSource)}
        ), '[]'::jsonb) as suggestions,
        coalesce((
          select jsonb_agg(to_jsonb(recent_event) order by recent_event.created_at desc)
          from (
            select
              event.id::text,
              event.action,
              event.previous_status,
              event.new_status,
              event.previous_evidence_tier,
              event.new_evidence_tier,
              event.matched_residencial_id,
              event.reviewer_identifier,
              event.review_note,
              event.corrections,
              event.created_at
            from discovery_private.facility_candidate_review_events as event
            where event.candidate_id = candidate.id
            order by event.created_at desc, event.id desc
            limit 20
          ) as recent_event
        ), '[]'::jsonb) as review_events
      from discovery_private.facility_candidates as candidate
      where ${where.join(" and ")}
      order by
        case candidate.status
          when 'needs_review' then 1
          when 'possible_match' then 2
          when 'discovered' then 3
          else 4
        end,
        candidate.updated_at desc,
        candidate.id
    `,
  };
}

export async function GET(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;
  try {
    const dataSource = runtimeElepemDataSource();
    const query = buildCandidateQuery(request, dataSource);
    const candidates = await querySupabaseDatabase(query.sql, query.values);
    return NextResponse.json(
      { candidates, reviewer: session.reviewer },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-ELEPEM-Data-Source": dataSource,
        },
      },
    );
  } catch (error) {
    console.error("Private facility candidate queue fetch failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo cargar la cola privada." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;
  if (!hasSameOrigin(request.url, request.headers.get("origin"))) {
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 });
  }

  let input;
  try {
    input = validateCandidateReviewInput(rawBody);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "La revisión no es válida." },
      { status: 400 },
    );
  }

  try {
    const dataSource = runtimeElepemDataSource();
    const updated = await withSupabaseTransaction(async (client) => {
      const currentResult = await client.query(
        `select *
         from discovery_private.facility_candidates
         where id = $1::bigint
         for update`,
        [input.candidateId],
      );
      const current = currentResult.rows[0];
      if (!current) throw new ApiError("No se encontró el candidato.", 404);

      let resolvedFacilityId: string | null = null;
      let legacyResidencialId: string | null = null;
      if (input.matchedResidencialId) {
        if (dataSource === "normalized") {
          const match = await client.query(
            `select
               facility.facility_id::text,
               mapping.legacy_residencial_id
             from public.facilities_current_internal as facility
             left join lateral (
               select legacy.legacy_residencial_id
               from elepem_core.legacy_facility_map as legacy
               where legacy.facility_id = facility.facility_id
                 and legacy.mapping_status = 'mapped'
               order by legacy.legacy_residencial_id
               limit 1
             ) as mapping on true
             where facility.facility_key = $1
             limit 1`,
            [input.matchedResidencialId],
          );
          if (!match.rows[0]) throw new ApiError("La sede normalizada vinculada no existe.", 400);
          resolvedFacilityId = match.rows[0].facility_id;
          legacyResidencialId = match.rows[0].legacy_residencial_id ?? null;
        } else {
          const match = await client.query(
            `select id
             from ${dataSource === "compatibility"
               ? "public.residenciales_legacy_compat"
               : "public.residenciales"}
             where id = $1
             limit 1`,
            [input.matchedResidencialId],
          );
          if (!match.rows[0]) throw new ApiError("El residencial vinculado no existe.", 400);
          legacyResidencialId = match.rows[0].id;
        }
      }

      if (input.action === "verified_new" || input.action === "verified_match") {
        const evidence = await client.query(
          `select
             bool_or(
               candidate_source.evidence_role = 'evidence_a'
               and observation.source_type = 'official'
             ) as has_a,
             count(distinct candidate_source.independence_key) filter (
               where candidate_source.evidence_role = 'evidence_b'
                 and candidate_source.independence_key is not null
                 and observation.source_type <> 'social_public_url'
             ) >= 2 as has_b
           from discovery_private.facility_candidate_sources as candidate_source
           join discovery_private.facility_source_observations as observation
             on observation.id = candidate_source.observation_id
           where candidate_source.candidate_id = $1::bigint`,
          [input.candidateId],
        );
        const supported = input.evidenceTier === "A"
          ? evidence.rows[0]?.has_a === true
          : evidence.rows[0]?.has_b === true;
        if (!supported) {
          throw new ApiError(
            `El candidato no tiene fuentes enlazadas que sostengan evidencia ${input.evidenceTier}.`,
            400,
          );
        }
      }

      const correctedName = input.corrections.name ?? current.normalized_name;
      const correctedAddress = input.corrections.address ?? current.normalized_address;
      const correctedLatitude = input.corrections.latitude ?? current.lat;
      const correctedLongitude = input.corrections.longitude ?? current.lng;
      const matchedResidencialId = input.action === "verified_new"
        ? null
        : legacyResidencialId ?? current.best_match_residencial_id;
      const matchedFacilityId = input.action === "verified_new"
        ? null
        : resolvedFacilityId ?? current.resolved_facility_id ?? null;

      const result = dataSource === "normalized"
        ? await client.query(
          `update discovery_private.facility_candidates
           set
             status = $2,
             normalized_name = $3,
             normalized_address = $4,
             lat = $5,
             lng = $6,
             best_match_residencial_id = $7,
             resolved_facility_id = $8::bigint,
             evidence_tier = $9,
             human_reviewed = true,
             reviewed_at = now(),
             reviewed_by = $10,
             review_note = $11,
             public_eligible = false,
             updated_at = now()
           where id = $1::bigint
           returning *`,
          [
            input.candidateId,
            input.status,
            correctedName,
            correctedAddress,
            correctedLatitude,
            correctedLongitude,
            matchedResidencialId,
            matchedFacilityId,
            input.evidenceTier,
            session.reviewer,
            input.reviewNote,
          ],
        )
        : await client.query(
          `update discovery_private.facility_candidates
           set
             status = $2,
             normalized_name = $3,
             normalized_address = $4,
             lat = $5,
             lng = $6,
             best_match_residencial_id = $7,
             evidence_tier = $8,
             human_reviewed = true,
             reviewed_at = now(),
             reviewed_by = $9,
             review_note = $10,
             public_eligible = false,
             updated_at = now()
           where id = $1::bigint
           returning *`,
          [
            input.candidateId,
            input.status,
            correctedName,
            correctedAddress,
            correctedLatitude,
            correctedLongitude,
            matchedResidencialId,
            input.evidenceTier,
            session.reviewer,
            input.reviewNote,
          ],
        );
      const candidateAfter = result.rows[0];
      const reviewValues = [
        input.candidateId,
        input.action,
        current.status,
        candidateAfter.status,
        current.evidence_tier,
        candidateAfter.evidence_tier,
        matchedResidencialId,
        session.reviewer,
        input.reviewNote,
        JSON.stringify(input.corrections),
        JSON.stringify(current),
        JSON.stringify(candidateAfter),
      ];
      if (dataSource === "normalized") {
        await client.query(
          `insert into discovery_private.facility_candidate_review_events (
             candidate_id, action, previous_status, new_status,
             previous_evidence_tier, new_evidence_tier, matched_residencial_id,
             reviewer_identifier, review_note, corrections, candidate_before,
             candidate_after, matched_facility_id
           ) values (
             $1::bigint, $2, $3, $4, $5, $6, $7, $8, $9,
             $10::jsonb, $11::jsonb, $12::jsonb, $13::bigint
           )`,
          [...reviewValues, matchedFacilityId],
        );
      } else {
        await client.query(
          `insert into discovery_private.facility_candidate_review_events (
             candidate_id, action, previous_status, new_status,
             previous_evidence_tier, new_evidence_tier, matched_residencial_id,
             reviewer_identifier, review_note, corrections, candidate_before,
             candidate_after
           ) values (
             $1::bigint, $2, $3, $4, $5, $6, $7, $8, $9,
             $10::jsonb, $11::jsonb, $12::jsonb
           )`,
          reviewValues,
        );
      }
      return candidateAfter;
    });

    return NextResponse.json(
      {
        candidate: updated,
        auditLogged: true,
        publicResidencialesWrites: 0,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Private facility candidate review failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo guardar la revisión." },
      { status: 502 },
    );
  }
}
