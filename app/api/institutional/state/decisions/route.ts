import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { canUseInstitutionalRole, institutionalSessionOrError } from "../../../../../lib/institutional-auth";
import type { InstitutionalRole } from "../../../../../lib/institutional-types";
import { withSupabaseTransaction } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = {
  concern: ["review", "contact", "refer", "resolve"],
  experience: ["moderate", "reclassify_sensitive", "private_review", "private_facility", "anonymize_preview"],
  facility_change: ["review", "request_info", "reject", "approve"],
} as const;
const EVENT_CONTENT: Record<string, { status: string; title: string; description: string }> = {
  review: { status: "in_review", title: "Revisión iniciada", description: "La organización comenzó la revisión." },
  contact: { status: "contact", title: "Actuación registrada", description: "La organización registró una actuación." },
  refer: { status: "referred", title: "Comunicación derivada", description: "La comunicación fue derivada." },
  resolve: { status: "resolved", title: "Revisión resuelta", description: "La revisión fue cerrada." },
  moderate: { status: "in_review", title: "Experiencia moderada", description: "La experiencia superó una primera moderación privada." },
  reclassify_sensitive: { status: "triage", title: "Reclasificada como preocupación sensible", description: "La experiencia requiere un circuito privado." },
  private_review: { status: "resolved", title: "Revisión privada completada", description: "La experiencia no fue publicada." },
  private_facility: { status: "resolved", title: "Preparada para envío privado", description: "Se aprobó una vista privada para el ELEPEM." },
  anonymize_preview: { status: "in_review", title: "Vista previa anonimizada", description: "Se generó una vista previa; no fue publicada." },
  request_info: { status: "contact", title: "Se solicitó más información", description: "El representante puede responder desde Mi ELEPEM." },
  reject: { status: "closed", title: "Solicitud rechazada", description: "La solicitud no modificó la ficha." },
  approve: { status: "resolved", title: "Cambios aprobados", description: "La ficha central fue actualizada con trazabilidad institucional." },
};

function triagePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  return { immediateDangerReviewed: input.immediateDangerReviewed === true, safeContactRecorded: input.safeContactRecorded === true,
    relatedCasesSearched: input.relatedCasesSearched === true, personWillRecorded: input.personWillRecorded === true,
    priority: ["Alta", "Media", "Baja"].includes(String(input.priority)) ? String(input.priority) : null,
    scope: typeof input.scope === "string" ? input.scope.trim().slice(0, 120) || null : null,
    route: typeof input.route === "string" ? input.route.trim().slice(0, 120) || null : null };
}

async function applyFacilityChanges(client: PoolClient, report: {
  id: string; facility_id: string; submitted_by_user_id: string | null; report_payload: Record<string, unknown>;
}, reviewerId: string) {
  const membership = await client.query(`SELECT 1 FROM public.institutional_accounts AS account
    JOIN public.facility_memberships AS membership ON membership.user_id = account.user_id
    WHERE account.user_id = $1::uuid AND account.role = 'facility_representative' AND account.status = 'active'
      AND membership.elepem_id = $2::bigint AND membership.status = 'active'
      AND (membership.valid_until IS NULL OR membership.valid_until > now())`, [report.submitted_by_user_id, report.facility_id]);
  if (!report.submitted_by_user_id || !membership.rows[0]) throw new Error("La membresía del representante ya no está vigente.");

  const payload = report.report_payload;
  const changes = payload.changes && typeof payload.changes === "object" && !Array.isArray(payload.changes) ? payload.changes as Record<string, unknown> : null;
  const allowed = new Set(["name", "address", "description", "phones", "emails", "monthlyPriceFromUyu"]);
  if (!changes || Object.keys(changes).some((key) => !allowed.has(key))) throw new Error("La solicitud contiene campos no permitidos.");
  const assignments: string[] = []; const values: unknown[] = [report.facility_id]; const fields: string[] = [];
  const add = (column: string, value: unknown, cast = "") => { values.push(value); assignments.push(`${column} = $${values.length}${cast}`); fields.push(column); };
  if (Object.hasOwn(changes, "name")) { const value = typeof changes.name === "string" ? changes.name.trim() : ""; if (!value || value.length > 300) throw new Error("Nombre inválido."); add("nombre", value); }
  if (Object.hasOwn(changes, "address")) { const value = typeof changes.address === "string" ? changes.address.trim() : ""; if (!value || value.length > 500) throw new Error("Dirección inválida."); add("direccion", value); }
  if (Object.hasOwn(changes, "description")) { const value = typeof changes.description === "string" ? changes.description.trim() : ""; if (value.length > 4_000) throw new Error("Descripción inválida."); add("descripcion", value || null); }
  if (Object.hasOwn(changes, "phones")) {
    if (!Array.isArray(changes.phones) || changes.phones.length > 20 || changes.phones.some((item) => typeof item !== "string" || !/^[+()0-9\s.-]{6,40}$/.test(item))) throw new Error("Teléfonos inválidos.");
    add("telefonos", [...new Set(changes.phones)], "::text[]");
  }
  if (Object.hasOwn(changes, "emails")) {
    if (!Array.isArray(changes.emails) || changes.emails.length > 20 || changes.emails.some((item) => typeof item !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))) throw new Error("Correos inválidos.");
    add("emails", [...new Set(changes.emails.map((item) => item.toLowerCase()))], "::text[]");
  }
  let sourceUrl = ""; let sourceDate: string | null = null;
  if (Object.hasOwn(changes, "monthlyPriceFromUyu")) {
    const amount = Number(changes.monthlyPriceFromUyu); sourceDate = typeof payload.priceDate === "string" ? payload.priceDate : null; sourceUrl = typeof payload.priceSourceUrl === "string" ? payload.priceSourceUrl : "";
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000 || !sourceDate || !/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) throw new Error("El precio requiere monto y fecha válidos.");
    try { const url = new URL(sourceUrl); if (!['http:', 'https:'].includes(url.protocol) || url.hostname.toLowerCase().endsWith('supabase.co')) throw new Error(); } catch { throw new Error("El precio requiere una URL pública válida."); }
    add("precio_mensual_uyu", amount, "::integer"); add("precio_fecha", sourceDate, "::date"); add("precio_fuente_url", sourceUrl); add("precio_es_demo", false);
  }
  const expectedPhotoCount = Number(payload.photoCount || 0);
  if (assignments.length === 0 && expectedPhotoCount === 0) throw new Error("No hay cambios aprobables.");

  const before = await client.query<{ state: Record<string, unknown> }>("SELECT to_jsonb(elepem) AS state FROM public.elepem WHERE id = $1::bigint FOR UPDATE", [report.facility_id]);
  if (!before.rows[0]) throw new Error("El ELEPEM ya no existe.");
  values.push("Declaración de representante autorizado"); const ref = values.length;
  values.push(sourceUrl); const url = values.length;
  values.push(sourceDate); const date = values.length;
  values.push(fields.join(",")); const backed = values.length;
  const updated = await client.query<{ state: Record<string, unknown> }>(`UPDATE public.elepem SET ${assignments.join(", ")}${assignments.length ? "," : ""}
    fuentes_referencias = array_append(fuentes_referencias, $${ref}), fuentes_urls = array_append(fuentes_urls, $${url}),
    fuentes_tipos = array_append(fuentes_tipos, 'declaracion_institucional'), fuentes_proveedores = array_append(fuentes_proveedores, 'Representante ELEPEM'),
    fuentes_fechas = array_append(fuentes_fechas, $${date}::date), fuentes_consultadas_at = array_append(fuentes_consultadas_at, now()),
    fuentes_campos_respaldados = array_append(fuentes_campos_respaldados, $${backed}), updated_at = now()
    WHERE id = $1::bigint RETURNING to_jsonb(elepem) AS state`, values);
  if (!updated.rows[0]) throw new Error("No se pudo actualizar el ELEPEM.");
  await client.query(`INSERT INTO elepem_core.audit_log (entity_type, entity_key, action, actor_identifier, before_state, after_state, request_id)
    VALUES ('elepem', $1, 'institutional_facility_change_approved', $2, $3::jsonb, $4::jsonb, $5)`,
    [report.facility_id, reviewerId, JSON.stringify(before.rows[0].state), JSON.stringify(updated.rows[0].state), report.id]);

  const photos = await client.query<{ id: string; sha256_hex: string }>(`SELECT id, sha256_hex FROM public.intake_report_attachments
    WHERE report_id = $1 AND purpose = 'facility_photo' AND mime_type LIKE 'image/%'
      AND rights_metadata->>'rightsConfirmed' = 'true' AND sha256_hex ~ '^[a-f0-9]{64}$' ORDER BY created_at, id`, [report.id]);
  if (photos.rows.length !== expectedPhotoCount) throw new Error("La cantidad de fotos autorizadas no coincide con la solicitud.");
  if (photos.rows.length) {
    const publication = await client.query<{ id: string }>(`INSERT INTO public.facility_change_publications (report_id, facility_id, remove_current_photo, reviewer)
      VALUES ($1, $2::bigint, false, $3) ON CONFLICT (report_id) DO NOTHING RETURNING id`, [report.id, report.facility_id, reviewerId]);
    const publicationId = publication.rows[0]?.id; if (!publicationId) throw new Error("La solicitud ya fue publicada.");
    for (const [position, photo] of photos.rows.entries()) await client.query(`INSERT INTO public.facility_change_publication_photos
      (publication_id, attachment_id, position, public_object_path, public_sha256_hex) VALUES ($1, $2, $3, $4, $5)`,
      [publicationId, photo.id, position, `elepem/${report.facility_id}/${report.id}-${position}`, photo.sha256_hex]);
  }
  return photos.rows.length;
}

export async function POST(request: NextRequest) {
  const auth = await institutionalSessionOrError(request, "moderator"); if (!auth.session) return auth.response;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const reportId = typeof input.reportId === "string" ? input.reportId : ""; const action = typeof input.action === "string" ? input.action : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 4_000) : ""; const triage = triagePayload(input.triage);
  if (!UUID.test(reportId)) return NextResponse.json({ error: "Expediente inválido." }, { status: 400 });
  try {
    const result = await withSupabaseTransaction(async (client) => {
      const reviewer = await client.query<{ role: InstitutionalRole }>("SELECT role FROM public.institutional_accounts WHERE user_id = $1::uuid AND status = 'active'", [auth.session.userId]);
      if (!reviewer.rows[0]) return { error: "La cuenta revisora ya no está activa.", httpStatus: 403 as const };
      const rows = await client.query<{ id: string; entry_type: keyof typeof ACTIONS; report_payload: Record<string, unknown>; facility_id: string | null; submitted_by_user_id: string | null; current_status: string }>(
        "SELECT id, entry_type, report_payload, facility_id::text, submitted_by_user_id::text, current_status FROM public.intake_reports WHERE id = $1 FOR UPDATE", [reportId]);
      const report = rows.rows[0]; if (!report) return { error: "No se encontró el expediente.", httpStatus: 404 as const };
      const requiredRole: InstitutionalRole = report.entry_type === "experience" ? "moderator" : "administrator";
      if (!canUseInstitutionalRole(reviewer.rows[0].role, requiredRole)) {
        return { error: "La función institucional no permite revisar este expediente.", httpStatus: 403 as const };
      }
      if (!(ACTIONS[report.entry_type] as readonly string[]).includes(action)) return { error: "Decisión no permitida.", httpStatus: 400 as const };
      if (action === "approve" && report.current_status === "resolved") {
        const prior = await client.query("SELECT 1 FROM public.intake_report_events WHERE report_id = $1 AND event_data->>'decision' = 'approve' LIMIT 1", [reportId]);
        if (prior.rows[0]) return { status: "resolved", entryType: report.entry_type, publishedPhotoCount: 0, idempotent: true };
      }
      if (report.entry_type === "facility_change" && ["resolved", "closed"].includes(report.current_status)) {
        return { error: "La solicitud ya está cerrada.", httpStatus: 409 as const };
      }
      let publishedPhotoCount = 0;
      if (action === "approve") {
        if (report.entry_type !== "facility_change" || !report.facility_id) throw new Error("La aprobación requiere un ELEPEM real.");
        publishedPhotoCount = await applyFacilityChanges(client, { ...report, facility_id: report.facility_id }, auth.session.userId);
      }
      const content = EVENT_CONTENT[action]; const nextType = action === "reclassify_sensitive" ? "concern" : report.entry_type;
      await client.query(`WITH updated AS (UPDATE public.intake_reports SET current_status = $2, entry_type = $3,
        priority = COALESCE($8, priority), updated_at = now() WHERE id = $1 RETURNING id)
        INSERT INTO public.intake_report_events (report_id, status, public_title, public_description, internal_note, event_data, actor)
        SELECT id, $2, $4, $5, NULLIF($6, ''), $7::jsonb, 'state' FROM updated`,
        [reportId, content.status, nextType, content.title, content.description, note, JSON.stringify({ decision: action, triage, userId: auth.session.userId }), triage?.priority]);
      return { status: content.status, entryType: nextType, publishedPhotoCount, idempotent: false };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    if (action === "approve") { revalidatePath("/"); revalidatePath("/institucional/elepem"); }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Institutional decision failed.", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la decisión." }, { status: 409 });
  }
}
