import { NextRequest, NextResponse } from "next/server";
import { querySupabaseDatabase } from "../../../../../../lib/supabase-db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ facilityKey: string; photoId: string }> },
) {
  const { facilityKey: rawFacilityKey, photoId } = await context.params;
  const facilityKey = decodeURIComponent(rawFacilityKey || "").trim();
  if (!facilityKey || facilityKey.length > 240 || /[\u0000-\u001f]/.test(facilityKey) || !UUID.test(photoId)) {
    return NextResponse.json({ error: "Foto pública inválida." }, { status: 400 });
  }

  const rows = await querySupabaseDatabase<{
    object_path: string;
    file_name: string;
    mime_type: string;
  }>(
    `SELECT attachment.object_path, attachment.file_name, attachment.mime_type
     FROM public.facility_change_publication_photos AS photo
     JOIN public.facility_change_publications AS publication
       ON publication.id = photo.publication_id
     JOIN public.intake_report_attachments AS attachment
       ON attachment.id = photo.attachment_id
     LEFT JOIN public.elepem AS facility ON facility.id = publication.facility_id
     LEFT JOIN arandu_demo.facilities AS demo ON demo.id = publication.demo_facility_id
     WHERE photo.id = $1
       AND COALESCE(facility.codigo, demo.id) = $2
       AND attachment.purpose = 'facility_photo'
       AND attachment.mime_type LIKE 'image/%'
       AND attachment.rights_metadata->>'rightsConfirmed' = 'true'
       AND publication.id = (
         SELECT latest.id
         FROM public.facility_change_publications AS latest
         WHERE latest.facility_id IS NOT DISTINCT FROM publication.facility_id
           AND latest.demo_facility_id IS NOT DISTINCT FROM publication.demo_facility_id
         ORDER BY latest.published_at DESC, latest.id DESC
         LIMIT 1
       )
     LIMIT 1`,
    [photoId, facilityKey],
  );
  const photo = rows[0];
  if (!photo) return NextResponse.json({ error: "Foto pública no encontrada." }, { status: 404 });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "El servidor de imágenes no está configurado." }, { status: 503 });
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${photo.object_path}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "No se pudo cargar la foto pública." }, { status: 502 });

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": photo.mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(photo.file_name)}`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
