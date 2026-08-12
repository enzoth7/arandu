import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import { withSupabaseTransaction } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = {
  concern: ["review", "contact", "refer", "resolve"],
  experience: ["moderate", "reclassify_sensitive", "private_review", "private_facility", "anonymize_preview"],
  facility_change: ["review", "request_info", "reject", "approve_preview"],
} as const;

const EVENT_CONTENT: Record<string, { status: string; title: string; description: string }> = {
  review: { status: "in_review", title: "Revisión iniciada", description: "El equipo estatal comenzó la revisión de la comunicación." },
  contact: { status: "contact", title: "Contacto o actuación registrada", description: "El equipo registró una actuación de seguimiento." },
  refer: { status: "referred", title: "Comunicación derivada", description: "La comunicación fue derivada para su tratamiento." },
  resolve: { status: "resolved", title: "Revisión resuelta", description: "La revisión demo fue cerrada por el equipo." },
  moderate: { status: "in_review", title: "Experiencia moderada", description: "La experiencia superó una primera moderación privada." },
  reclassify_sensitive: { status: "triage", title: "Reclasificada como preocupación sensible", description: "La experiencia requiere el circuito privado de preocupaciones." },
  private_review: { status: "resolved", title: "Revisión estatal completada", description: "La experiencia permanece en el circuito estatal privado y no fue publicada ni compartida con el ELEPEM." },
  private_facility: { status: "resolved", title: "Preparada para envío privado", description: "Se aprobó una vista previa para comunicación privada al ELEPEM." },
  anonymize_preview: { status: "in_review", title: "Vista previa anonimizada", description: "Se generó una vista previa; no fue publicada." },
  request_info: { status: "contact", title: "Se solicitó más información", description: "El ELEPEM puede responder desde su portal demo." },
  reject: { status: "closed", title: "Solicitud rechazada", description: "La solicitud de cambio no fue aprobada." },
  approve_preview: { status: "resolved", title: "Cambios aprobados", description: "La decisión estatal quedó registrada y las fotos autorizadas se publicaron sin modificar el padrón canónico." },
};

function parseTriage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const priority = ["Alta", "Media", "Baja"].includes(String(input.priority)) ? String(input.priority) : null;
  const scope = typeof input.scope === "string" ? input.scope.trim().slice(0, 120) : "";
  const route = typeof input.route === "string" ? input.route.trim().slice(0, 120) : "";
  return {
    received: input.received === true,
    reviewed: input.reviewed === true,
    priority,
    scope: scope || null,
    route: route || null,
  };
}

export async function POST(request: NextRequest) {
  const auth = institutionalSessionOrError(request, "state");
  if (!auth.session) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const reportId = typeof input.reportId === "string" ? input.reportId : "";
  const action = typeof input.action === "string" ? input.action : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 4_000) : "";
  const triage = parseTriage(input.triage);
  if (!UUID.test(reportId)) return NextResponse.json({ error: "Expediente inválido." }, { status: 400 });

  try {
    const result = await withSupabaseTransaction(async (client) => {
      const reports = await client.query<{
        entry_type: keyof typeof ACTIONS;
        report_payload: Record<string, unknown>;
        facility_id: string | null;
      }>(
        "SELECT entry_type, report_payload, facility_id::text FROM public.intake_reports WHERE id = $1 AND is_demo = true LIMIT 1 FOR UPDATE",
        [reportId],
      );
      const report = reports.rows[0];
      if (!report) return { error: "No se encontró el expediente demo.", httpStatus: 404 as const };
      if (!(ACTIONS[report.entry_type] as readonly string[]).includes(action)) return { error: "Decisión no permitida para esta cola.", httpStatus: 400 as const };

      const content = EVENT_CONTENT[action];
      const preview = ["approve_preview", "anonymize_preview", "private_facility", "private_review"].includes(action)
        ? {
            kind: action,
            sourcePayload: report.report_payload,
            generatedAt: new Date().toISOString(),
            canonicalWrite: false,
            publicPhotoProjection: action === "approve_preview",
          }
        : null;
      const nextType = action === "reclassify_sensitive" ? "concern" : report.entry_type;

      const rows = await client.query<{ id: string; created_at: string }>(
        `WITH updated AS (
           UPDATE public.intake_reports
           SET current_status = $2, entry_type = $3, priority = COALESCE($8, priority), updated_at = now()
           WHERE id = $1 AND is_demo = true
           RETURNING id
         )
         INSERT INTO public.intake_report_events (
           report_id, status, public_title, public_description, internal_note, event_data, actor
         )
         SELECT id, $2, $4, $5, NULLIF($6, ''), $7::jsonb, 'state' FROM updated
         RETURNING id, created_at`,
        [reportId, content.status, nextType, content.title, content.description, note, JSON.stringify({ decision: action, preview, triage, reviewer: auth.session.identity }), triage?.priority],
      );
      if (!rows.rows[0]) return { error: "No se pudo aplicar la decisión.", httpStatus: 404 as const };

      let publishedPhotoCount = 0;
      if (action === "approve_preview" && report.entry_type === "facility_change" && report.facility_id) {
        const photos = await client.query<{ id: string }>(
          `SELECT id
           FROM public.intake_report_attachments
           WHERE report_id = $1
             AND purpose = 'facility_photo'
             AND mime_type LIKE 'image/%'
             AND rights_metadata->>'rightsConfirmed' = 'true'
           ORDER BY created_at, id`,
          [reportId],
        );
        const expectedPhotoCount = Number(report.report_payload.photoCount || 0);
        if (expectedPhotoCount > 0 && photos.rows.length !== expectedPhotoCount) {
          throw new Error("La cantidad de fotos validadas no coincide con la solicitud.");
        }

        if (photos.rows.length > 0) {
          const publication = await client.query<{ id: string }>(
            `INSERT INTO public.facility_change_publications (
               report_id, facility_id, remove_current_photo, reviewer
             ) VALUES ($1, $2::bigint, $3, $4)
             ON CONFLICT (report_id) DO NOTHING
             RETURNING id`,
            [reportId, report.facility_id, report.report_payload.removeCurrentPhoto === true, auth.session.identity],
          );
          const publicationId = publication.rows[0]?.id;
          if (publicationId) {
            for (const [position, photo] of photos.rows.entries()) {
              await client.query(
                `INSERT INTO public.facility_change_publication_photos (
                   publication_id, attachment_id, position
                 ) VALUES ($1, $2, $3)`,
                [publicationId, photo.id, position],
              );
            }
          }
          publishedPhotoCount = photos.rows.length;
        }
      }

      return {
        event: rows.rows[0],
        status: content.status,
        entryType: nextType,
        preview,
        publishedPhotoCount,
      };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    if (result.publishedPhotoCount > 0) {
      revalidatePath("/");
      revalidatePath("/institucional/elepem");
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("State decision failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "No se pudo guardar la decisión." }, { status: 502 });
  }
}
