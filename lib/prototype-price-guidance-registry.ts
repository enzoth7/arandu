import { querySupabaseDatabase } from "./supabase-db";
import type {
  PrototypePriceConfidence,
  PrototypePriceGuidance,
  PrototypePriceGuidanceType,
} from "./prototype-price-guidance";

type PrototypePriceGuidanceRow = {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  msp_final: boolean;
  mides_social: boolean;
  price_min_uyu: number;
  price_mid_uyu: number;
  price_max_uyu: number;
  guidance_type: PrototypePriceGuidanceType;
  confidence: PrototypePriceConfidence;
  territory_tier: string;
  methodology_version: string;
  methodology_note: string;
  observed_reference_text: string | null;
  source_label: string | null;
  source_url: string | null;
  source_date: string | null;
  source_year: number | null;
  computed_at: string;
};

function safePublicUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    if (url.hostname.toLocaleLowerCase("en-US").endsWith("supabase.co")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function loadPrototypePriceGuidance(): Promise<PrototypePriceGuidance[]> {
  const rows = await querySupabaseDatabase<PrototypePriceGuidanceRow>(`
    select
      facility.facility_key as id,
      preferred_name.name,
      current_address.department,
      current_address.locality,
      current_address.address_line as address,
      current_capacity.places,
      facility.registry_msp_final as msp_final,
      facility.registry_mides_social as mides_social,
      guidance.price_min_uyu,
      guidance.price_mid_uyu,
      guidance.price_max_uyu,
      guidance.guidance_type,
      guidance.confidence,
      guidance.territory_tier,
      guidance.methodology_version,
      guidance.methodology_note,
      guidance.observed_reference_text,
      observation.source_label,
      observation.source_url,
      observation.source_date,
      observation.source_year,
      guidance.computed_at
    from elepem_core.facility_price_guidance as guidance
    join elepem_core.facilities as facility
      on facility.id = guidance.facility_id
    join lateral (
      select name.name
      from elepem_core.facility_names as name
      where name.facility_id = facility.id and name.is_preferred
      order by name.id desc
      limit 1
    ) as preferred_name on true
    join lateral (
      select address.department, address.locality, address.address_line
      from elepem_core.facility_addresses as address
      where address.facility_id = facility.id
        and address.is_current
        and address.address_type = 'physical'
      order by address.id desc
      limit 1
    ) as current_address on true
    left join lateral (
      select capacity.places
      from elepem_core.facility_capacity_observations as capacity
      where capacity.facility_id = facility.id and capacity.is_current
      order by capacity.id desc
      limit 1
    ) as current_capacity on true
    left join elepem_core.facility_price_observations as observation
      on observation.id = guidance.primary_observation_id
    where guidance.prototype_only = true
      and facility.lifecycle_status = 'current'
      and facility.identity_status = 'confirmed_facility'
      and facility.registry_visibility = 'public'
      and facility.location_status = 'mapped'
      and not coalesce(facility.is_demo, false)
    order by current_address.department, preferred_name.name, facility.facility_key
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    department: row.department,
    locality: row.locality,
    address: row.address,
    places: row.places,
    mspFinal: row.msp_final,
    midesSocial: row.mides_social,
    priceMinUyu: row.price_min_uyu,
    priceMidUyu: row.price_mid_uyu,
    priceMaxUyu: row.price_max_uyu,
    guidanceType: row.guidance_type,
    confidence: row.confidence,
    territoryTier: row.territory_tier,
    methodologyVersion: row.methodology_version,
    methodologyNote: row.methodology_note,
    observedReferenceText: row.observed_reference_text || undefined,
    sourceLabel: row.source_label || undefined,
    sourceUrl: safePublicUrl(row.source_url),
    sourceDate: row.source_date || undefined,
    sourceYear: row.source_year || undefined,
    computedAt: row.computed_at,
  }));
}

export async function loadPrototypePriceGuidanceOrEmpty() {
  try {
    return await loadPrototypePriceGuidance();
  } catch (error) {
    console.error("No se pudo cargar la orientación de precios del prototipo.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}
