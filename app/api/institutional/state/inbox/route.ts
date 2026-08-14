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
      documentReview: null | { decision: "inadequate" | "clear"; reason: string; createdAt: string };
    }>(`SELECT
         report.id, report.case_code, report.entry_type, report.current_status,
         report.priority, report.demo_facility_id, report.report_payload, report.created_at,
         CASE WHEN facility.id IS NULL THEN NULL ELSE jsonb_build_object(
           'id', facility.id, 'key', facility.codigo, 'name', facility.nombre,
           'locality', facility.localidad, 'department', facility.departamento
         ) END AS facility,
         CASE WHEN experience_publication.id IS NULL THEN NULL ELSE jsonb_build_object(
           'id', experience_publication.id, 'status', experience_publication.status,
           'publicBody', experience_publication.public_body,
           'publicRelationship', experience_publication.public_relationship,
           'publicPeriod', experience_publication.public_period,
           'publishedAt', experience_publication.published_at
         ) END AS publication,
         CASE WHEN document_review.id IS NULL THEN NULL ELSE jsonb_build_object(
           'decision', document_review.decision, 'reason', document_review.reason,
           'createdAt', document_review.created_at
         ) END AS "documentReview",
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
       LEFT JOIN public.elepem AS facility ON facility.id = report.facility_id
       LEFT JOIN elepem_core.facility_experience_publications AS experience_publication
         ON experience_publication.report_id = report.id
       LEFT JOIN LATERAL (
         SELECT review.id, review.decision, review.reason, review.created_at
         FROM public.facility_document_status_reviews AS review
         WHERE review.facility_id = facility.id
            OR review.demo_facility_id = report.demo_facility_id
         ORDER BY review.created_at DESC LIMIT 1
       ) AS document_review ON true
       WHERE report.is_demo = true
         AND report.current_status <> 'draft'
       ORDER BY report.created_at DESC
       LIMIT 200`);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Institutional state inbox failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo cargar la bandeja demo." }, { status: 502 });
  }
}
