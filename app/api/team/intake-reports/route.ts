import { NextRequest, NextResponse } from "next/server";
import { teamSessionOrUnauthorized } from "../../../../lib/team-auth";
import { querySupabaseDatabase } from "../../../../lib/supabase-db";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_KEYS = ["emergency", "safe", "duplicate", "wishes", "scope"] as const;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;

  try {
    const reports = await querySupabaseDatabase<{
      id: string;
      case_code: string;
      priority: string;
      department: string | null;
      report_payload: Record<string, unknown>;
      created_at: string;
      current_status: string;
      updated_at: string;
      events: unknown;
      attachments: unknown;
    }>(`SELECT
         report.id,
         report.case_code,
         report.priority,
         report.department,
         report.report_payload,
         report.created_at,
         report.current_status,
         report.updated_at,
         COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'id', event.id,
               'status', event.status,
               'public_title', event.public_title,
               'public_description', event.public_description,
               'internal_note', event.internal_note,
               'event_data', event.event_data,
               'actor', event.actor,
               'created_at', event.created_at
             )
             ORDER BY event.created_at, event.id
           )
           FROM public.intake_report_events AS event
           WHERE event.report_id = report.id
         ), '[]'::jsonb) AS events,
         COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'id', attachment.id,
               'file_name', attachment.file_name,
               'mime_type', attachment.mime_type,
               'size_bytes', attachment.size_bytes,
               'created_at', attachment.created_at
             )
             ORDER BY attachment.created_at, attachment.id
           )
           FROM public.intake_report_attachments AS attachment
           WHERE attachment.report_id = report.id
         ), '[]'::jsonb) AS attachments
       FROM public.intake_reports AS report
       WHERE report.is_demo = true
       ORDER BY report.created_at DESC
       LIMIT 100`);

    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supabase team inbox fetch failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudieron cargar las comunicaciones." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la revisión." }, { status: 400 });
  }

  const input = record(body);
  const reportId = text(input.reportId, 36);
  if (!UUID_PATTERN.test(reportId)) {
    return NextResponse.json({ error: "La comunicación seleccionada no es válida." }, { status: 400 });
  }

  const rawChecks = record(input.checks);
  const checks = Object.fromEntries(REVIEW_KEYS.map((key) => [key, rawChecks[key] === true]));
  const scopeStatus = text(input.scopeStatus, 32) || (checks.scope ? "in_scope" : "pending");
  const urgency = text(input.urgency, 32) || "Por evaluar";
  const route = text(input.route, 240) || "Equipo especializado / Inmayores";
  const referral = text(input.referral, 240);
  const note = text(input.note, 4_000);

  const status = scopeStatus === "out_of_scope" ? "referred" : scopeStatus === "in_scope" ? "in_review" : "triage";
  const publicTitle = scopeStatus === "out_of_scope"
    ? "Comunicación derivada"
    : scopeStatus === "in_scope"
    ? "Revisión inicial completada"
    : "Revisión en proceso";
  const publicDescription = scopeStatus === "out_of_scope"
    ? "El equipo revisó la información y definió una derivación al servicio correspondiente."
    : scopeStatus === "in_scope"
    ? "El equipo revisó la información y está definiendo el próximo paso."
    : "El equipo está evaluando la comunicación recibida.";
  const eventData = { checks, scopeStatus, urgency, route, referral: scopeStatus === "out_of_scope" ? referral : "" };

  try {
    const rows = await querySupabaseDatabase<{
      id: string;
      status: string;
      public_title: string;
      public_description: string;
      internal_note: string | null;
      event_data: JsonRecord;
      actor: string;
      created_at: string;
    }>(
      `WITH updated_report AS (
         UPDATE public.intake_reports
         SET current_status = $2, priority = $3, updated_at = now()
         WHERE id = $1 AND is_demo = true
         RETURNING id
       )
       INSERT INTO public.intake_report_events (
         report_id,
         status,
         public_title,
         public_description,
         internal_note,
         event_data,
         actor
       )
       SELECT id, $2, $4, $5, NULLIF($6, ''), $7::jsonb, 'organization'
       FROM updated_report
       RETURNING id, status, public_title, public_description, internal_note, event_data, actor, created_at`,
      [reportId, status, urgency, publicTitle, publicDescription, note, JSON.stringify(eventData)],
    );
    const event = rows[0];
    if (!event) return NextResponse.json({ error: "No se encontró la comunicación." }, { status: 404 });

    return NextResponse.json({ event, currentStatus: status }, { status: 201 });
  } catch (error) {
    console.error("Supabase team review save failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudo guardar la revisión." }, { status: 502 });
  }
}
