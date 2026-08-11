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
      facility: null | { id: number; key: string; name: string; locality: string; department: string };
      publication: null | {
        id: string; status: "draft" | "published" | "withdrawn"; publicBody: string;
        publicRelationship: string | null; publicPeriod: string | null; publishedAt: string | null;
      };
    }>(`SELECT
         report.id, report.case_code, report.entry_type, report.current_status,
         report.priority, report.demo_facility_id, report.report_payload, report.created_at,
         CASE WHEN facility.id IS NULL THEN NULL ELSE jsonb_build_object(
           'id', facility.id, 'key', facility.facility_key, 'name', preferred_name.name,
           'locality', current_address.locality, 'department', current_address.department
         ) END AS facility,
         CASE WHEN experience_publication.id IS NULL THEN NULL ELSE jsonb_build_object(
           'id', experience_publication.id, 'status', experience_publication.status,
           'publicBody', experience_publication.public_body,
           'publicRelationship', experience_publication.public_relationship,
           'publicPeriod', experience_publication.public_period,
           'publishedAt', experience_publication.published_at
         ) END AS publication,
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
       LEFT JOIN elepem_core.facilities AS facility ON facility.id = report.facility_id
       LEFT JOIN LATERAL (
         SELECT name.name
         FROM elepem_core.facility_names AS name
         WHERE name.facility_id = facility.id AND name.is_preferred
         ORDER BY name.id DESC LIMIT 1
       ) AS preferred_name ON true
       LEFT JOIN LATERAL (
         SELECT address.locality, address.department
         FROM elepem_core.facility_addresses AS address
         WHERE address.facility_id = facility.id
           AND address.is_current AND address.address_type = 'physical'
         ORDER BY address.id DESC LIMIT 1
       ) AS current_address ON true
       LEFT JOIN elepem_core.facility_experience_publications AS experience_publication
         ON experience_publication.report_id = report.id
       WHERE report.is_demo = true
       ORDER BY report.created_at DESC
       LIMIT 200`);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Institutional state inbox failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar la bandeja demo." }, { status: 502 });
  }
}
