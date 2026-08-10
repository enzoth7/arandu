import { NextRequest, NextResponse } from "next/server";
import { demoIntakeEnabled, parseFacilityChangeSubmission } from "../../../../../lib/demo-intake.mjs";
import { insertDemoIntake } from "../../../../../lib/demo-intake-db";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const auth = institutionalSessionOrError(request, "facility");
  if (!auth.session) return auth.response;
  try {
    const reports = await querySupabaseDatabase<{
      id: string; case_code: string; demo_facility_id: string; current_status: string;
      report_payload: Record<string, unknown>; created_at: string; events: unknown;
    }>(`SELECT report.id, report.case_code, report.demo_facility_id, report.current_status,
         report.report_payload, report.created_at,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'status', event.status, 'public_title', event.public_title,
           'public_description', event.public_description, 'event_data', event.event_data,
           'actor', event.actor, 'created_at', event.created_at
         ) ORDER BY event.created_at) FROM public.intake_report_events AS event
         WHERE event.report_id = report.id), '[]'::jsonb) AS events
       FROM public.intake_reports AS report
       WHERE report.is_demo = true
         AND report.entry_type = 'facility_change'
         AND report.demo_facility_id = ANY($1::text[])
       ORDER BY report.created_at DESC`, [auth.session.facilityIds]);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Facility request history failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const auth = institutionalSessionOrError(request, "facility");
  if (!auth.session) return auth.response;
  if (!demoIntakeEnabled()) return NextResponse.json({ error: "La recepción demo está desactivada." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};

  if (input.mode === "respond") {
    const reportId = typeof input.reportId === "string" ? input.reportId : "";
    const responseNote = typeof input.responseNote === "string" ? input.responseNote.trim().slice(0, 4_000) : "";
    if (!UUID.test(reportId) || responseNote.length < 3) return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 });
    try {
      const rows = await querySupabaseDatabase<{ id: string }>(`WITH updated AS (
          UPDATE public.intake_reports SET current_status = 'in_review', updated_at = now()
          WHERE id = $1 AND is_demo = true AND entry_type = 'facility_change'
            AND demo_facility_id = ANY($2::text[])
          RETURNING id
        )
        INSERT INTO public.intake_report_events (
          report_id, status, public_title, public_description, internal_note, event_data, actor
        ) SELECT id, 'in_review', 'Información adicional recibida',
          'El ELEPEM respondió el pedido de información.', NULL, $3::jsonb, 'facility'
        FROM updated RETURNING id`, [reportId, auth.session.facilityIds, JSON.stringify({ response: responseNote, identity: auth.session.identity })]);
      if (!rows[0]) return NextResponse.json({ error: "No se encontró una solicitud asignada." }, { status: 404 });
      return NextResponse.json({ saved: true }, { status: 201 });
    } catch (error) {
      console.error("Facility response failed.", { message: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "No se pudo guardar la respuesta." }, { status: 502 });
    }
  }

  const parsed = parseFacilityChangeSubmission(body);
  if (!parsed) return NextResponse.json({ error: "Revisá la fecha, el respaldo, los cambios y los derechos de la foto." }, { status: 400 });
  if (!auth.session.facilityIds.includes(parsed.facilityId)) return NextResponse.json({ error: "Ese ELEPEM no está asignado a tu sesión." }, { status: 403 });
  try {
    const result = await insertDemoIntake({
      kind: "facility_change",
      submittedActor: "facility",
      demoFacilityId: parsed.facilityId,
      payload: parsed.payload,
    });
    return NextResponse.json({ caseCode: result.caseCode, uploadToken: result.uploadToken }, { status: 201 });
  } catch (error) {
    console.error("Facility change intake failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la solicitud." }, { status: 502 });
  }
}
