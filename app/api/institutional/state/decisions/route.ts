import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = {
  concern: ["review", "contact", "refer", "resolve"],
  experience: ["moderate", "reclassify_sensitive", "accept_aggregate", "private_facility", "anonymize_preview"],
  facility_change: ["request_info", "reject", "approve_preview"],
} as const;

const EVENT_CONTENT: Record<string, { status: string; title: string; description: string }> = {
  review: { status: "in_review", title: "Revisión iniciada", description: "El equipo estatal comenzó la revisión de la comunicación." },
  contact: { status: "contact", title: "Contacto o actuación registrada", description: "El equipo registró una actuación de seguimiento." },
  refer: { status: "referred", title: "Comunicación derivada", description: "La comunicación fue derivada para su tratamiento." },
  resolve: { status: "resolved", title: "Revisión resuelta", description: "La revisión demo fue cerrada por el equipo." },
  moderate: { status: "in_review", title: "Experiencia moderada", description: "La experiencia superó una primera moderación privada." },
  reclassify_sensitive: { status: "triage", title: "Reclasificada como preocupación sensible", description: "La experiencia requiere el circuito privado de preocupaciones." },
  accept_aggregate: { status: "resolved", title: "Aceptada para agregado", description: "Sólo podrá usarse de forma agregada y sin publicación individual." },
  private_facility: { status: "resolved", title: "Preparada para envío privado", description: "Se aprobó una vista previa para comunicación privada al ELEPEM." },
  anonymize_preview: { status: "in_review", title: "Vista previa anonimizada", description: "Se generó una vista previa; no fue publicada." },
  request_info: { status: "contact", title: "Se solicitó más información", description: "El ELEPEM puede responder desde su portal demo." },
  reject: { status: "closed", title: "Solicitud rechazada", description: "La solicitud de cambio no fue aprobada." },
  approve_preview: { status: "resolved", title: "Vista previa aprobada", description: "Se aprobó sólo la vista previa comparativa; el padrón público no cambió." },
};

export async function POST(request: NextRequest) {
  const auth = institutionalSessionOrError(request, "state");
  if (!auth.session) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const reportId = typeof input.reportId === "string" ? input.reportId : "";
  const action = typeof input.action === "string" ? input.action : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 4_000) : "";
  if (!UUID.test(reportId)) return NextResponse.json({ error: "Expediente inválido." }, { status: 400 });

  try {
    const reports = await querySupabaseDatabase<{ entry_type: keyof typeof ACTIONS; report_payload: Record<string, unknown> }>(
      "SELECT entry_type, report_payload FROM public.intake_reports WHERE id = $1 AND is_demo = true LIMIT 1",
      [reportId],
    );
    const report = reports[0];
    if (!report) return NextResponse.json({ error: "No se encontró el expediente demo." }, { status: 404 });
    if (!(ACTIONS[report.entry_type] as readonly string[]).includes(action)) return NextResponse.json({ error: "Decisión no permitida para esta cola." }, { status: 400 });
    const content = EVENT_CONTENT[action];
    const preview = ["approve_preview", "anonymize_preview", "private_facility", "accept_aggregate"].includes(action)
      ? { kind: action, sourcePayload: report.report_payload, generatedAt: new Date().toISOString(), canonicalWrite: false }
      : null;
    const nextType = action === "reclassify_sensitive" ? "concern" : report.entry_type;

    const rows = await querySupabaseDatabase<{ id: string; created_at: string }>(
      `WITH updated AS (
         UPDATE public.intake_reports
         SET current_status = $2, entry_type = $3, updated_at = now()
         WHERE id = $1 AND is_demo = true
         RETURNING id
       )
       INSERT INTO public.intake_report_events (
         report_id, status, public_title, public_description, internal_note, event_data, actor
       )
       SELECT id, $2, $4, $5, NULLIF($6, ''), $7::jsonb, 'state' FROM updated
       RETURNING id, created_at`,
      [reportId, content.status, nextType, content.title, content.description, note, JSON.stringify({ decision: action, preview, reviewer: auth.session.identity })],
    );
    if (!rows[0]) return NextResponse.json({ error: "No se pudo aplicar la decisión." }, { status: 404 });
    return NextResponse.json({ event: rows[0], status: content.status, entryType: nextType, preview }, { status: 201 });
  } catch (error) {
    console.error("State decision failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la decisión." }, { status: 502 });
  }
}
