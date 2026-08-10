import { NextRequest, NextResponse } from "next/server";
import { teamSessionOrUnauthorized } from "../../../../../lib/team-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path)) {
    return NextResponse.json({ error: "Adjunto no válido." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  try {
    const records = await querySupabaseDatabase<{ object_path: string; mime_type: string }>(
      `SELECT attachment.object_path, attachment.mime_type
       FROM public.intake_report_attachments AS attachment
       JOIN public.intake_reports AS report ON report.id = attachment.report_id
       WHERE attachment.id = $1 AND report.is_demo = true
       LIMIT 1`,
      [path],
    );
    if (!records[0]) return NextResponse.json({ error: "No se encontró el adjunto demo." }, { status: 404 });
    const realObjectPath = records[0].object_path;
    const dbMimeType = records[0].mime_type;

    const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publishableKey;

    const fileRes = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${realObjectPath}`, {
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${authKey}`,
      },
      cache: "no-store",
    });

    if (!fileRes.ok) {
      return NextResponse.json({ error: "No se pudo obtener el archivo." }, { status: fileRes.status });
    }

    let contentType = fileRes.headers.get("content-type");
    if (!contentType || contentType === "application/octet-stream") {
      if (dbMimeType) {
        contentType = dbMimeType;
      } else {
        contentType = "application/octet-stream";
      }
    }

    const arrayBuffer = await fileRes.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al descargar" }, { status: 500 });
  }
}
