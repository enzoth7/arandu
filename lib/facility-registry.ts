import { querySupabaseDatabase } from "./supabase-db";
import type { Facility } from "../app/components/map-types";
import type { DemoFacilityProfile } from "./institutional-types";

type FlatElepemRow = Record<string, unknown> & {
  canonical_id: string;
  codigo: string;
  legacy_id: string | null;
  nombre: string;
  nombres_alternativos: string[];
  departamento: string;
  localidad: string;
  direccion: string;
  lat: number;
  lng: number;
  precision_ubicacion: Facility["precision"];
  precision_etiqueta: string;
  telefonos: string[];
  emails: string[];
  sitios_web: string[];
  instagram_urls: string[];
  facebook_urls: string[];
  precio_mensual_uyu: number | null;
  precio_fecha: string | null;
  precio_incluye: string[];
  precio_es_demo: boolean;
  msp_habilitado: boolean;
  mides_certificado: boolean;
  situacion: "habilitacion_msp" | "certificado_social_mides" | "situacion_no_confirmada";
  descripcion: string | null;
  imagen_url: string | null;
  imagen_alt: string | null;
  fuentes_referencias: string[];
  fuentes_urls: string[];
  fuentes_proveedores: string[];
  fuentes_fechas: Array<string | null>;
  fuentes_consultadas_at: Array<string | Date | null>;
  fuentes_campos_respaldados: string[];
  approved_photo_paths: string[] | null;
  approved_remove_current_photo: boolean | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const FACILITY_PHOTO_BUCKET = "intake-evidence";

function publicStoragePhotoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const supabaseUrl = String(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  if (!supabaseUrl) return "";
  const encodedPath = value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${FACILITY_PHOTO_BUCKET}/${encodedPath}`;
}

function safePublicUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (url.hostname.toLocaleLowerCase("en-US").endsWith("supabase.co")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function isoDate(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function sourceLinks(row: FlatElepemRow): NonNullable<Facility["sourceLinks"]> {
  const result: NonNullable<Facility["sourceLinks"]> = [];
  const seen = new Set<string>();
  for (let index = 0; index < row.fuentes_referencias.length; index += 1) {
    const url = safePublicUrl(row.fuentes_urls[index]);
    if (!url) continue;
    const provider = String(row.fuentes_proveedores[index] || "").trim();
    const reference = String(row.fuentes_referencias[index] || "").trim();
    const label = (provider || reference || "Fuente pública").slice(0, 200);
    const key = `${label}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      label,
      url,
      sourceDate: row.fuentes_fechas[index] || undefined,
      retrievedAt: isoDate(row.fuentes_consultadas_at[index]),
      backedFields: String(row.fuentes_campos_respaldados[index] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }
  return result;
}

function statusGroup(row: FlatElepemRow): Facility["statusGroup"] {
  if (row.msp_habilitado) return "habilitado";
  if (row.mides_certificado) return "mides";
  return "verificar";
}

function statusShort(row: FlatElepemRow) {
  if (row.msp_habilitado) return "Habilitación MSP";
  if (row.mides_certificado) return "Certificado social MIDES";
  return "Situación no confirmada";
}

function toFacility(row: FlatElepemRow): Facility {
  const links = sourceLinks(row);
  const approvedPhotoUrls = Array.isArray(row.approved_photo_paths)
    ? row.approved_photo_paths.map(publicStoragePhotoUrl).filter(Boolean)
    : [];
  const photoUrls = [
    ...approvedPhotoUrls,
    ...(!row.approved_remove_current_photo && row.imagen_url ? [row.imagen_url] : []),
  ];
  const providers = [...new Set(row.fuentes_proveedores.map((item) => String(item || "").trim()).filter(Boolean))];
  return {
    id: row.codigo,
    legacyId: row.legacy_id || undefined,
    name: row.nombre,
    alternativeNames: row.nombres_alternativos,
    department: row.departamento,
    locality: row.localidad,
    address: row.direccion,
    lat: row.lat,
    lng: row.lng,
    precision: row.precision_ubicacion,
    precisionLabel: row.precision_etiqueta,
    situacion: row.situacion,
    statusGroup: statusGroup(row),
    statusShort: statusShort(row),
    sourceLabel: providers.join(" + ") || "Referencia conservada sin URL pública",
    mspFinal: row.msp_habilitado,
    midesSocial: row.mides_certificado,
    sourceUrl: links[0]?.url,
    sourceLinks: links,
    contactPhone: row.telefonos[0] || undefined,
    contactPhones: row.telefonos,
    contactEmail: row.emails[0] || undefined,
    contactEmails: row.emails,
    websites: row.sitios_web,
    instagramUrls: row.instagram_urls,
    facebookUrls: row.facebook_urls,
    description: row.descripcion || undefined,
    photoUrl: photoUrls[0] || undefined,
    photoUrls,
    monthlyPriceUyu: row.precio_mensual_uyu ?? undefined,
    monthlyPriceAsOf: row.precio_fecha || undefined,
    monthlyPriceIncludes: row.precio_incluye,
    priceIsDemo: row.precio_es_demo,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
  };
}

export async function loadPublicFacilities(): Promise<{ facilities: Facility[]; dataSource: string }> {
  const rows = await querySupabaseDatabase<FlatElepemRow>(`
    select
      registry.id::text as canonical_id,
      registry.codigo,
      registry.legacy_id,
      registry.nombre,
      registry.nombres_alternativos,
      registry.departamento,
      registry.localidad,
      registry.direccion,
      registry.lat,
      registry.lng,
      registry.precision_ubicacion,
      registry.precision_etiqueta,
      registry.telefonos,
      registry.emails,
      registry.sitios_web,
      registry.instagram_urls,
      registry.facebook_urls,
      registry.precio_mensual_uyu,
      registry.precio_fecha,
      registry.precio_incluye,
      registry.precio_es_demo,
      registry.msp_habilitado,
      registry.mides_certificado,
      registry.situacion,
      registry.descripcion,
      registry.imagen_url,
      registry.imagen_alt,
      registry.fuentes_referencias,
      registry.fuentes_urls,
      registry.fuentes_proveedores,
      registry.fuentes_fechas,
      registry.fuentes_consultadas_at,
      registry.fuentes_campos_respaldados,
      approved_photos.photo_paths as approved_photo_paths,
      approved_photos.remove_current_photo as approved_remove_current_photo,
      registry.created_at,
      registry.updated_at
    from public.elepem as registry
    left join lateral (
      select
        coalesce(bool_or(publication.remove_current_photo), false) as remove_current_photo,
        coalesce(array_agg(
          attachment.object_path
          order by report.created_at, publication.report_id, photo.position
        ) filter (where storage_object.id is not null), '{}')::text[] as photo_paths
      from public.facility_change_publications as publication
      join public.intake_reports as report on report.id = publication.report_id
      left join public.facility_change_publication_photos as photo on photo.publication_id = publication.id
      left join public.intake_report_attachments as attachment
        on attachment.id = photo.attachment_id
       and attachment.bucket_id = 'intake-evidence'
       and attachment.purpose = 'facility_photo'
       and attachment.mime_type like 'image/%'
       and attachment.rights_metadata->>'rightsConfirmed' = 'true'
      left join storage.objects as storage_object
        on storage_object.bucket_id = attachment.bucket_id
       and storage_object.name = attachment.object_path
      where publication.facility_id = registry.id
        and publication.publication_batch_id = (
          select latest.publication_batch_id
          from public.facility_change_publications as latest
          where latest.facility_id = registry.id
          order by latest.published_at desc, latest.id desc
          limit 1
        )
    ) as approved_photos on true
    order by registry.departamento, registry.nombre, registry.codigo
  `);
  return { facilities: rows.map(toFacility), dataSource: "public.elepem" };
}

export async function loadAssignedFacilityProfiles(
  facilityKeys: readonly string[],
): Promise<DemoFacilityProfile[]> {
  if (facilityKeys.length === 0) return [];
  const rows = await querySupabaseDatabase<{
    id: DemoFacilityProfile["id"];
    name: string;
    locality: string;
    department: string;
    address: string;
    description: string;
    image_url: string;
    image_alt: string;
    approved_photo_paths: string[] | null;
    approved_remove_current_photo: boolean | null;
    phone: string;
    email: string;
    monthly_price_from_uyu: number;
    price_as_of: string;
    price_includes: string[];
  }>(`
    select
      facility.id,
      facility.name,
      facility.locality,
      facility.department,
      facility.address,
      facility.description,
      facility.image_url,
      facility.image_alt,
      approved_photos.photo_paths as approved_photo_paths,
      approved_photos.remove_current_photo as approved_remove_current_photo,
      facility.phone,
      facility.email,
      facility.monthly_price_from_uyu,
      facility.price_as_of,
      facility.price_includes
    from arandu_demo.facilities as facility
    left join lateral (
      select
        coalesce(bool_or(publication.remove_current_photo), false) as remove_current_photo,
        coalesce(array_agg(
          attachment.object_path
          order by report.created_at, publication.report_id, photo.position
        ) filter (where storage_object.id is not null), '{}')::text[] as photo_paths
      from public.facility_change_publications as publication
      join public.intake_reports as report on report.id = publication.report_id
      left join public.facility_change_publication_photos as photo on photo.publication_id = publication.id
      left join public.intake_report_attachments as attachment
        on attachment.id = photo.attachment_id
       and attachment.bucket_id = 'intake-evidence'
       and attachment.purpose = 'facility_photo'
       and attachment.mime_type like 'image/%'
       and attachment.rights_metadata->>'rightsConfirmed' = 'true'
      left join storage.objects as storage_object
        on storage_object.bucket_id = attachment.bucket_id
       and storage_object.name = attachment.object_path
      where publication.demo_facility_id = facility.id
        and publication.publication_batch_id = (
          select latest.publication_batch_id
          from public.facility_change_publications as latest
          where latest.demo_facility_id = facility.id
          order by latest.published_at desc, latest.id desc
          limit 1
        )
    ) as approved_photos on true
    where facility.id = any($1::text[]) and facility.active and facility.is_test
    order by facility.name
  `, [[...facilityKeys]]);
  return rows.map((row) => {
    const approvedUrls = Array.isArray(row.approved_photo_paths)
      ? row.approved_photo_paths.map(publicStoragePhotoUrl).filter(Boolean)
      : [];
    const imageUrls = [...approvedUrls, ...(!row.approved_remove_current_photo ? [row.image_url] : [])];
    return {
      id: row.id,
      name: row.name,
      locality: row.locality,
      department: row.department,
      address: row.address,
      description: row.description,
      imageUrl: imageUrls[0] || row.image_url,
      imageUrls,
      imageAlt: row.image_alt,
      phone: row.phone,
      email: row.email,
      monthlyPriceFromUyu: row.monthly_price_from_uyu,
      priceVerifiedAt: row.price_as_of,
      priceIncludes: row.price_includes,
    };
  });
}

export async function loadPublicFacilitiesOrEmpty(): Promise<Facility[]> {
  try {
    return (await loadPublicFacilities()).facilities;
  } catch (error) {
    console.error("No se pudo precargar el listado de ELEPEM en el servidor.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function publicFacilityExists(value: string): Promise<boolean> {
  const rows = await querySupabaseDatabase<{ exists: boolean }>(`
    select exists (
      select 1 from public.elepem where codigo = $1 or legacy_id = $1
    ) as exists
  `, [value]);
  return rows[0]?.exists === true;
}

export type PublicFacilityReference = {
  id: number;
  key: string;
  name: string;
  locality: string;
  department: string;
};

export async function resolvePublicFacilityReference(value: string): Promise<PublicFacilityReference | null> {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key || key.length > 240 || /[\u0000-\u001f]/.test(key)) return null;
  const rows = await querySupabaseDatabase<{
    id: string;
    codigo: string;
    nombre: string;
    localidad: string;
    departamento: string;
  }>(`
    select id::text, codigo, nombre, localidad, departamento
    from public.elepem
    where codigo = $1 or legacy_id = $1
    order by case when codigo = $1 then 0 else 1 end, id
    limit 1
  `, [key]);
  const row = rows[0];
  const id = Number(row?.id);
  if (!row || !Number.isSafeInteger(id) || id <= 0) return null;
  return { id, key: row.codigo, name: row.nombre, locality: row.localidad, department: row.departamento };
}

export async function demoFacilityExists(value: string): Promise<boolean> {
  if (!/^DEMO-ELEPEM-00[1-3]$/.test(value)) return false;
  const rows = await querySupabaseDatabase<{ exists: boolean }>(`
    select exists (
      select 1 from arandu_demo.facilities where id = $1 and active and is_test
    ) as exists
  `, [value]);
  return rows[0]?.exists === true;
}

type DemoMapFacilityRow = {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
  monthly_price_from_uyu: number | null;
  price_as_of: string | null;
  price_includes: string[];
  image_url: string;
  approved_photo_paths: string[] | null;
  approved_remove_current_photo: boolean | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export async function loadDemoMapFacilitiesOrEmpty(enabled: boolean): Promise<Facility[]> {
  if (!enabled) return [];
  try {
    const rows = await querySupabaseDatabase<DemoMapFacilityRow>(`
      select
        facility.id, facility.name, facility.department, facility.locality,
        facility.address, facility.description, facility.phone, facility.email,
        facility.lat, facility.lng, facility.monthly_price_from_uyu,
        facility.price_as_of, facility.price_includes, facility.image_url,
        approved_photos.photo_paths as approved_photo_paths,
        approved_photos.remove_current_photo as approved_remove_current_photo,
        facility.created_at, facility.updated_at
      from arandu_demo.facilities as facility
      left join lateral (
        select
          coalesce(bool_or(publication.remove_current_photo), false) as remove_current_photo,
          coalesce(array_agg(
            attachment.object_path
            order by report.created_at, publication.report_id, photo.position
          ) filter (where storage_object.id is not null), '{}')::text[] as photo_paths
        from public.facility_change_publications as publication
        join public.intake_reports as report on report.id = publication.report_id
        left join public.facility_change_publication_photos as photo on photo.publication_id = publication.id
        left join public.intake_report_attachments as attachment
          on attachment.id = photo.attachment_id
         and attachment.bucket_id = 'intake-evidence'
         and attachment.purpose = 'facility_photo'
         and attachment.mime_type like 'image/%'
         and attachment.rights_metadata->>'rightsConfirmed' = 'true'
        left join storage.objects as storage_object
          on storage_object.bucket_id = attachment.bucket_id
         and storage_object.name = attachment.object_path
        where publication.demo_facility_id = facility.id
          and publication.publication_batch_id = (
            select latest.publication_batch_id
            from public.facility_change_publications as latest
            where latest.demo_facility_id = facility.id
            order by latest.published_at desc, latest.id desc
            limit 1
          )
      ) as approved_photos on true
      where facility.active and facility.is_test and facility.id = 'DEMO-ELEPEM-001'
      order by facility.id
    `);
    const publicReferenceText = (value: string) => value
      .replace(/\s*\([^)]*fictici[^)]*\)\s*$/i, "")
      .replace(/Demostraci[oó]n/gi, "de la Costa")
      .trim();
    return rows.map((row) => {
      const approvedPhotoUrls = Array.isArray(row.approved_photo_paths)
        ? row.approved_photo_paths.map(publicStoragePhotoUrl).filter(Boolean)
        : [];
      const photoUrls = [
        ...approvedPhotoUrls,
        ...(!row.approved_remove_current_photo && row.image_url ? [row.image_url] : []),
      ];
      return {
        id: row.id,
        name: row.name,
        department: row.department,
        locality: publicReferenceText(row.locality),
        address: publicReferenceText(row.address),
        lat: row.lat,
        lng: row.lng,
        precision: "referencial",
        precisionLabel: "Ubicación aproximada",
        situacion: "demo",
        statusGroup: "app",
        statusShort: "Referencia Arandú",
        sourceLabel: "Arandú",
        mspFinal: false,
        midesSocial: false,
        contactPhone: row.phone || undefined,
        contactPhones: row.phone ? [row.phone] : [],
        contactEmail: row.email || undefined,
        contactEmails: row.email ? [row.email] : [],
        description: row.description,
        photoUrl: photoUrls[0] || undefined,
        photoUrls,
        monthlyPriceUyu: row.monthly_price_from_uyu ?? undefined,
        monthlyPriceAsOf: row.price_as_of ?? undefined,
        monthlyPriceIncludes: row.price_includes,
        priceIsDemo: row.monthly_price_from_uyu !== null,
        qualityRating: "good",
        createdAt: isoDate(row.created_at),
        updatedAt: isoDate(row.updated_at),
        isDemo: true,
      };
    });
  } catch (error) {
    console.error("No se pudo cargar la capa ficticia del mapa.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}
