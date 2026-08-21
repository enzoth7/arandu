import { NextRequest, NextResponse } from "next/server";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  const auth = await institutionalSessionOrError(request);
  if (!auth.session) return auth.response;
  const { attachmentId } = await context.params;
  if (!UUID.test(attachmentId)) return NextResponse.json({ error: "Adjunto inválido." }, { status: 400 });
  try {
    const rows = await querySupabaseDatabase<{ object_path: string; file_name: string; mime_type: string; facility_id: string | null }>(
      `SELECT attachment.object_path, attachment.file_name, attachment.mime_type, report.facility_id::text
       FROM public.intake_report_attachments AS attachment
       JOIN public.intake_reports AS report ON report.id = attachment.report_id
       WHERE attachment.id = $1 LIMIT 1`, [attachmentId],
    );
    const attachment = rows[0];
    if (!attachment || (auth.session.role === "facility_representative" && (!attachment.facility_id || !auth.session.facilityIds.includes(Number(attachment.facility_id))))) {
      return NextResponse.json({ error: "No tenés permiso para ver este adjunto." }, { status: 403 });
    }
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "La vista previa privada no está configurada." }, { status: 503 });
    const response = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${attachment.object_path}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "No se pudo obtener el adjunto privado." }, { status: 502 });
    return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": attachment.mime_type, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Private attachment access failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo abrir el adjunto privado." }, { status: 502 });
  }
}
