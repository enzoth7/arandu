import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    return NextResponse.json(
      { error: "La sesión venció o no es válida. Iniciá sesión nuevamente." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now = new Date().toISOString();
  const termsVersion = "2026-08-21";

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      terms_accepted_at: now,
      terms_version: termsVersion,
    },
  });

  if (updateError) {
    return NextResponse.json(
      { error: "No se pudo registrar la aceptación de los términos. Intentá de nuevo." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Trazabilidad adicional en audit_log si la tabla está disponible
  try {
    await querySupabaseDatabase(
      `insert into elepem_core.audit_log
        (entity_type, entity_key, action, actor_identifier, after_state)
       values ('terms_acceptance', $1, 'accept_terms', $1, $2::jsonb)`,
      [
        data.user.id,
        JSON.stringify({
          termsVersion,
          acceptedAt: now,
          email: data.user.email,
        }),
      ]
    );
  } catch {
    // Si la tabla de auditoría no existe en algún entorno de prueba, no bloqueamos la respuesta exitosa
  }

  return NextResponse.json(
    { success: true, acceptedAt: now, version: termsVersion },
    { headers: { "Cache-Control": "no-store" } }
  );
}
