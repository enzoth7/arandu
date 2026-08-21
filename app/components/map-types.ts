export type FacilityStatus = "habilitado" | "mides" | "verificar" | "app";
export type FacilityQualityRating = "outstanding" | "good" | "requires_improvement" | "inadequate";
export type FacilityQualityFilter = "" | FacilityQualityRating | "unrated";

export const QUALITY_RATING_LABELS: Record<FacilityQualityRating, string> = {
  outstanding: "Sobresaliente",
  good: "Bueno",
  requires_improvement: "Requiere mejoras",
  inadequate: "Inadecuado",
};

export type FacilityStayType =
  | "permanente"
  | "temporal_respiro"
  | "centro_dia"
  | "recuperacion_rehabilitacion";
export type FacilityRoomPrivacyFeature =
  | "habitacion_privada"
  | "habitacion_compartida"
  | "bano_privado"
  | "bano_compartido"
  | "espacio_privado_visitas_llamadas";
export type FacilityEnvironmentFeature =
  | "espacio_exterior"
  | "espacios_comunes"
  | "climatizacion"
  | "iluminacion_natural";
export type FacilityAccessibilityFeature =
  | "acceso_sin_escalones"
  | "una_planta"
  | "ascensor_ayuda_escaleras"
  | "circulacion_silla_ruedas"
  | "bano_adaptado_barras"
  | "ducha_nivel_piso"
  | "llamada_dormitorio_bano"
  | "camas_articuladas";
export type FacilityCareService =
  | "asistencia_24_horas"
  | "direccion_tecnica_medica"
  | "enfermeria"
  | "fisioterapia"
  | "nutricion"
  | "psicologia"
  | "trabajo_social"
  | "odontologia"
  | "podologia";
export type FacilityDailyLifeFeature =
  | "actividades_recreacion"
  | "paseos_salidas"
  | "actividad_fisica"
  | "musica_arte_talleres"
  | "estimulacion_cognitiva"
  | "alimentacion_adaptada"
  | "menu_visible"
  | "visitas_amplias"
  | "telefono_internet";

export type FacilitySituation =
  | "habilitacion_msp"
  | "certificado_social_mides"
  | "situacion_no_confirmada"
  | "demo";

export type Facility = {
  /** Operational key retained while legacy consumers are migrated. */
  id: string;
  /** Primary key used to derive the canonical public ELPM code. */
  registryId?: number;
  legacyId?: string;
  name: string;
  alternativeNames?: string[];
  department: string;
  locality: string;
  address: string;
  lat: number;
  lng: number;
  precision: "puerta" | "calle" | "referencial";
  precisionLabel: string;
  situacion: FacilitySituation;
  statusGroup: FacilityStatus;
  statusShort: string;
  sourceLabel: string;
  mspFinal: boolean;
  midesSocial: boolean;
  createdAt?: string;
  updatedAt?: string;
  contactPhone?: string;
  contactPhones?: string[];
  contactEmail?: string;
  contactEmails?: string[];
  websites?: string[];
  instagramUrls?: string[];
  facebookUrls?: string[];
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
  monthlyPriceUyu?: number;
  monthlyPriceAsOf?: string;
  monthlyPriceIncludes?: string[];
  /** Clasificación pública disponible; actualmente sólo la ficha ficticia tiene un valor. */
  qualityRating?: FacilityQualityRating;
  /** NULL means that no backed information is available for this group. */
  stayTypes?: FacilityStayType[] | null;
  roomPrivacyFeatures?: FacilityRoomPrivacyFeature[] | null;
  environmentFeatures?: FacilityEnvironmentFeature[] | null;
  accessibilityFeatures?: FacilityAccessibilityFeature[] | null;
  careServices?: FacilityCareService[] | null;
  dailyLifeFeatures?: FacilityDailyLifeFeature[] | null;
  /** Synthetic values remain visible but are always identified as demo. */
  priceIsDemo?: boolean;
  sourceUrl?: string;
  sourceLinks?: Array<{
    label: string;
    url: string;
    sourceDate?: string;
    retrievedAt?: string;
    backedFields?: string[];
  }>;
  /** Fictitious isolated record; never part of productive KPI. */
  isDemo?: boolean;
};

export type MapMode = "streets" | "list";
