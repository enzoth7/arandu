import type { PoolClient } from "pg";
import type { InstitutionalRole } from "./institutional-types";
import { querySupabaseDatabase, withSupabaseTransaction } from "./supabase-db";

export type FacilityOption = { id: number; name: string; locality: string; department: string };
export type RelationshipKind = "resident" | "family";
export type RelationshipStatus = "pending" | "verified" | "expired" | "disputed" | "rejected" | "revoked";

export class RoleWorkflowError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = "RoleWorkflowError";
  }
}

const iso = (value: Date | string | null) => value ? new Date(value).toISOString() : null;

async function audit(client: PoolClient, input: {
  entityType: string; entityKey: string; action: string; actor: string;
  before: Record<string, unknown> | null; after: Record<string, unknown>;
}) {
  await client.query(`insert into elepem_core.audit_log
    (entity_type, entity_key, action, actor_identifier, before_state, after_state)
    values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`, [
    input.entityType, input.entityKey, input.action, input.actor,
    input.before ? JSON.stringify(input.before) : null, JSON.stringify(input.after),
  ]);
}

export async function listFacilityOptions(): Promise<FacilityOption[]> {
  const rows = await querySupabaseDatabase<{ id: string; name: string; locality: string; department: string }>(`
    select id::text, nombre as name, coalesce(localidad, '') as locality,
           coalesce(departamento, '') as department
    from public.elepem order by nombre, id`);
  return rows.map((row) => ({ ...row, id: Number(row.id) })).filter((row) => Number.isSafeInteger(row.id));
}

type RelationshipRow = {
  id: string; user_id: string; email?: string; first_name?: string | null; last_name?: string | null;
  elepem_id: string | null; demo_facility_id: string | null;
  facility_name: string; locality: string; department: string; relationship_type: RelationshipKind;
  status: RelationshipStatus; requested_at: Date | string; verified_at: Date | string | null;
  valid_until: Date | string | null; assigned_verifier_id: string | null;
};

function relationshipDto(row: RelationshipRow) {
  return {
    id: row.id, userId: row.user_id, email: row.email || null,
    firstName: row.first_name || null, lastName: row.last_name || null,
    fullName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
    facilityId: row.elepem_id ? Number(row.elepem_id) : null,
    demoFacilityId: row.demo_facility_id, facilityName: row.facility_name,
    locality: row.locality, department: row.department,
    relationshipType: row.relationship_type, status: row.status,
    requestedAt: iso(row.requested_at), verifiedAt: iso(row.verified_at), validUntil: iso(row.valid_until),
    assignedVerifierId: row.assigned_verifier_id,
  };
}

const RELATIONSHIP_SELECT = `select relationship.id, relationship.user_id::text,
  coalesce(relationship.first_name, profile.first_name) as first_name,
  coalesce(relationship.last_name, profile.last_name) as last_name,
  relationship.elepem_id::text, relationship.demo_facility_id,
  coalesce(facility.nombre, demo.name) as facility_name,
  coalesce(facility.localidad, demo.locality, '') as locality,
  coalesce(facility.departamento, demo.department, '') as department,
  relationship.relationship_type, relationship.status, relationship.requested_at,
  relationship.verified_at, relationship.valid_until, relationship.assigned_verifier_id::text
from public.user_facility_relationships relationship
left join public.user_profiles profile on profile.user_id = relationship.user_id
left join public.elepem facility on facility.id = relationship.elepem_id
left join arandu_demo.facilities demo on demo.id = relationship.demo_facility_id`;

export async function listOwnRelationshipRequests(userId: string) {
  const rows = await querySupabaseDatabase<RelationshipRow>(`${RELATIONSHIP_SELECT}
    where relationship.user_id = $1::uuid order by relationship.requested_at desc`, [userId]);
  return rows.map(relationshipDto);
}

export async function requestRelationship(userId: string, facilityId: number, relationshipType: RelationshipKind) {
  return withSupabaseTransaction(async (client) => {
    const facility = await client.query<{ name: string }>("select nombre as name from public.elepem where id = $1", [facilityId]);
    if (!facility.rows[0]) throw new RoleWorkflowError(404, "No se encontró el ELEPEM.");
    const prior = await client.query<{ id: string; status: RelationshipStatus }>(`select id, status
      from public.user_facility_relationships where user_id = $1::uuid and elepem_id = $2 for update`, [userId, facilityId]);
    if (prior.rows[0]?.status === "verified") throw new RoleWorkflowError(409, "Ya tenés un vínculo verificado con este ELEPEM.");
    if (prior.rows[0]?.status === "pending") return { id: prior.rows[0].id, status: "pending" as const, idempotent: true };

    const profileRes = await client.query<{ first_name: string; last_name: string }>(
      "select first_name, last_name from public.user_profiles where user_id = $1::uuid",
      [userId]
    );
    const firstName = profileRes.rows[0]?.first_name || null;
    const lastName = profileRes.rows[0]?.last_name || null;

    const result = prior.rows[0]
      ? await client.query<{ id: string }>(`update public.user_facility_relationships set relationship_type = $3,
          first_name = coalesce($4, first_name), last_name = coalesce($5, last_name),
          status = 'pending', requested_at = now(), reviewed_at = null, assigned_verifier_id = null,
          verified_at = null, verified_by = null, valid_until = null, updated_at = now()
        where id = $1 and user_id = $2::uuid returning id`, [prior.rows[0].id, userId, relationshipType, firstName, lastName])
      : await client.query<{ id: string }>(`insert into public.user_facility_relationships
          (user_id, elepem_id, relationship_type, status, first_name, last_name)
        values ($1::uuid, $2, $3, 'pending', $4, $5) returning id`, [userId, facilityId, relationshipType, firstName, lastName]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("relationship-request-write-failed");
    await audit(client, { entityType: "facility_relationship", entityKey: id, action: "requested", actor: userId,
      before: prior.rows[0] || null, after: { status: "pending", facilityId, relationshipType } });
    return { id, status: "pending" as const, idempotent: false };
  });
}


export async function listVerificationRequests() {
  const rows = await querySupabaseDatabase<RelationshipRow>(`select base.*, auth_user.email
    from (${RELATIONSHIP_SELECT}) base
    join auth.users auth_user on auth_user.id = base.user_id::uuid
    where base.status <> 'verified' or base.valid_until is null or base.valid_until > now()
    order by case base.status when 'pending' then 0 when 'disputed' then 1 else 2 end, base.requested_at`, []);
  return rows.map(relationshipDto);
}

export async function decideRelationship(input: {
  actorId: string; relationshipId: string; action: "approve" | "reject" | "dispute" | "revoke";
}) {
  return withSupabaseTransaction(async (client) => {
    const row = await client.query<{ id: string; status: RelationshipStatus }>(`select id, status
      from public.user_facility_relationships where id = $1::uuid for update`, [input.relationshipId]);
    if (!row.rows[0]) throw new RoleWorkflowError(404, "No se encontró la solicitud.");
    const next: RelationshipStatus = input.action === "approve" ? "verified"
      : input.action === "reject" ? "rejected" : input.action === "dispute" ? "disputed" : "revoked";
    if (row.rows[0].status === next) return { status: next, idempotent: true };
    if (input.action === "approve" && row.rows[0].status !== "pending") throw new RoleWorkflowError(409, "Solo se puede aprobar una solicitud pendiente.");
    if (input.action === "reject" && row.rows[0].status !== "pending") throw new RoleWorkflowError(409, "Solo se puede rechazar una solicitud pendiente.");
    if (["dispute", "revoke"].includes(input.action) && row.rows[0].status !== "verified") throw new RoleWorkflowError(409, "Solo se puede revisar o revocar un vínculo verificado.");
    await client.query(`update public.user_facility_relationships set status = $2,
      assigned_verifier_id = coalesce(assigned_verifier_id, $3::uuid), reviewed_at = now(),
      verified_at = case when $2 = 'verified' then now() else verified_at end,
      verified_by = case when $2 = 'verified' then $3::uuid else verified_by end,
      updated_at = now() where id = $1::uuid`, [input.relationshipId, next, input.actorId]);
    await audit(client, { entityType: "facility_relationship", entityKey: input.relationshipId,
      action: `verification_${input.action}`, actor: input.actorId,
      before: { status: row.rows[0].status }, after: { status: next } });
    return { status: next, idempotent: false };
  });
}

type MembershipRow = { user_id: string; email: string; elepem_id: string; facility_name: string; status: string; requested_at: Date | string; reviewed_at: Date | string | null };
export async function listOwnRepresentationClaims(userId: string) {
  const rows = await querySupabaseDatabase<MembershipRow>(`select membership.user_id::text, auth_user.email,
    membership.elepem_id::text, facility.nombre as facility_name, membership.status,
    membership.requested_at, membership.reviewed_at
    from public.facility_memberships membership join public.elepem facility on facility.id = membership.elepem_id
    join auth.users auth_user on auth_user.id = membership.user_id
    where membership.user_id = $1::uuid order by membership.requested_at desc`, [userId]);
  return rows.map((row) => ({ ...row, facilityId: Number(row.elepem_id), requestedAt: iso(row.requested_at), reviewedAt: iso(row.reviewed_at) }));
}

export async function requestRepresentation(userId: string, facilityId: number) {
  return withSupabaseTransaction(async (client) => {
    const facility = await client.query("select 1 from public.elepem where id = $1", [facilityId]);
    if (!facility.rows[0]) throw new RoleWorkflowError(404, "No se encontró el ELEPEM.");
    const account = await client.query<{ role: InstitutionalRole }>(`select role from public.institutional_accounts
      where user_id = $1::uuid for update`, [userId]);
    if (account.rows[0] && account.rows[0].role !== "facility_representative") {
      throw new RoleWorkflowError(409, "Tu cuenta ya cumple otra función institucional.");
    }
    if (!account.rows[0]) await client.query(`insert into public.institutional_accounts (user_id, role, status)
      values ($1::uuid, 'facility_representative', 'active')`, [userId]);
    const prior = await client.query<{ status: string }>(`select status from public.facility_memberships
      where user_id = $1::uuid and elepem_id = $2 for update`, [userId, facilityId]);
    if (prior.rows[0]?.status === "active") throw new RoleWorkflowError(409, "Ya representás este ELEPEM.");
    if (prior.rows[0]?.status === "pending") return { status: "pending" as const, idempotent: true };
    if (prior.rows[0]) await client.query(`update public.facility_memberships set status = 'pending', requested_at = now(),
      reviewed_at = null, verified_at = null, verified_by = null, valid_until = null, updated_at = now()
      where user_id = $1::uuid and elepem_id = $2`, [userId, facilityId]);
    else await client.query(`insert into public.facility_memberships (user_id, elepem_id, status)
      values ($1::uuid, $2, 'pending')`, [userId, facilityId]);
    await audit(client, { entityType: "facility_membership", entityKey: `${userId}:${facilityId}`,
      action: "representation_requested", actor: userId, before: prior.rows[0] || null,
      after: { status: "pending", facilityId } });
    return { status: "pending" as const, idempotent: false };
  });
}

export async function listRepresentationClaims() {
  const rows = await querySupabaseDatabase<MembershipRow>(`select membership.user_id::text, auth_user.email,
    membership.elepem_id::text, facility.nombre as facility_name, membership.status,
    membership.requested_at, membership.reviewed_at
    from public.facility_memberships membership join public.elepem facility on facility.id = membership.elepem_id
    join auth.users auth_user on auth_user.id = membership.user_id
    order by case membership.status when 'pending' then 0 else 1 end, membership.requested_at desc`);
  return rows.map((row) => ({ ...row, facilityId: Number(row.elepem_id), requestedAt: iso(row.requested_at), reviewedAt: iso(row.reviewed_at) }));
}

export async function decideRepresentation(input: { actorId: string; userId: string; facilityId: number; action: "approve" | "reject" | "suspend" | "revoke" }) {
  return withSupabaseTransaction(async (client) => {
    const row = await client.query<{ status: string }>(`select status from public.facility_memberships
      where user_id = $1::uuid and elepem_id = $2 for update`, [input.userId, input.facilityId]);
    if (!row.rows[0]) throw new RoleWorkflowError(404, "No se encontró la solicitud de representación.");
    const next = { approve: "active", reject: "rejected", suspend: "suspended", revoke: "revoked" }[input.action];
    if (row.rows[0].status === next) return { status: next, idempotent: true };
    if (input.action === "approve" && !["pending", "suspended"].includes(row.rows[0].status)) throw new RoleWorkflowError(409, "Solo se puede aprobar una solicitud pendiente o reactivar una representación suspendida.");
    if (input.action === "reject" && row.rows[0].status !== "pending") throw new RoleWorkflowError(409, "Solo se puede rechazar una solicitud pendiente.");
    if (["suspend", "revoke"].includes(input.action) && !["active", "suspended"].includes(row.rows[0].status)) throw new RoleWorkflowError(409, "Solo se puede suspender o revocar una representación aprobada.");
    await client.query(`update public.facility_memberships set status = $3, reviewed_at = now(),
      verified_at = case when $3 = 'active' then coalesce(verified_at, now()) else verified_at end,
      verified_by = case when $3 = 'active' then coalesce(verified_by, $4::uuid) else verified_by end,
      updated_at = now()
      where user_id = $1::uuid and elepem_id = $2`, [input.userId, input.facilityId, next, input.actorId]);
    await audit(client, { entityType: "facility_membership", entityKey: `${input.userId}:${input.facilityId}`,
      action: `representation_${input.action}`, actor: input.actorId,
      before: { status: row.rows[0].status }, after: { status: next } });
    return { status: next };
  });
}

export async function listInstitutionalAccounts() {
  return querySupabaseDatabase<{ userId: string; email: string; role: InstitutionalRole; status: string }>(`
    select account.user_id::text as "userId", auth_user.email, account.role, account.status
    from public.institutional_accounts account join auth.users auth_user on auth_user.id = account.user_id
    order by auth_user.email`);
}

export async function updateInstitutionalAccount(input: { actorId: string; userId: string; role?: InstitutionalRole; status?: "active" | "suspended" | "revoked" }) {
  if (input.actorId === input.userId && input.status && input.status !== "active") throw new RoleWorkflowError(409, "No podés suspender tu propia cuenta administradora.");
  return withSupabaseTransaction(async (client) => {
    const prior = await client.query<{ role: InstitutionalRole; status: string }>(`select role, status from public.institutional_accounts
      where user_id = $1::uuid for update`, [input.userId]);
    if (!prior.rows[0]) throw new RoleWorkflowError(404, "La cuenta todavía no tiene una función institucional.");
    const next = { role: input.role || prior.rows[0].role, status: input.status || prior.rows[0].status };
    await client.query(`update public.institutional_accounts set role = $2, status = $3, updated_at = now()
      where user_id = $1::uuid`, [input.userId, next.role, next.status]);
    await audit(client, { entityType: "institutional_account", entityKey: input.userId,
      action: "institutional_access_updated", actor: input.actorId, before: prior.rows[0], after: next });
    return next;
  });
}

export async function assignInstitutionalRoleByEmail(input: {
  actorId: string;
  email: string;
  role: Exclude<InstitutionalRole, "facility_representative">;
}) {
  return withSupabaseTransaction(async (client) => {
    const user = await client.query<{ id: string; email: string }>(`select id::text, email
      from auth.users where lower(email) = lower($1) limit 1`, [input.email.trim()]);
    if (!user.rows[0]) throw new RoleWorkflowError(404, "No existe una cuenta personal con ese correo.");
    const prior = await client.query<{ role: InstitutionalRole; status: string }>(`select role, status
      from public.institutional_accounts where user_id = $1::uuid for update`, [user.rows[0].id]);
    if (prior.rows[0]) throw new RoleWorkflowError(409, "La cuenta ya tiene una función institucional. Podés editarla en la lista.");
    await client.query(`insert into public.institutional_accounts (user_id, role, status)
      values ($1::uuid, $2, 'active')`, [user.rows[0].id, input.role]);
    await audit(client, { entityType: "institutional_account", entityKey: user.rows[0].id,
      action: "institutional_role_assigned", actor: input.actorId, before: null,
      after: { role: input.role, status: "active" } });
    return { userId: user.rows[0].id, email: user.rows[0].email, role: input.role, status: "active" as const };
  });
}
