import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "./supabase/server";
import { querySupabaseDatabase } from "./supabase-db";
import type { InstitutionalRole } from "./institutional-types";
import { readTemporaryAdminSession, TEMPORARY_ADMIN_COOKIE } from "./temporary-demo-auth";

const ROLE_HOME: Record<InstitutionalRole, string> = {
  administrator: "/equipo/admin",
  verifier: "/equipo/verificaciones",
  moderator: "/equipo/moderacion",
  support: "/cuenta",
  facility_representative: "/institucional/elepem",
};

export function institutionalHome(role: InstitutionalRole) {
  return ROLE_HOME[role];
}

export function canUseInstitutionalRole(current: InstitutionalRole, required: InstitutionalRole) {
  return current === "administrator" || current === required;
}

export type InstitutionalSession = {
  userId: string;
  identity: string;
  email: string;
  role: InstitutionalRole;
  status: "active";
  facilityIds: number[];
};

export type AccountSession = {
  userId: string;
  email: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  institutional: InstitutionalSession | null;
};

async function validatedAccountSession(): Promise<AccountSession | null> {
  const cookieStore = await cookies();
  const temporaryAdmin = readTemporaryAdminSession(cookieStore.get(TEMPORARY_ADMIN_COOKIE)?.value);
  if (temporaryAdmin) return {
    userId: `temporary:${temporaryAdmin.username}`,
    email: temporaryAdmin.username,
    termsAccepted: true,
    institutional: { userId: `temporary:${temporaryAdmin.username}`, identity: temporaryAdmin.username,
      email: temporaryAdmin.username, role: "administrator", status: "active", facilityIds: [] },
  };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const termsAcceptedAt = typeof data.user.user_metadata?.terms_accepted_at === "string"
    ? data.user.user_metadata.terms_accepted_at
    : undefined;
  const termsAccepted = Boolean(termsAcceptedAt);
  const rows = await querySupabaseDatabase<{
    role: InstitutionalRole;
    status: "active" | "suspended" | "revoked";
    facility_ids: string[];
  }>(`SELECT account.role, account.status,
       COALESCE(array_agg(membership.elepem_id::text ORDER BY membership.elepem_id)
         FILTER (WHERE membership.elepem_id IS NOT NULL), '{}') AS facility_ids
     FROM public.institutional_accounts AS account
     LEFT JOIN public.facility_memberships AS membership
       ON membership.user_id = account.user_id
      AND membership.status = 'active'
      AND (membership.valid_until IS NULL OR membership.valid_until > now())
     WHERE account.user_id = $1
     GROUP BY account.role, account.status`, [data.user.id]);
  const account = rows[0];
  const email = data.user.email || "";
  if (!account || account.status !== "active") return { userId: data.user.id, email, termsAccepted, termsAcceptedAt, institutional: null };
  const facilityIds = account.facility_ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  return {
    userId: data.user.id,
    email,
    termsAccepted,
    termsAcceptedAt,
    institutional: { userId: data.user.id, identity: data.user.id, email, role: account.role, status: "active", facilityIds },
  };
}

export async function readAccountSession() {
  return validatedAccountSession();
}

export async function readServerInstitutionalSession(): Promise<InstitutionalSession | null> {
  return (await validatedAccountSession())?.institutional || null;
}

export async function accountSessionOrError() {
  const account = await validatedAccountSession();
  if (!account) {
    return {
      account: null,
      response: NextResponse.json({ error: "La sesión venció. Ingresá nuevamente." }, { status: 401 }),
    } as const;
  }
  return { account, response: null } as const;
}

export async function requireInstitutionalRole(role: InstitutionalRole): Promise<InstitutionalSession> {
  const account = await validatedAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta");
  if (!account.institutional) redirect("/cuenta");
  if (!canUseInstitutionalRole(account.institutional.role, role)) {
    redirect(institutionalHome(account.institutional.role));
  }
  if (role === "facility_representative" && account.institutional.role === "facility_representative" && account.institutional.facilityIds.length === 0) {
    redirect("/institucional/solicitar-representacion");
  }
  if (account.institutional.role === "administrator" && role !== "administrator") {
    await querySupabaseDatabase(`insert into elepem_core.audit_log
      (entity_type, entity_key, action, actor_identifier, after_state)
      values ('institutional_access', $1, 'administrator_override_access', $1, $2::jsonb)`, [
      account.institutional.userId, JSON.stringify({ requiredRole: role }),
    ]);
  }
  return account.institutional;
}

export async function institutionalSessionOrError(_request: NextRequest, requiredRole?: InstitutionalRole) {
  const account = await validatedAccountSession();
  if (!account) return { session: null, response: NextResponse.json({ error: "La sesión institucional venció." }, { status: 401 }) } as const;
  if (!account.institutional || (requiredRole && !canUseInstitutionalRole(account.institutional.role, requiredRole))) {
    return { session: null, response: NextResponse.json({ error: "No tenés permiso para esta acción." }, { status: 403 }) } as const;
  }
  if (requiredRole === "facility_representative" && account.institutional.role === "facility_representative" && account.institutional.facilityIds.length === 0) {
    return { session: null, response: NextResponse.json({ error: "La representación todavía no está aprobada." }, { status: 403 }) } as const;
  }
  return { session: account.institutional, response: null } as const;
}
