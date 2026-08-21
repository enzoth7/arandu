import { NextRequest, NextResponse } from "next/server";
import { parseFacilityChangeSubmission } from "../../../../../lib/demo-intake.mjs";
import { insertDemoIntake } from "../../../../../lib/demo-intake-db";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "facility_representative");
  if (!auth.session) return auth.response;
  try {
    const reports = await querySupabaseDatabase(`SELECT report.id, report.case_code, report.facility_id,
       report.current_status, facility.nombre AS facility_name, report.report_payload, report.created_at,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('status', event.status, 'public_title', event.public_title,
         'public_description', event.public_description, 'event_data', event.event_data, 'actor', event.actor,
         'created_at', event.created_at) ORDER BY event.created_at)
         FROM public.intake_report_events AS event WHERE event.report_id = report.id), '[]'::jsonb) AS events
     FROM public.intake_reports AS report
     JOIN public.elepem AS facility ON facility.id = report.facility_id
     WHERE report.entry_type = 'facility_change' AND report.current_status <> 'draft'
       AND report.facility_id = ANY($1::bigint[])
     ORDER BY report.created_at DESC`, [auth.session.facilityIds]);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Facility request history failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "facility_representative");
  if (!auth.session) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};

  if (input.mode === "respond") {
    const reportId = typeof input.reportId === "string" ? input.reportId : "";
    const responseNote = typeof input.responseNote === "string" ? input.responseNote.trim().slice(0, 4_000) : "";
    if (!UUID.test(reportId) || responseNote.length < 3) return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 });
    const rows = await querySupabaseDatabase<{ id: string }>(`WITH updated AS (
        UPDATE public.intake_reports SET current_status = 'in_review', updated_at = now()
        WHERE id = $1 AND entry_type = 'facility_change' AND facility_id = ANY($2::bigint[])
        RETURNING id
      ) INSERT INTO public.intake_report_events (report_id, status, public_title, public_description, event_data, actor)
        SELECT id, 'in_review', 'Información adicional recibida', 'El ELEPEM respondió el pedido de información.',
          $3::jsonb, 'facility' FROM updated RETURNING id`,
      [reportId, auth.session.facilityIds, JSON.stringify({ response: responseNote, userId: auth.session.userId })]);
    if (!rows[0]) return NextResponse.json({ error: "No se encontró una solicitud asignada." }, { status: 404 });
    return NextResponse.json({ saved: true }, { status: 201 });
  }

  if (input.mode === "finalize") {
    const caseCode = typeof input.caseCode === "string" ? input.caseCode.trim().toUpperCase() : "";
    const uploadToken = typeof input.uploadToken === "string" ? input.uploadToken.trim() : "";
    if (!/^AM-\d{8}-[A-F0-9]{8}$/.test(caseCode) || !/^[A-Za-z0-9_-]{32}$/.test(uploadToken)) return NextResponse.json({ error: "Borrador inválido." }, { status: 400 });
    const rows = await querySupabaseDatabase<{ id: string; report_payload: Record<string, unknown> }>(`SELECT id, report_payload
      FROM public.intake_reports WHERE case_code = $1 AND entry_type = 'facility_change' AND current_status = 'draft'
        AND facility_id = ANY($2::bigint[]) AND submitted_by_user_id = $3::uuid LIMIT 1`,
      [caseCode, auth.session.facilityIds, auth.session.userId]);
    const report = rows[0];
    if (!report || report.report_payload.evidenceUploadToken !== uploadToken) return NextResponse.json({ error: "No se encontró el borrador." }, { status: 404 });
    const counts = await querySupabaseDatabase<{ count: string }>(`SELECT count(*)::text AS count FROM public.intake_report_attachments
      WHERE report_id = $1 AND purpose = 'facility_photo' AND mime_type LIKE 'image/%'
        AND rights_metadata->>'rightsConfirmed' = 'true'`, [report.id]);
    if (Number(report.report_payload.photoCount || 0) !== Number(counts[0]?.count || 0)) return NextResponse.json({ error: "Faltan fotografías autorizadas por adjuntar." }, { status: 400 });
    await querySupabaseDatabase(`WITH updated AS (UPDATE public.intake_reports SET current_status = 'received', updated_at = now()
      WHERE id = $1 AND current_status = 'draft' RETURNING id)
      INSERT INTO public.intake_report_events (report_id, status, public_title, public_description, event_data, actor)
      SELECT id, 'received', 'Solicitud recibida', 'La solicitud quedó disponible para revisión institucional.',
        $2::jsonb, 'facility' FROM updated`, [report.id, JSON.stringify({ decision: "facility_change_finalized", userId: auth.session.userId })]);
    return NextResponse.json({ finalized: true }, { status: 201 });
  }

  const parsed = parseFacilityChangeSubmission(body);
  if (!parsed) return NextResponse.json({ error: "Revisá los cambios, el precio y las fotografías." }, { status: 400 });
  if (!auth.session.facilityIds.includes(parsed.facilityId)) return NextResponse.json({ error: "Ese ELEPEM no está asignado a tu cuenta." }, { status: 403 });
  if (parsed.payload.photoCount > 0 && parsed.payload.photoRightsConfirmed !== true) return NextResponse.json({ error: "Las fotografías requieren confirmación de derechos." }, { status: 400 });
  try {
    const exists = await querySupabaseDatabase<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM public.elepem WHERE id = $1) AS exists", [parsed.facilityId]);
    if (!exists[0]?.exists) return NextResponse.json({ error: "El ELEPEM asignado ya no está disponible." }, { status: 409 });
    const result = await insertDemoIntake({ kind: "facility_change", submittedActor: "facility", facilityId: parsed.facilityId,
      payload: parsed.payload, payloadVersion: 3, initialStatus: "draft", isDemo: false, submittedByUserId: auth.session.userId });
    return NextResponse.json({ caseCode: result.caseCode, uploadToken: result.uploadToken }, { status: 201 });
  } catch (error) {
    console.error("Facility change intake failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la solicitud." }, { status: 502 });
  }
}
