import { BRIEF_EXPERIENCE_PRIVACY_NOTICE, BRIEF_EXPERIENCE_VERSION } from "./brief-experience.mjs";
import { newCaseCode } from "./intake-report.mjs";
import { querySupabaseDatabase, withSupabaseTransaction } from "./supabase-db";

export type VerifiedPersonalRelationship = {
  facilityId: number | null;
  demoFacilityId: string | null;
  selectionKey: string;
  facilityKey: string;
  facilityName: string;
  locality: string;
  department: string;
  relationshipType: "resident" | "family";
  verifiedAt: string;
  validUntil: string | null;
};

type RelationshipRow = {
  facility_id: string | null;
  demo_facility_id: string | null;
  facility_key: string;
  facility_name: string;
  locality: string;
  department: string;
  relationship_type: "resident" | "family";
  verified_at: Date | string;
  valid_until: Date | string | null;
};

function toRelationship(row: RelationshipRow): VerifiedPersonalRelationship | null {
  const parsedFacilityId = Number(row.facility_id);
  const facilityId = Number.isSafeInteger(parsedFacilityId) && parsedFacilityId > 0 ? parsedFacilityId : null;
  if (Boolean(facilityId) === Boolean(row.demo_facility_id)) return null;
  return {
    facilityId,
    demoFacilityId: row.demo_facility_id,
    selectionKey: row.demo_facility_id || String(facilityId),
    facilityKey: row.facility_key,
    facilityName: row.facility_name,
    locality: row.locality,
    department: row.department,
    relationshipType: row.relationship_type,
    verifiedAt: new Date(row.verified_at).toISOString(),
    validUntil: row.valid_until ? new Date(row.valid_until).toISOString() : null,
  };
}

export async function loadVerifiedPersonalRelationships(userId: string) {
  const rows = await querySupabaseDatabase<RelationshipRow>(`
    select relationship.elepem_id::text as facility_id, relationship.demo_facility_id,
           coalesce(facility.codigo, demo.id) as facility_key,
           coalesce(facility.nombre, demo.name) as facility_name,
           coalesce(facility.localidad, demo.locality) as locality,
           coalesce(facility.departamento, demo.department) as department,
           relationship.relationship_type, relationship.verified_at, relationship.valid_until
    from public.user_facility_relationships relationship
    left join public.elepem facility on facility.id = relationship.elepem_id
    left join arandu_demo.facilities demo on demo.id = relationship.demo_facility_id and demo.active and demo.is_test
    where relationship.user_id = $1::uuid
      and relationship.status = 'verified'
      and (relationship.valid_until is null or relationship.valid_until > now())
    order by facility.nombre, facility.id
  `, [userId]);
  return rows.map(toRelationship).filter((value): value is VerifiedPersonalRelationship => Boolean(value));
}

export async function insertBriefExperience(input: {
  userId: string;
  facilityId: number | null;
  demoFacilityId: string | null;
  answers: Array<{ sectionId: string; rating: string | null; reasonIds: string[]; skipped: boolean }>;
  comment: string | null;
  publicationConsent: boolean;
  sendToFacility: boolean;
  shareContactWithFacility: boolean;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const caseCode = newCaseCode();
    const result = await withSupabaseTransaction(async (client) => {
      const relationshipRows = await client.query<RelationshipRow>(`
        select relationship.elepem_id::text as facility_id, relationship.demo_facility_id,
               coalesce(facility.codigo, demo.id) as facility_key,
               coalesce(facility.nombre, demo.name) as facility_name,
               coalesce(facility.localidad, demo.locality) as locality,
               coalesce(facility.departamento, demo.department) as department,
               relationship.relationship_type, relationship.verified_at, relationship.valid_until
        from public.user_facility_relationships relationship
        left join public.elepem facility on facility.id = relationship.elepem_id
        left join arandu_demo.facilities demo on demo.id = relationship.demo_facility_id and demo.active and demo.is_test
        where relationship.user_id = $1::uuid
          and relationship.elepem_id is not distinct from $2::bigint
          and relationship.demo_facility_id is not distinct from $3::text
          and relationship.status = 'verified'
          and (relationship.valid_until is null or relationship.valid_until > now())
        for share of relationship
      `, [input.userId, input.facilityId, input.demoFacilityId]);
      const relationship = relationshipRows.rows[0];
      if (!relationship) throw new Error("verified-relationship-required");

      const requestedDestination = input.publicationConsent ? "consider_anonymized" : "private_review";
      const payload = {
        version: BRIEF_EXPERIENCE_VERSION,
        experienceKind: "residential",
        privacyNoticeVersion: BRIEF_EXPERIENCE_PRIVACY_NOTICE,
        submittedAt: new Date().toISOString(),
        facilityId: relationship.facility_key,
        relationshipSnapshot: {
          type: relationship.relationship_type,
          verifiedAt: new Date(relationship.verified_at).toISOString(),
          validUntil: relationship.valid_until ? new Date(relationship.valid_until).toISOString() : null,
        },
        answers: input.answers,
        comment: input.comment,
        requestedDestination,
        publicationConsent: input.publicationConsent,
        futureAuthorizations: {
          sendToFacility: input.sendToFacility,
          shareContactWithFacility: input.shareContactWithFacility,
        },
        publication: "never_automatic",
      };
      const inserted = await client.query<{ id: string }>(`
        insert into public.intake_reports (
          case_code, source, priority, department, report_payload, entry_type, is_demo,
          demo_facility_id, facility_id, payload_version, submitted_actor, current_status, submitted_by_user_id
        ) values ($1, 'web', 'Baja', $2, $3::jsonb, 'experience', $4, $5, $6, 6, 'public', 'received', $7::uuid)
        on conflict (case_code) do nothing returning id
      `, [caseCode, relationship.department, JSON.stringify(payload), Boolean(input.demoFacilityId), input.demoFacilityId, input.facilityId, input.userId]);
      const reportId = inserted.rows[0]?.id;
      if (!reportId) return null;
      await client.query(`
        insert into public.intake_report_events (
          report_id, status, public_title, public_description, event_data, actor
        ) values ($1, 'received', 'Experiencia recibida',
          'La experiencia quedó en revisión privada y no se publicó automáticamente.',
          $2::jsonb, 'system')
      `, [reportId, JSON.stringify({ version: BRIEF_EXPERIENCE_VERSION, relationshipType: relationship.relationship_type })]);
      return { reportId, relationshipType: relationship.relationship_type };
    });
    if (result) return { ...result, caseCode };
  }
  throw new Error("case-code-exhausted");
}
