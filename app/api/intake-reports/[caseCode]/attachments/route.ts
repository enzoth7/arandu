import { NextRequest, NextResponse } from "next/server";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  CASE_CODE_PATTERN,
  cleanEvidenceFileName,
  EVIDENCE_EXTENSIONS,
  evidenceSignatureMatches,
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_FILES,
  sameSecret,
  sha256Hex,
  UPLOAD_TOKEN_PATTERN,
} from "../../../../../lib/intake-report.mjs";

export const runtime = "nodejs";

// La Edge Function autoriza con el token de capacidad del expediente, no con la
// clave: alcanza con la publicable. Mandarle la de service role ampliaba sin
// necesidad el alcance de una función declarada con `verify_jwt = false`.
function supabaseHeaders(publishableKey: string): Record<string, string> {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

function supabaseServiceHeaders(): Record<string, string> | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
}

export async function POST(request: NextRequest, context: { params: Promise<{ caseCode: string }> }) {
  const { caseCode: rawCaseCode } = await context.params;
  // `decodeURIComponent` lanza URIError con secuencias mal formadas (por ejemplo
  // un "%" suelto). Sin este guardia, la ruta respondía 500 en vez de 400.
  let caseCode: string;
  try {
    caseCode = decodeURIComponent(rawCaseCode || "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "El código de seguimiento no es válido." }, { status: 400 });
  }
  if (!CASE_CODE_PATTERN.test(caseCode)) {
    return NextResponse.json({ error: "El código de seguimiento no es válido." }, { status: 400 });
  }

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  const file = input.get("file");
  const uploadTokenValue = input.get("uploadToken");
  const uploadToken = typeof uploadTokenValue === "string" ? uploadTokenValue.trim() : "";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (!UPLOAD_TOKEN_PATTERN.test(uploadToken)) {
    return NextResponse.json({ error: "La autorización para adjuntar el archivo no es válida." }, { status: 403 });
  }
  if (!file.size || file.size > MAX_EVIDENCE_FILE_BYTES) {
    return NextResponse.json({ error: "Cada archivo puede pesar hasta 10 MB." }, { status: 413 });
  }
  const cleanType = file.type.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(cleanType)) {
    return NextResponse.json({ error: "Ese tipo de archivo no está permitido." }, { status: 415 });
  }
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (!evidenceSignatureMatches(fileBuffer, cleanType)) {
    return NextResponse.json({ error: "El contenido no coincide con el tipo de archivo declarado." }, { status: 415 });
  }
  const fileHash = sha256Hex(fileBuffer);
  const cleanName = cleanEvidenceFileName(file.name);
  const sourceChannelValue = input.get("sourceChannel");
  const sourceMessageIdValue = input.get("sourceMessageId");
  const sourceChannel = sourceChannelValue === "whatsapp_sandbox" ? "whatsapp_sandbox" : "web";
  const sourceMessageId = typeof sourceMessageIdValue === "string" ? sourceMessageIdValue.trim().slice(0, 100) : null;
  const purposeValue = input.get("purpose");
  const purpose = purposeValue === "facility_photo"
    ? "facility_photo"
    : cleanType.startsWith("audio/") ? "audio" : "evidence";
  const rightsSourceValue = input.get("rightsSource");
  const rightsSource = typeof rightsSourceValue === "string" ? rightsSourceValue.trim().slice(0, 1_000) : "";
  const rightsConfirmed = input.get("rightsConfirmed") === "true";
  if (purpose === "facility_photo" && (!cleanType.startsWith("image/") || !rightsConfirmed || rightsSource.length < 10)) {
    return NextResponse.json({ error: "La foto requiere una declaración de procedencia y derechos." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "La carga de archivos no está configurada." }, { status: 503 });
  }

  const extension = EVIDENCE_EXTENSIONS[cleanType] || cleanName.split(".").pop() || "bin";

  const forwarded = new FormData();
  forwarded.set("caseCode", caseCode);
  forwarded.set("capabilityToken", uploadToken);
  forwarded.set("sha256", fileHash);
  forwarded.set("sourceChannel", sourceChannel);
  if (sourceMessageId) forwarded.set("sourceMessageId", sourceMessageId);
  forwarded.set("purpose", purpose);
  if (rightsSource) forwarded.set("rightsSource", rightsSource);
  forwarded.set("rightsConfirmed", String(rightsConfirmed));
  forwarded.set("file", new Blob([new Uint8Array(fileBuffer)], { type: cleanType }), cleanName);

  try {
    // Las fotos de ficha llevan metadatos de derechos nuevos. Hasta que la Edge
    // Function v2 esté desplegada, pasan por el fallback privado del servidor.
    const needsPrivateValidation = purpose === "facility_photo" || cleanType.startsWith("audio/");
    const serviceHeaders = supabaseServiceHeaders();
    if (needsPrivateValidation && !serviceHeaders) {
      return NextResponse.json({ error: "La carga privada de fotos no está configurada en este entorno." }, { status: 503 });
    }
    const response = needsPrivateValidation
      ? new Response(null, { status: 503 })
      : await fetch(`${supabaseUrl}/functions/v1/upload-intake-evidence`, {
          method: "POST",
          headers: supabaseHeaders(publishableKey),
          body: forwarded,
          cache: "no-store",
        });
    
    const result: unknown = await response.json().catch(() => null);

    if (response.ok && result) {
      return NextResponse.json(result, { status: 201 });
    }

    // The direct fallback is privileged and must never use a publishable key.
    if (!serviceHeaders) {
      return NextResponse.json({ error: "No se pudo validar y guardar el archivo." }, { status: response.status >= 400 ? response.status : 502 });
    }
    console.warn("Evidence edge upload failed; attempting the private server fallback.", { status: response.status });

    let reportId: string | null = null;

    try {
      const rows = await querySupabaseDatabase<{ id: string; report_payload: Record<string, unknown>; entry_type: string }>(
        "SELECT id, report_payload, entry_type FROM public.intake_reports WHERE case_code = $1 LIMIT 1",
        [caseCode]
      );
      const storedToken = rows[0]?.report_payload && typeof rows[0].report_payload.evidenceUploadToken === "string"
        ? rows[0].report_payload.evidenceUploadToken
        : "";
      if (rows[0]?.id && storedToken && sameSecret(storedToken, uploadToken)) {
        if (purpose === "facility_photo" && rows[0].entry_type !== "facility_change") {
          return NextResponse.json({ error: "Ese tipo de adjunto no corresponde a este expediente." }, { status: 400 });
        }
        if (rows[0].entry_type === "facility_change" && purpose !== "facility_photo") {
          return NextResponse.json({ error: "Las solicitudes de cambio solo admiten fotografías autorizadas." }, { status: 400 });
        }
        reportId = rows[0].id;
      }
    } catch (err) {
      console.error("Error querying report by caseCode:", err);
    }

    if (!reportId) {
      return NextResponse.json({ error: "No se encontró la comunicación o la autorización no es válida." }, { status: 404 });
    }

    const countRows = await querySupabaseDatabase<{ purpose: string; count: string }>(
      "SELECT purpose, count(*)::text AS count FROM public.intake_report_attachments WHERE report_id = $1 GROUP BY purpose",
      [reportId],
    );
    const counts = Object.fromEntries(countRows.map((row) => [row.purpose, Number(row.count)]));
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (purpose === "facility_photo" && (counts.facility_photo || 0) >= 10) {
      return NextResponse.json({ error: "La solicitud ya alcanzó el máximo de 10 fotos." }, { status: 409 });
    }
    if (purpose !== "facility_photo" && total >= MAX_EVIDENCE_FILES) {
      return NextResponse.json({ error: "La comunicación ya alcanzó el máximo de 5 archivos." }, { status: 409 });
    }

    const attachmentId = crypto.randomUUID();
    const objectPath = `${reportId}/${attachmentId}.${extension}`;
    const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${objectPath}`, {
      method: "POST",
      headers: {
        ...serviceHeaders,
        "Content-Type": cleanType,
        "Cache-Control": "0, private, no-store",
        "x-upsert": "false",
      },
      body: fileBuffer,
      cache: "no-store",
    });

    if (!storageRes.ok) {
      const storageErr = await storageRes.json().catch(() => null);
      console.error("Direct storage upload failed", storageErr);
      return NextResponse.json({ error: "No se pudo guardar el archivo en el almacenamiento." }, { status: 502 });
    }

    try {
      await querySupabaseDatabase(
        `INSERT INTO public.intake_report_attachments (
           id, report_id, object_path, file_name, mime_type, size_bytes,
           sha256_hex, source_channel, source_message_id, validation_status,
           purpose, rights_metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'signature_validated', $10, $11::jsonb)`,
        [attachmentId, reportId, objectPath, cleanName, cleanType, file.size, fileHash, sourceChannel, sourceMessageId, purpose, JSON.stringify({ sourceDeclaration: rightsSource || null, rightsConfirmed })]
      );
    } catch (dbErr) {
      console.error("Error inserting attachment metadata:", dbErr);
      await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${objectPath}`, {
        method: "DELETE",
        headers: serviceHeaders,
      }).catch(() => undefined);
      return NextResponse.json({ error: "No se pudo registrar la información del archivo." }, { status: 502 });
    }

    return NextResponse.json({
      attachment: {
        id: attachmentId,
        fileName: cleanName,
        mimeType: cleanType,
        sizeBytes: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Evidence upload processing failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudo conectar con el almacenamiento." }, { status: 502 });
  }
}
