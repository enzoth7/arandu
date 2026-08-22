import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { upsertUserProfile } from "../../../../lib/user-profile-db";
import { requestRepresentation } from "../../../../lib/role-workflows-db";
import { querySupabaseDatabase } from "../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let password = "";
  let bodyFirstName = "";
  let bodyLastName = "";
  let bodyPhone = "";
  try {
    const body = await request.json() as {
      password?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      phone?: unknown;
    };
    password = typeof body.password === "string" ? body.password : "";
    bodyFirstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 100) : "";
    bodyLastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 100) : "";
    bodyPhone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : "";
  } catch {
    // La validación inferior produce una respuesta estable.
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "La contraseña debe tener entre 8 y 128 caracteres." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createServerSupabaseClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return NextResponse.json({ error: "La sesión venció. Solicitá un enlace nuevo." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "No pudimos guardar esa contraseña. Probá con una diferente." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const meta = data.user.user_metadata || {};
  const firstName = bodyFirstName || String(meta.first_name || meta.nombre || "").trim();
  const lastName = bodyLastName || String(meta.last_name || meta.apellido || "").trim();
  const phone = bodyPhone || String(meta.phone || meta.telefono || "").trim();
  const accountType = meta.account_type === "elepem" ? "elepem" : "personal";
  const facilityId = Number(meta.facility_id);
  const invitedByResidentId = typeof meta.invited_by_resident_id === "string" ? meta.invited_by_resident_id : null;


  if (firstName || lastName || phone) {
    await upsertUserProfile({
      userId: data.user.id,
      firstName: firstName || "Usuario",
      lastName: lastName || "",
      phone: phone || "",
      accountType,
    }).catch((err) => {
      console.error("Failed to upsert user profile on password set:", err);
    });
  }

  if (accountType === "elepem" && Number.isSafeInteger(facilityId) && facilityId > 0) {
    await requestRepresentation(data.user.id, facilityId).catch((err) => {
      console.error("Failed to register facility representation on password set:", err);
    });
  }

  const institutionalRole = typeof meta.institutional_role === "string" ? meta.institutional_role : null;
  if (institutionalRole && ["administrator", "verifier", "moderator"].includes(institutionalRole)) {
    await querySupabaseDatabase(`
      insert into public.institutional_accounts (user_id, role, status)
      values ($1::uuid, $2, 'active')
      on conflict (user_id) do update set role = excluded.role, status = 'active', updated_at = now()
    `, [data.user.id, institutionalRole]).catch((err) => {
      console.error("Failed to assign institutional role on password set:", err);
    });
  }


  if (invitedByResidentId && Number.isSafeInteger(facilityId) && facilityId > 0) {
    await querySupabaseDatabase(`
      with verifier as (
        select user_id from public.institutional_accounts where role in ('administrator', 'verifier') and status = 'active' limit 1
      )
      insert into public.user_facility_relationships
        (user_id, elepem_id, relationship_type, status, first_name, last_name, requested_at, reviewed_at, verified_at, verified_by, valid_until)
      select
        $1::uuid, $2, 'family', 'verified', $3, $4, now(), now(), now(), verifier.user_id, now() + interval '365 days'
      from verifier
      where not exists (
        select 1 from public.user_facility_relationships
        where user_id = $1::uuid and elepem_id = $2
      )
    `, [data.user.id, facilityId, firstName || null, lastName || null]).catch((err) => {
      console.error("Failed to automatically insert invited family relationship:", err);
    });

    await querySupabaseDatabase(`
      with verifier as (
        select user_id from public.institutional_accounts where role in ('administrator', 'verifier') and status = 'active' limit 1
      )
      update public.user_facility_relationships
      set
        relationship_type = 'family',
        first_name = coalesce($3, first_name),
        last_name = coalesce($4, last_name),
        status = 'verified',
        requested_at = coalesce(requested_at, now()),
        reviewed_at = now(),
        verified_at = now(),
        verified_by = (select user_id from verifier),
        valid_until = now() + interval '365 days',
        updated_at = now()
      where user_id = $1::uuid and elepem_id = $2
    `, [data.user.id, facilityId, firstName || null, lastName || null]).catch((err) => {
      console.error("Failed to automatically update invited family relationship:", err);
    });
  }


  return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
}




