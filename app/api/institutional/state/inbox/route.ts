import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = institutionalSessionOrError(request, "state");
  if (!auth.session) return auth.response;
  try {
    const reports = await querySupabaseDatabase<{
      id: string; case_code: string; entry_type: string; current_status: string; priority: string;
      demo_facility_id: string | null; report_payload: Record<string, unknown>; created_at: string;
      contacts: unknown; events: unknown; attachments: unknown;
    }>(`SELECT
         report.id, report.case_code, report.entry_type, report.current_status,
         report.priority, report.demo_facility_id, report.report_payload, report.created_at,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'name', contact.name, 'phone', contact.phone, 'email', contact.email
         )) FROM public.intake_report_contacts AS contact WHERE contact.report_id = report.id), '[]'::jsonb) AS contacts,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', event.id, 'status', event.status, 'public_title', event.public_title,
           'public_description', event.public_description, 'internal_note', event.internal_note,
           'event_data', event.event_data, 'actor', event.actor, 'created_at', event.created_at
         ) ORDER BY event.created_at) FROM public.intake_report_events AS event WHERE event.report_id = report.id), '[]'::jsonb) AS events,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', attachment.id, 'file_name', attachment.file_name, 'mime_type', attachment.mime_type,
           'size_bytes', attachment.size_bytes, 'purpose', attachment.purpose, 'rights_metadata', attachment.rights_metadata
         ) ORDER BY attachment.created_at) FROM public.intake_report_attachments AS attachment WHERE attachment.report_id = report.id), '[]'::jsonb) AS attachments
       FROM public.intake_reports AS report
       WHERE report.is_demo = true
       ORDER BY report.created_at DESC
       LIMIT 200`);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Institutional state inbox failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar la bandeja demo." }, { status: 502 });
  }
}
