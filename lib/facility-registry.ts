import {
  publicFacilityRelation,
  readElepemDataSource,
} from "./elepem-data-source.mjs";
import { classifyRegistryRow } from "./facility-sources.mjs";
import { querySupabaseDatabase } from "./supabase-db";
import type { Facility } from "../app/components/map-types";

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
};

function deriveStatusGroup(row: ResidentialRow): Facility["statusGroup"] {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadPublicFacilities(): Promise<{ facilities: Facility[]; dataSource: string }> {
  const dataSource = readElepemDataSource();
  const relation = publicFacilityRelation(dataSource);
  const rows = await querySupabaseDatabase<ResidentialRow>(`
    select
      id,
      name,
      department,
      locality,
      address,
      places,
      lat,
      lng,
      precision,
      precision_label,
      status_group,
      status_stage,
      status_short,
      source_label,
      msp_final,
      msp_registro_historico,
      mides_social,
      pacp,
      other_source,
      created_at,
      updated_at
    from ${relation}
    order by department, name, id
  `);

  return { facilities: rows.map(toFacility), dataSource };
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
