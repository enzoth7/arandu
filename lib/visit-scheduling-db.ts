import type { PoolClient } from "pg";
import { newCaseCode } from "./intake-report.mjs";
import {
  nextVisitState,
  type VisitStatus,
} from "./visit-scheduling.mjs";
import { querySupabaseDatabase, withSupabaseTransaction } from "./supabase-db";

export type VisitRecord = {
  id: string;
  facility_id: string;
  facility_key: string;
  facility_name: string;
  facility_locality: string;
  facility_department: string;
  requester_user_id: string;
  status: VisitStatus;
  preferred_start_at: Date | string;
  proposed_start_at: Date | string | null;
  confirmed_start_at: Date | string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  party_size: number;
  practical_note: string | null;
  facility_note: string | null;
  experience_report_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export class VisitWorkflowError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VisitWorkflowError";
  }
}

const VISIT_SELECT = `select visit.id, visit.facility_id::text, facility.codigo as facility_key,
  facility.nombre as facility_name, facility.localidad as facility_locality,
  facility.departamento as facility_department, visit.requester_user_id::text,
  visit.status, visit.preferred_start_at, visit.proposed_start_at, visit.confirmed_start_at,
  visit.contact_name, visit.contact_email, visit.contact_phone, visit.party_size,
  visit.practical_note, visit.facility_note, visit.experience_report_id,
  visit.created_at, visit.updated_at
from public.facility_visits visit
join public.elepem facility on facility.id = visit.facility_id`;

function normalizeVisit(row: VisitRecord) {
  const date = (value: Date | string | null) => value ? new Date(value).toISOString() : null;
  return {
    id: row.id,
    facilityId: Number(row.facility_id),
    facilityKey: row.facility_key,
    facilityName: row.facility_name,
    facilityLocality: row.facility_locality,
    facilityDepartment: row.facility_department,
    requesterUserId: row.requester_user_id,
    status: row.status,
    preferredStartAt: date(row.preferred_start_at),
    proposedStartAt: date(row.proposed_start_at),
    confirmedStartAt: date(row.confirmed_start_at),
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    partySize: row.party_size,
    practicalNote: row.practical_note,
    facilityNote: row.facility_note,
    experienceReportId: row.experience_report_id,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export async function facilityHasVisitAgenda(facilityId: number) {
  const rows = await querySupabaseDatabase<{ available: boolean }>(`select exists (
    select 1 from public.facility_memberships membership
    join public.institutional_accounts account on account.user_id = membership.user_id
    where membership.elepem_id = $1 and membership.status = 'active'
      and account.status = 'active' and account.role = 'facility_representative'
      and (membership.valid_until is null or membership.valid_until > now())
  ) as available`, [facilityId]);
  return rows[0]?.available === true;
}

export async function createVisitRequest(userId: string, input: {
  facilityId: number;
  preferredStartAt: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  partySize: number;
  practicalNote: string | null;
  acknowledgedNotConfirmation: true;
}) {
  return withSupabaseTransaction(async (client) => {
    const available = await client.query<{ available: boolean }>(`select exists (
      select 1 from public.facility_memberships membership
      join public.institutional_accounts account on account.user_id = membership.user_id
      where membership.elepem_id = $1 and membership.status = 'active'
        and account.status = 'active' and account.role = 'facility_representative'
        and (membership.valid_until is null or membership.valid_until > now())
    ) as available`, [input.facilityId]);
    if (!available.rows[0]?.available) {
      throw new VisitWorkflowError(409, "agenda_unavailable", "Este ELEPEM todavía no gestiona visitas desde Arandú.");
    }
    const inserted = await client.query<{ id: string }>(`insert into public.facility_visits (
        facility_id, requester_user_id, preferred_start_at, contact_name, contact_email,
        contact_phone, party_size, practical_note, acknowledged_not_confirmation
      ) values ($1, $2::uuid, $3::timestamptz, $4, $5, $6, $7, $8, true)
      returning id`, [
      input.facilityId, userId, input.preferredStartAt, input.contactName,
      input.contactEmail, input.contactPhone, input.partySize, input.practicalNote,
    ]);
    const visitId = inserted.rows[0]?.id;
    if (!visitId) throw new Error("visit-insert-failed");
    const selected = await client.query<VisitRecord>(`${VISIT_SELECT} where visit.id = $1::uuid`, [visitId]);
    const row = selected.rows[0];
    if (!row) throw new Error("visit-read-after-insert-failed");
    await auditTransition(client, row.id, userId, null, { status: row.status });
    return normalizeVisit(row);
  });
}

export async function listVisitorVisits(userId: string) {
  const rows = await querySupabaseDatabase<VisitRecord>(`${VISIT_SELECT}
    where visit.requester_user_id = $1::uuid
    order by visit.created_at desc`, [userId]);
  return rows.map(normalizeVisit);
}

export async function listRepresentativeVisits(userId: string, facilityIds: readonly number[]) {
  if (facilityIds.length === 0) return [];
  const rows = await querySupabaseDatabase<VisitRecord>(`${VISIT_SELECT}
    where visit.facility_id = any($1::bigint[])
      and exists (
        select 1 from public.facility_memberships membership
        join public.institutional_accounts account on account.user_id = membership.user_id
        where membership.user_id = $2::uuid and membership.elepem_id = visit.facility_id
          and membership.status = 'active' and account.status = 'active'
          and account.role = 'facility_representative'
          and (membership.valid_until is null or membership.valid_until > now())
      )
    order by visit.created_at desc`, [facilityIds, userId]);
  return rows.map(normalizeVisit);
}

async function lockedVisit(client: PoolClient, visitId: string) {
  const result = await client.query<VisitRecord>(`${VISIT_SELECT}
    where visit.id = $1::uuid for update of visit`, [visitId]);
  if (!result.rows[0]) throw new VisitWorkflowError(404, "visit_not_found", "No se encontró la visita.");
  return result.rows[0];
}

async function auditTransition(
  client: PoolClient,
  visitId: string,
  actor: string,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown>,
) {
  await client.query(`insert into elepem_core.audit_log (
    entity_type, entity_key, action, actor_identifier, before_state, after_state
  ) values ('facility_visit', $1, 'status_transition', $2, $3::jsonb, $4::jsonb)`, [
    visitId, actor, beforeState ? JSON.stringify(beforeState) : null, JSON.stringify(afterState),
  ]);
}

async function updateVisitFromTransition(
  client: PoolClient,
  row: VisitRecord,
  actor: string,
  transition: Record<string, unknown> & { status: VisitStatus },
  facilityNote?: string | null,
) {
  const result = await client.query<{ id: string }>(`update public.facility_visits set
      status = $2,
      preferred_start_at = coalesce($3::timestamptz, preferred_start_at),
      proposed_start_at = case when $4::boolean then $5::timestamptz else proposed_start_at end,
      confirmed_start_at = case when $6::boolean then $7::timestamptz else confirmed_start_at end,
      facility_note = coalesce($8, facility_note),
      status_changed_at = now(), updated_at = now()
    where id = $1::uuid and status = $9
    returning id`, [
    row.id,
    transition.status,
    transition.preferredStartAt ?? null,
    Object.hasOwn(transition, "proposedStartAt"),
    transition.proposedStartAt ?? null,
    Object.hasOwn(transition, "confirmedStartAt"),
    transition.confirmedStartAt ?? null,
    facilityNote ?? null,
    row.status,
  ]);
  if (!result.rows[0]) throw new VisitWorkflowError(409, "visit_changed", "La visita cambió mientras se procesaba la acción.");
  const selected = await client.query<VisitRecord>(`${VISIT_SELECT} where visit.id = $1::uuid`, [row.id]);
  const updated = selected.rows[0];
  if (!updated) throw new Error("visit-read-after-update-failed");
  await auditTransition(client, row.id, actor, { status: row.status }, { status: updated.status });
  return normalizeVisit(updated);
}

export async function applyVisitorVisitAction(userId: string, visitId: string, action: {
  action: "accept_proposal" | "request_alternative" | "cancel";
  preferredStartAt?: string;
}) {
  return withSupabaseTransaction(async (client) => {
    const row = await lockedVisit(client, visitId);
    if (row.requester_user_id !== userId) throw new VisitWorkflowError(403, "visit_forbidden", "No tenés permiso sobre esta visita.");
    const transition = nextVisitState(row.status, action.action, {
      actor: "visitor", proposedStartAt: row.proposed_start_at,
      preferredStartAt: action.preferredStartAt,
    });
    if (!transition) throw new VisitWorkflowError(409, "invalid_transition", "Esa acción no corresponde al estado actual de la visita.");
    return updateVisitFromTransition(client, row, userId, transition);
  });
}

export async function applyFacilityVisitAction(userId: string, facilityIds: readonly number[], visitId: string, action: {
  action: "propose" | "confirm" | "cancel" | "complete" | "not_completed";
  startAt?: string;
  facilityNote: string | null;
}) {
  return withSupabaseTransaction(async (client) => {
    const row = await lockedVisit(client, visitId);
    if (!facilityIds.includes(Number(row.facility_id))) throw new VisitWorkflowError(403, "visit_forbidden", "La visita no pertenece a un ELEPEM asignado.");
    const membership = await client.query<{ allowed: boolean }>(`select exists (
      select 1 from public.facility_memberships membership
      join public.institutional_accounts account on account.user_id = membership.user_id
      where membership.user_id = $1::uuid and membership.elepem_id = $2::bigint
        and membership.status = 'active' and account.status = 'active'
        and account.role = 'facility_representative'
        and (membership.valid_until is null or membership.valid_until > now())
    ) as allowed`, [userId, row.facility_id]);
    if (!membership.rows[0]?.allowed) throw new VisitWorkflowError(403, "membership_inactive", "La representación ya no está vigente.");
    const transition = nextVisitState(row.status, action.action, {
      actor: "facility", startAt: action.startAt,
      confirmedStartAt: row.confirmed_start_at, now: Date.now(),
    });
    if (!transition) throw new VisitWorkflowError(409, "invalid_transition", "Esa acción no corresponde al estado o al horario actual.");
    return updateVisitFromTransition(client, row, userId, transition, action.facilityNote);
  });
}

export async function submitVisitExperience(userId: string, visitId: string, payload: Record<string, unknown>) {
  return withSupabaseTransaction(async (client) => {
    const row = await lockedVisit(client, visitId);
    if (row.requester_user_id !== userId) throw new VisitWorkflowError(403, "visit_forbidden", "No tenés permiso sobre esta visita.");
    if (row.status !== "realizada") throw new VisitWorkflowError(409, "visit_not_completed", "La experiencia se habilita después de una visita realizada.");
    if (row.experience_report_id) return { reportId: row.experience_report_id, alreadySubmitted: true };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const caseCode = newCaseCode();
      const inserted = await client.query<{ id: string }>(`insert into public.intake_reports (
        case_code, source, priority, department, report_payload, entry_type, is_demo,
        facility_id, payload_version, submitted_actor, current_status, submitted_by_user_id
      ) values ($1, 'web', 'Baja', $2, $3::jsonb, 'experience', false,
        $4::bigint, 3, 'public', 'received', $5::uuid)
      on conflict (case_code) do nothing returning id`, [
        caseCode, row.facility_department, JSON.stringify(payload), row.facility_id, userId,
      ]);
      const reportId = inserted.rows[0]?.id;
      if (!reportId) continue;
      await client.query(`insert into public.intake_report_events (
        report_id, status, public_title, public_description, event_data, actor
      ) values ($1, 'received', 'Experiencia de visita recibida',
        'La experiencia quedó disponible para moderación institucional.', $2::jsonb, 'system')`, [
        reportId, JSON.stringify({ decision: "visit_experience_received", visitId }),
      ]);
      const linked = await client.query(`update public.facility_visits
        set experience_report_id = $2::uuid, updated_at = now()
        where id = $1::uuid and status = 'realizada' and experience_report_id is null
        returning id`, [visitId, reportId]);
      if (!linked.rows[0]) throw new VisitWorkflowError(409, "experience_changed", "La experiencia ya fue enviada.");
      await auditTransition(client, visitId, userId, { experienceReportId: null }, { experienceReportId: reportId });
      return { reportId, caseCode, alreadySubmitted: false };
    }
    throw new Error("case-code-exhausted");
  });
}
