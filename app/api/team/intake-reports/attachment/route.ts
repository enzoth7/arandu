import { NextRequest, NextResponse } from "next/server";
import { teamSessionOrUnauthorized } from "../../../../../lib/team-auth";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { session, response: unauthorized } = teamSessionOrUnauthorized(request);
  if (!session) return unauthorized;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Path no proporcionado." }, { status: 400 });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  try {
    let realObjectPath = path;
    let dbMimeType: string | null = null;

    if (!path.includes("/")) {
      try {
        const records = await querySupabaseDatabase<{ object_path?: string; mime_type?: string }>(
          "SELECT object_path, mime_type FROM public.intake_report_attachments WHERE id = $1 LIMIT 1",
          [path]
        );
        if (records && records[0]?.object_path) {
          realObjectPath = records[0].object_path;
          dbMimeType = records[0].mime_type || null;
        }
      } catch (err) {
        console.error("Error querying attachment object_path:", err);
      }
    }

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
