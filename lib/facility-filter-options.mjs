export const FACILITY_ATTRIBUTE_FILTER_GROUPS = Object.freeze([
  {
    key: "stayTypes",
    param: "estadia",
    label: "Tipo de estadía",
    options: [
      ["permanente", "Estadía permanente"],
      ["temporal_respiro", "Estadía temporal o de respiro"],
      ["centro_dia", "Centro de día o modalidad diurna"],
      ["recuperacion_rehabilitacion", "Recuperación o rehabilitación"],
    ],
  },
  {
    key: "roomPrivacyFeatures",
    param: "habitacion",
    label: "Habitación y privacidad",
    options: [
      ["habitacion_privada", "Habitación privada"],
      ["habitacion_compartida", "Habitación compartida"],
      ["bano_privado", "Baño privado"],
      ["bano_compartido", "Baño compartido"],
      ["espacio_privado_visitas_llamadas", "Espacio privado para visitas o llamadas"],
    ],
  },
  {
    key: "environmentFeatures",
    param: "entorno",
    label: "Entorno",
    options: [
      ["espacio_exterior", "Jardín, patio o espacio exterior"],
      ["espacios_comunes", "Espacios comunes"],
      ["climatizacion", "Climatización"],
      ["iluminacion_natural", "Iluminación natural"],
    ],
  },
  {
    key: "accessibilityFeatures",
    param: "accesibilidad",
    label: "Accesibilidad y movilidad",
    options: [
      ["acceso_sin_escalones", "Acceso sin escalones"],
      ["una_planta", "Edificio de una planta"],
      ["ascensor_ayuda_escaleras", "Ascensor o ayuda para escaleras"],
      ["circulacion_silla_ruedas", "Circulación para silla de ruedas"],
      ["bano_adaptado_barras", "Baño adaptado y barras de apoyo"],
      ["ducha_nivel_piso", "Ducha a nivel del piso"],
      ["llamada_dormitorio_bano", "Llamada en dormitorio o baño"],
      ["camas_articuladas", "Camas articuladas"],
    ],
  },
  {
    key: "careServices",
    param: "cuidados",
    label: "Cuidados y profesionales",
    options: [
      ["asistencia_24_horas", "Atención o asistencia durante las 24 horas"],
      ["direccion_tecnica_medica", "Dirección técnica médica"],
      ["enfermeria", "Enfermería"],
      ["fisioterapia", "Fisioterapia"],
      ["nutricion", "Nutrición"],
      ["psicologia", "Psicología"],
      ["trabajo_social", "Trabajo social o asistencia social"],
      ["odontologia", "Odontología"],
      ["podologia", "Podología"],
    ],
  },
  {
    key: "dailyLifeFeatures",
    param: "vida",
    label: "Vida cotidiana y vínculos",
    options: [
      ["actividades_recreacion", "Actividades y recreación"],
      ["paseos_salidas", "Paseos y salidas"],
      ["actividad_fisica", "Actividad física"],
      ["musica_arte_talleres", "Música, arte o talleres"],
      ["estimulacion_cognitiva", "Estimulación cognitiva"],
      ["alimentacion_adaptada", "Alimentación adaptada"],
      ["menu_visible", "Menú visible"],
      ["visitas_amplias", "Horarios amplios de visita"],
      ["telefono_internet", "Acceso a teléfono o internet"],
    ],
  },
].map((group) => Object.freeze({ ...group, options: Object.freeze(group.options) })));

const GROUPS_BY_KEY = new Map(FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => [group.key, group]));

export function emptyFacilityAttributeFilters() {
  return Object.fromEntries(FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => [group.key, []]));
}

export function normalizeFacilityAttributeFilters(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = emptyFacilityAttributeFilters();
  for (const group of FACILITY_ATTRIBUTE_FILTER_GROUPS) {
    const allowed = new Set(group.options.map(([option]) => option));
    const selected = Array.isArray(source[group.key]) ? source[group.key] : [];
    result[group.key] = [...new Set(selected.filter((option) => allowed.has(option)))];
  }
  return result;
}

export function hasFacilityAttributeFilters(value) {
  return Object.values(normalizeFacilityAttributeFilters(value)).some((selected) => selected.length > 0);
}

export function facilityAttributeFilterLabel(groupKey, optionValue) {
  const group = GROUPS_BY_KEY.get(groupKey);
  return group?.options.find(([value]) => value === optionValue)?.[1] || optionValue;
}
