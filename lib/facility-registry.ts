import {
  publicFacilityRelation,
  runtimeElepemDataSource,
} from "./elepem-data-source.mjs";
import { classifyRegistryRow } from "./facility-sources.mjs";
import { querySupabaseDatabase } from "./supabase-db";
import type { Facility } from "../app/components/map-types";
import type { DemoFacilityProfile } from "./institutional-types";

// Lectura del padrón público. Vive acá para que la ruta `/api/residenciales` y
// los componentes de servidor usen exactamente el mismo mapeo fila → ficha: la
// página no hace un salto HTTP contra su propia API sólo para reutilizar esto.

type ResidentialRow = Record<string, unknown> & {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  lat: number;
  lng: number;
  precision: Facility["precision"];
  precision_label: string;
  status_group: "habilitado" | "registro" | "verificar" | "app";
  status_stage: string;
  status_short: string;
  source_label: string;
  msp_final: boolean;
  msp_registro_historico: boolean;
  mides_social: boolean;
  pacp: boolean;
  other_source: boolean;
  created_at: string;
  updated_at: string;
  source_url?: string | null;
  source_links?: unknown;
  demo_monthly_price_uyu?: number | null;
  demo_price_as_of?: string | null;
  demo_price_includes?: string[] | null;
  is_demo?: boolean;
  public_description?: string | null;
  public_image_url?: string | null;
  public_image_alt?: string | null;
  public_contact_phone?: string | null;
  public_contact_email?: string | null;
};

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

function sourceLinks(value: unknown): NonNullable<Facility["sourceLinks"]> {
  if (!Array.isArray(value)) return [];
  const links: NonNullable<Facility["sourceLinks"]> = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const url = safePublicUrl(row.url);
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 200) : "";
    if (!url || !label || seen.has(`${label}:${url}`)) continue;
    seen.add(`${label}:${url}`);
    links.push({
      label,
      url,
      sourceDate: typeof row.sourceDate === "string" ? row.sourceDate : undefined,
      retrievedAt: typeof row.retrievedAt === "string" ? row.retrievedAt : undefined,
    });
  }
  return links;
}

function deriveStatusGroup(row: ResidentialRow): Facility["statusGroup"] {
  if (row.is_demo) return "app";
  if (row.status_group === "app") return "app";
  if (row.status_group === "verificar") return "verificar";
  if (row.msp_final) return "habilitado";
  if (row.mides_social) return "mides";
  if (row.msp_registro_historico) return "registro";
  return "otra_fuente";
}

function isOtherSource(row: ResidentialRow) {
  return (
    row.status_group !== "verificar" &&
    row.status_group !== "app" &&
    !row.msp_final &&
    !row.msp_registro_historico &&
    !row.mides_social &&
    row.other_source && !row.pacp
  );
}

function toFacility(row: ResidentialRow): Facility {
  const otherSource = isOtherSource(row);
  const links = sourceLinks(row.source_links);
  const monthlyPriceUyu = (
    typeof row.demo_monthly_price_uyu === "number"
    && (row.msp_final || row.mides_social)
  ) ? row.demo_monthly_price_uyu : undefined;
  const hasPublishedPrice = typeof monthlyPriceUyu === "number";
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    locality: row.locality,
    address: row.address,
    places: row.places,
    lat: row.lat,
    lng: row.lng,
    precision: row.precision,
    precisionLabel: row.precision_label,
    statusGroup: deriveStatusGroup(row),
    statusStage: row.status_stage,
    statusShort:
      otherSource && !row.pacp
        ? "Webs y directorios públicos · pendiente de clasificación detallada"
        : row.status_short,
    sourceLabel: row.source_label,
    mspFinal: row.msp_final,
    mspRegistroHistorico: row.msp_registro_historico,
    midesSocial: row.mides_social,
    pacp: row.pacp,
    otherSource,
    pendingVerification: row.status_group === "verificar",
    appDiscovered: row.status_group === "app",
    sourceCategories: classifyRegistryRow({
      official: Boolean(row.msp_final || row.msp_registro_historico || row.mides_social || row.pacp),
      sourceLabel: String(row.source_label || ""),
      otherSource,
    }),
    privateCandidate: false,
    isDemo: row.is_demo === true,
    sourceUrl: safePublicUrl(row.source_url) || links[0]?.url,
    sourceLinks: links,
    contactPhone: row.public_contact_phone || undefined,
    contactEmail: row.public_contact_email || undefined,
    description: row.public_description || undefined,
    photoUrl: row.public_image_url || undefined,
    monthlyPriceUyu,
    monthlyPriceAsOf: hasPublishedPrice && row.demo_price_as_of ? row.demo_price_as_of : undefined,
    monthlyPriceIncludes: hasPublishedPrice && Array.isArray(row.demo_price_includes)
      ? row.demo_price_includes.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadPublicFacilities(): Promise<{ facilities: Facility[]; dataSource: string }> {
  const dataSource = runtimeElepemDataSource();
  const relation = publicFacilityRelation(dataSource);
  const unifiedProjection = dataSource === "normalized" ? `
      registry.source_url,
      registry.source_links,
      coalesce(profile.monthly_price_from_uyu, registry.demo_monthly_price_uyu) as demo_monthly_price_uyu,
      coalesce(profile.price_as_of, registry.demo_price_as_of) as demo_price_as_of,
      coalesce(profile.price_includes, registry.demo_price_includes) as demo_price_includes,
      profile.description as public_description,
      profile.image_url as public_image_url,
      profile.image_alt as public_image_alt,
      profile.contact_phone as public_contact_phone,
      profile.contact_email as public_contact_email,
      canonical.is_demo,
  ` : `
      null::text as source_url,
      '[]'::jsonb as source_links,
      null::integer as demo_monthly_price_uyu,
      null::date as demo_price_as_of,
      '{}'::text[] as demo_price_includes,
      null::text as public_description,
      null::text as public_image_url,
      null::text as public_image_alt,
      null::text as public_contact_phone,
      null::text as public_contact_email,
      false as is_demo,
  `;
  const profileJoin = dataSource === "normalized" ? `
    left join elepem_core.facilities as canonical
      on canonical.facility_key = registry.id
    left join elepem_core.facility_public_profiles as profile
      on profile.facility_id = canonical.id
  ` : "";
  const sourceLabelProjection = dataSource === "normalized"
    ? "coalesce(nullif(registry.source_label, 'Fuente pendiente de vincular'), canonical.primary_source_label, registry.source_label) as source_label"
    : "registry.source_label";
  const rows = await querySupabaseDatabase<ResidentialRow>(`
    select
      registry.id,
      registry.name,
      registry.department,
      registry.locality,
      registry.address,
      registry.places,
      registry.lat,
      registry.lng,
      registry.precision,
      registry.precision_label,
      registry.status_group,
      registry.status_stage,
      registry.status_short,
      ${sourceLabelProjection},
      registry.msp_final,
      registry.msp_registro_historico,
      registry.mides_social,
      registry.pacp,
      registry.other_source,
      ${unifiedProjection}
      registry.created_at,
      registry.updated_at
    from ${relation} as registry
    ${profileJoin}
    order by registry.department, registry.name, registry.id
  `);

  return { facilities: rows.map(toFacility), dataSource };
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
    contact_phone: string | null;
    contact_email: string | null;
    monthly_price_from_uyu: number;
    price_as_of: string;
    price_includes: string[];
  }>(`
    select
      facility.facility_key as id,
      preferred_name.name,
      current_address.locality,
      current_address.department,
      current_address.address_line as address,
      profile.description,
      profile.image_url,
      profile.image_alt,
      profile.contact_phone,
      profile.contact_email,
      profile.monthly_price_from_uyu,
      profile.price_as_of,
      profile.price_includes
    from elepem_core.facilities as facility
    join lateral (
      select name.name
      from elepem_core.facility_names as name
      where name.facility_id = facility.id and name.is_preferred
      order by name.id desc limit 1
    ) as preferred_name on true
    join lateral (
      select address.address_line, address.locality, address.department
      from elepem_core.facility_addresses as address
      where address.facility_id = facility.id
        and address.is_current and address.address_type = 'physical'
      order by address.id desc limit 1
    ) as current_address on true
    join elepem_core.facility_public_profiles as profile
      on profile.facility_id = facility.id
    where facility.facility_key = any($1::text[])
      and facility.is_demo = true
      and facility.lifecycle_status = 'current'
      and facility.registry_visibility = 'public'
    order by preferred_name.name
  `, [[...facilityKeys]]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    locality: row.locality,
    department: row.department,
    address: row.address,
    description: row.description,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    phone: row.contact_phone || "",
    email: row.contact_email || "",
    monthlyPriceFromUyu: row.monthly_price_from_uyu,
    priceVerifiedAt: row.price_as_of,
    priceIncludes: row.price_includes,
  }));
}

/** Igual que `loadPublicFacilities`, pero nunca lanza: para el primer render. */
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

export async function publicFacilityExists(id: string): Promise<boolean> {
  const dataSource = runtimeElepemDataSource();
  const relation = publicFacilityRelation(dataSource);
  const rows = await querySupabaseDatabase<{ exists: boolean }>(`
    select exists (
      select 1
      from ${relation}
      where id = $1
    ) as exists
  `, [id]);
  return rows[0]?.exists === true;
}

export type PublicFacilityReference = {
  id: number;
  key: string;
  name: string;
  locality: string;
  department: string;
};

/**
 * Resuelve tanto la clave canonica publicada como un id legado mapeado. La
 * referencia solo se acepta si el ELEPEM sigue visible en el padron unificado;
 * esto evita adjuntar experiencias a candidatos o identidades retenidas.
 */
export async function resolvePublicFacilityReference(value: string): Promise<PublicFacilityReference | null> {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key || key.length > 240 || /[\u0000-\u001f]/.test(key)) return null;
  const rows = await querySupabaseDatabase<{
    id: string;
    facility_key: string;
    name: string;
    locality: string;
    department: string;
  }>(`
    with resolved as (
      select facility.id, facility.facility_key,
        case when facility.facility_key = $1 then 0 else 1 end as resolution_order
      from elepem_core.facilities as facility
      left join elepem_core.legacy_facility_map as legacy
        on legacy.facility_id = facility.id
       and legacy.mapping_status = 'mapped'
      where facility.facility_key = $1 or legacy.legacy_residencial_id = $1
      order by resolution_order, facility.id
      limit 1
    )
    select
      facility.id::text as id,
      facility.facility_key,
      preferred_name.name,
      current_address.locality,
      current_address.department
    from resolved
    join elepem_core.facilities as facility on facility.id = resolved.id
    join lateral (
      select name.name
      from elepem_core.facility_names as name
      where name.facility_id = facility.id and name.is_preferred
      order by name.id desc limit 1
    ) as preferred_name on true
    join lateral (
      select address.locality, address.department
      from elepem_core.facility_addresses as address
      where address.facility_id = facility.id
        and address.is_current and address.address_type = 'physical'
      order by address.id desc limit 1
    ) as current_address on true
    where facility.lifecycle_status = 'current'
      and facility.identity_status = 'confirmed_facility'
      and facility.registry_visibility = 'public'
      and facility.location_status = 'mapped'
    limit 1
  `, [key]);
  const row = rows[0];
  const id = Number(row?.id);
  if (!row || !Number.isSafeInteger(id) || id <= 0) return null;
  return {
    id,
    key: row.facility_key,
    name: row.name,
    locality: row.locality,
    department: row.department,
  };
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
  monthly_price_from_uyu: number;
  price_as_of: string;
  price_includes: string[];
  image_url: string;
  created_at: string;
  updated_at: string;
};

/** Capa ficticia aislada: se consulta solamente en modo demostración. */
export async function loadDemoMapFacilitiesOrEmpty(enabled: boolean): Promise<Facility[]> {
  if (!enabled) return [];
  try {
    const rows = await querySupabaseDatabase<DemoMapFacilityRow>(`
      select
        id, name, department, locality, address, description, phone, email,
        lat, lng, monthly_price_from_uyu, price_as_of, price_includes,
        image_url, created_at, updated_at
      from arandu_demo.facilities
      where active and is_test
      order by id
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      department: row.department,
      locality: row.locality,
      address: row.address,
      places: null,
      lat: row.lat,
      lng: row.lng,
      precision: "referencial",
      precisionLabel: "Ubicación ficticia aproximada para demostración",
      statusGroup: "app",
      statusStage: "demo_test",
      statusShort: "Datos ficticios",
      sourceLabel: "Prueba de Arandú · datos ficticios",
      mspFinal: false,
      mspRegistroHistorico: false,
      midesSocial: false,
      pacp: false,
      otherSource: false,
      pendingVerification: false,
      appDiscovered: false,
      sourceCategories: [],
      privateCandidate: false,
      contactPhone: row.phone,
      contactEmail: row.email,
      description: row.description,
      photoUrl: row.image_url,
      monthlyPriceUyu: row.monthly_price_from_uyu,
      monthlyPriceAsOf: row.price_as_of,
      monthlyPriceIncludes: row.price_includes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDemo: true,
    }));
  } catch (error) {
    console.error("No se pudo cargar la capa ficticia del mapa.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}
