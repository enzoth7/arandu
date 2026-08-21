export const FACILITY_ATTRIBUTE_FILTER_GROUPS = Object.freeze([
  {
    key: "stayTypes",
    param: "estadia",
    label: "Tipo de estadía",
    options: [
      ["permanente", "Estadía permanente"],
      ["temporal", "Estadía temporal"],
      ["respiro", "Estadía de respiro"],
      ["centro_dia", "Centro de día"],
      ["recuperacion_convalecencia", "Recuperación o convalecencia"],
      ["rehabilitacion", "Rehabilitación"],
    ],
  },
  {
    key: "roomPrivacyFeatures",
    param: "habitacion",
    label: "Habitación y privacidad",
    options: [
      ["habitacion_individual", "Habitación individual"],
      ["habitacion_compartida", "Habitación compartida"],
      ["bano_privado", "Baño privado"],
      ["bano_compartido", "Baño compartido"],
    ],
  },
  {
    key: "environmentFeatures",
    param: "entorno",
    label: "Entorno",
    options: [
      ["espacio_exterior", "Jardín, patio o espacio exterior"],
      ["espacios_comunes", "Espacios comunes"],
      ["aire_acondicionado", "Aire acondicionado"],
      ["calefaccion", "Calefacción"],
      ["iluminacion_natural", "Iluminación natural"],
    ],
  },
  {
    key: "accessibilityFeatures",
    param: "accesibilidad",
    label: "Accesibilidad y movilidad",
    options: [
      ["acceso_sin_escalones", "Acceso sin escalones"],
      ["ascensor_ayuda_escaleras", "Ascensor o ayuda para escaleras"],
      ["circulacion_silla_ruedas", "Circulación para silla de ruedas"],
      ["bano_adaptado", "Baño adaptado"],
      ["barras_apoyo", "Barras de apoyo"],
      ["ducha_nivel_piso", "Ducha a nivel del piso"],
      ["llamada_dormitorio_bano", "Sistema de llamada en dormitorio o baño"],
      ["camas_articuladas", "Camas articuladas o eléctricas"],
    ],
  },
  {
    key: "careServices",
    param: "cuidados",
    label: "Cuidados y profesionales",
    options: [
      ["asistencia_24_horas", "Atención o asistencia durante las 24 horas"],
      ["direccion_tecnica_medica", "Dirección técnica médica"],
      ["medico_general", "Médico general"],
      ["medico_geriatra", "Médico geriatra"],
      ["enfermeria", "Enfermería"],
      ["fisioterapia", "Fisioterapia"],
      ["nutricion", "Nutricionista"],
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
      ["espacio_privado_visitas_llamadas", "Espacio privado para visitas o llamadas"],
      ["acceso_telefono", "Acceso a teléfono"],
      ["internet_wifi", "Internet o Wi-Fi"],
    ],
  },
].map((group) => Object.freeze({ ...group, options: Object.freeze(group.options) })));

const GROUPS_BY_KEY = new Map(FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => [group.key, group]));

const LEGACY_MATCHES = Object.freeze({
  stayTypes: Object.freeze({
    temporal: Object.freeze(["temporal_respiro"]),
    respiro: Object.freeze(["temporal_respiro"]),
    recuperacion_convalecencia: Object.freeze(["recuperacion_rehabilitacion"]),
    rehabilitacion: Object.freeze(["recuperacion_rehabilitacion"]),
  }),
  roomPrivacyFeatures: Object.freeze({
    habitacion_individual: Object.freeze(["habitacion_privada"]),
  }),
  environmentFeatures: Object.freeze({
    aire_acondicionado: Object.freeze(["climatizacion"]),
    calefaccion: Object.freeze(["climatizacion"]),
  }),
  accessibilityFeatures: Object.freeze({
    bano_adaptado: Object.freeze(["bano_adaptado_barras"]),
    barras_apoyo: Object.freeze(["bano_adaptado_barras"]),
  }),
  dailyLifeFeatures: Object.freeze({
    espacio_privado_visitas_llamadas: Object.freeze(["roomPrivacyFeatures:espacio_privado_visitas_llamadas"]),
    acceso_telefono: Object.freeze(["telefono_internet"]),
    internet_wifi: Object.freeze(["telefono_internet"]),
  }),
});

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

export function facilityMatchesAttributeFilter(facility, groupKey, optionValue) {
  const values = Array.isArray(facility?.[groupKey]) ? facility[groupKey] : [];
  if (values.includes(optionValue)) return true;
  const aliases = LEGACY_MATCHES[groupKey]?.[optionValue] || [];
  return aliases.some((alias) => {
    const separator = alias.indexOf(":");
    if (separator === -1) return values.includes(alias);
    const legacyGroup = alias.slice(0, separator);
    const legacyValue = alias.slice(separator + 1);
    return Array.isArray(facility?.[legacyGroup]) && facility[legacyGroup].includes(legacyValue);
  });
}
