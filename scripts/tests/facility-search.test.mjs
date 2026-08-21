import assert from "node:assert/strict";
import test from "node:test";

import {
  departmentOptions,
  facilityStageRank,
  filterFacilities,
  hasOfficialAdministrativeRecord,
  isUnconfirmedFacility,
  localityOptions,
  matchesAdministrativeStatus,
  prioritizeFacility,
  sortFacilities,
  sortFacilitiesByPrice,
} from "../../lib/facility-search.mjs";
import { FACILITY_ATTRIBUTE_FILTER_GROUPS } from "../../lib/facility-filter-options.mjs";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";

function facility(overrides = {}) {
  return {
    id: "f1",
    name: "Hogar Las Acacias",
    department: "Montevideo",
    locality: "Centro",
    address: "18 de Julio 1000",
    mspFinal: false,
    midesSocial: false,
    ...overrides,
  };
}

const haystackFor = (f) => foldText(`${f.name} ${f.address} ${f.locality} ${f.department}`);
const criteria = (extra) => ({ canonicalDepartmentOf: canonicalDepartment, ...extra });

test("la taxonomía visible coincide con el ajuste solicitado", () => {
  const labels = Object.fromEntries(FACILITY_ATTRIBUTE_FILTER_GROUPS.map((group) => [
    group.label,
    group.options.map(([, label]) => label),
  ]));
  assert.deepEqual(labels, {
    "Tipo de estadía": [
      "Estadía permanente",
      "Estadía temporal",
      "Estadía de respiro",
      "Centro de día",
      "Recuperación o convalecencia",
      "Rehabilitación",
    ],
    "Habitación y privacidad": [
      "Habitación individual",
      "Habitación compartida",
      "Baño privado",
      "Baño compartido",
    ],
    Entorno: [
      "Jardín, patio o espacio exterior",
      "Espacios comunes",
      "Aire acondicionado",
      "Calefacción",
      "Iluminación natural",
    ],
    "Accesibilidad y movilidad": [
      "Acceso sin escalones",
      "Ascensor o ayuda para escaleras",
      "Circulación para silla de ruedas",
      "Baño adaptado",
      "Barras de apoyo",
      "Ducha a nivel del piso",
      "Sistema de llamada en dormitorio o baño",
      "Camas articuladas o eléctricas",
    ],
    "Cuidados y profesionales": [
      "Atención o asistencia durante las 24 horas",
      "Dirección técnica médica",
      "Médico general",
      "Médico geriatra",
      "Enfermería",
      "Fisioterapia",
      "Nutricionista",
      "Psicología",
      "Trabajo social o asistencia social",
      "Odontología",
      "Podología",
    ],
    "Vida cotidiana y vínculos": [
      "Actividades y recreación",
      "Paseos y salidas",
      "Actividad física",
      "Música, arte o talleres",
      "Estimulación cognitiva",
      "Alimentación adaptada",
      "Menú visible",
      "Horarios amplios de visita",
      "Espacio privado para visitas o llamadas",
      "Acceso a teléfono",
      "Internet o Wi-Fi",
    ],
  });
});

test("un ELEPEM con MSP o MIDES tiene respaldo administrativo", () => {
  assert.equal(hasOfficialAdministrativeRecord(facility({ mspFinal: true })), true);
  assert.equal(hasOfficialAdministrativeRecord(facility({ midesSocial: true })), true);
  assert.equal(hasOfficialAdministrativeRecord(facility()), false);
});

test("la ausencia de dato es «no confirmada», no una categoría negativa", () => {
  assert.equal(isUnconfirmedFacility(facility()), true);
  assert.equal(isUnconfirmedFacility(facility({ mspFinal: true })), false);
  assert.equal(isUnconfirmedFacility(facility({ isDemo: true })), false);
});

test("el filtro por situación no colapsa etapas distintas", () => {
  const both = facility({ mspFinal: true, midesSocial: true });
  assert.equal(matchesAdministrativeStatus(both, "habilitado"), true);
  assert.equal(matchesAdministrativeStatus(both, "mides"), true);
  assert.equal(matchesAdministrativeStatus(both, "verificar"), false);
});

test("la búsqueda libre ignora acentos y mayúsculas", () => {
  const list = [facility({ id: "a", name: "Residencial Paysandú" }), facility({ id: "b", name: "Hogar Centro" })];
  const found = filterFacilities(list, criteria({ foldedQuery: foldText("paysandu") }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["a"]);
});

test("el departamento se compara de forma canónica", () => {
  const list = [facility({ id: "a", department: "PAYSANDU" }), facility({ id: "b", department: "Montevideo" })];
  const found = filterFacilities(list, criteria({ department: "Paysandú" }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["a"]);
});

test("la localidad también ignora acentos y mayúsculas", () => {
  const list = [facility({ id: "a", locality: "Ciudad de la Costa" }), facility({ id: "b", locality: "Centro" })];
  const found = filterFacilities(list, criteria({ locality: "CIUDAD DE LA COSTA" }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["a"]);
});

test("los criterios vacíos no filtran", () => {
  const list = [facility({ id: "a" }), facility({ id: "b" })];
  assert.equal(filterFacilities(list, criteria(), haystackFor).length, 2);
});

test("la clasificación distingue valores disponibles de fichas sin calificar", () => {
  const list = [
    facility({ id: "bueno", qualityRating: "good" }),
    facility({ id: "sobresaliente", qualityRating: "outstanding" }),
    facility({ id: "sin-calificar" }),
  ];
  assert.deepEqual(
    filterFacilities(list, criteria({ qualityRating: "good" }), haystackFor).map((item) => item.id),
    ["bueno"],
  );
  assert.deepEqual(
    filterFacilities(list, criteria({ qualityRating: "unrated" }), haystackFor).map((item) => item.id),
    ["sin-calificar"],
  );
});

test("los atributos usan OR dentro de un grupo y AND entre grupos", () => {
  const list = [
    facility({
      id: "coincide",
      stayTypes: ["permanente"],
      environmentFeatures: ["espacio_exterior"],
    }),
    facility({
      id: "otra-estadia",
      stayTypes: ["centro_dia"],
      environmentFeatures: ["espacio_exterior"],
    }),
    facility({ id: "sin-datos", stayTypes: null, environmentFeatures: null }),
  ];
  const found = filterFacilities(list, criteria({
    attributeFilters: {
      stayTypes: ["permanente", "temporal_respiro"],
      environmentFeatures: ["espacio_exterior"],
    },
  }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["coincide"]);
});

test("los filtros separados siguen encontrando valores agrupados anteriores", () => {
  const legacy = facility({
    id: "legacy",
    stayTypes: ["temporal_respiro", "recuperacion_rehabilitacion"],
    roomPrivacyFeatures: ["habitacion_privada", "espacio_privado_visitas_llamadas"],
    environmentFeatures: ["climatizacion"],
    accessibilityFeatures: ["bano_adaptado_barras"],
    dailyLifeFeatures: ["telefono_internet"],
  });

  for (const [group, option] of [
    ["stayTypes", "temporal"],
    ["stayTypes", "respiro"],
    ["stayTypes", "recuperacion_convalecencia"],
    ["stayTypes", "rehabilitacion"],
    ["roomPrivacyFeatures", "habitacion_individual"],
    ["environmentFeatures", "aire_acondicionado"],
    ["environmentFeatures", "calefaccion"],
    ["accessibilityFeatures", "bano_adaptado"],
    ["accessibilityFeatures", "barras_apoyo"],
    ["dailyLifeFeatures", "espacio_privado_visitas_llamadas"],
    ["dailyLifeFeatures", "acceso_telefono"],
    ["dailyLifeFeatures", "internet_wifi"],
  ]) {
    const found = filterFacilities([legacy], criteria({
      attributeFilters: { [group]: [option] },
    }), haystackFor);
    assert.deepEqual(found.map((item) => item.id), ["legacy"], `${group}:${option}`);
  }
});

test("los filtros nuevos aceptan valores ya clasificados con la taxonomía nueva", () => {
  const current = facility({
    id: "actual",
    stayTypes: ["respiro"],
    careServices: ["medico_geriatra"],
    dailyLifeFeatures: ["internet_wifi"],
  });
  const found = filterFacilities([current], criteria({
    attributeFilters: {
      stayTypes: ["respiro"],
      careServices: ["medico_geriatra"],
      dailyLifeFeatures: ["internet_wifi"],
    },
  }), haystackFor);
  assert.deepEqual(found.map((item) => item.id), ["actual"]);
});

test("sin información no se interpreta como una respuesta negativa", () => {
  const list = [facility({ id: "desconocido", careServices: null })];
  const found = filterFacilities(list, criteria({
    attributeFilters: { careServices: ["enfermeria"] },
  }), haystackFor);
  assert.deepEqual(found, []);
});

test("el rango de precio usa importes mensuales publicados y no infiere los faltantes", () => {
  const list = [
    facility({ id: "bajo", monthlyPriceUyu: 58_000 }),
    facility({ id: "medio", monthlyPriceUyu: 84_000 }),
    facility({ id: "sin-precio" }),
  ];
  const found = filterFacilities(list, criteria({ monthlyPriceMin: 70_000, monthlyPriceMax: 90_000 }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["medio"]);
});

test("el filtro de fotos distingue objetos públicos presentes de fichas sin imagen", () => {
  const list = [
    facility({ id: "principal", photoUrl: "https://example.test/foto.webp" }),
    facility({ id: "galeria", photoUrls: ["https://example.test/otra.webp"] }),
    facility({ id: "sin-foto" }),
  ];
  assert.deepEqual(
    filterFacilities(list, criteria({ photoAvailability: "with" }), haystackFor).map((item) => item.id),
    ["principal", "galeria"],
  );
  assert.deepEqual(
    filterFacilities(list, criteria({ photoAvailability: "without" }), haystackFor).map((item) => item.id),
    ["sin-foto"],
  );
});

test("el precio ordena en ambos sentidos y deja los faltantes al final", () => {
  const list = [
    facility({ id: "sin", name: "Sin precio" }),
    facility({ id: "alto", name: "Alto", monthlyPriceUyu: 120_000 }),
    facility({ id: "bajo", name: "Bajo", monthlyPriceUyu: 55_000 }),
  ];
  assert.deepEqual(sortFacilitiesByPrice(list, "asc").map((item) => item.id), ["bajo", "alto", "sin"]);
  assert.deepEqual(sortFacilitiesByPrice(list, "desc").map((item) => item.id), ["alto", "bajo", "sin"]);
  assert.deepEqual(list.map((item) => item.id), ["sin", "alto", "bajo"]);
});

test("los criterios se combinan", () => {
  const list = [
    facility({ id: "a", department: "Montevideo", mspFinal: true, monthlyPriceUyu: 80_000, careServices: ["enfermeria"] }),
    facility({ id: "b", department: "Montevideo", mspFinal: true, monthlyPriceUyu: 80_000 }),
    facility({ id: "c", department: "Montevideo", mspFinal: true, monthlyPriceUyu: 120_000, careServices: ["enfermeria"] }),
    facility({ id: "d", department: "Salto", mspFinal: true, monthlyPriceUyu: 80_000, careServices: ["enfermeria"] }),
  ];
  const found = filterFacilities(list, criteria({
    department: "Montevideo",
    status: "habilitado",
    attributeFilters: { careServices: ["enfermeria"] },
    monthlyPriceMin: 70_000,
    monthlyPriceMax: 90_000,
  }), haystackFor);
  assert.deepEqual(found.map((f) => f.id), ["a"]);
});

test("el orden alfabético usa reglas del español", () => {
  const list = [facility({ id: "b", name: "Ñandú" }), facility({ id: "a", name: "Álamo" }), facility({ id: "c", name: "Zorzal" })];
  assert.deepEqual(sortFacilities(list, "name").map((f) => f.id), ["a", "b", "c"]);
});

test("ordenar no muta la lista original", () => {
  const list = [facility({ id: "b", name: "Beta" }), facility({ id: "a", name: "Alfa" })];
  const copy = [...list];
  sortFacilities(list, "name");
  assert.deepEqual(list.map((f) => f.id), copy.map((f) => f.id));
});

test("Casa Costa Serena aparece primero cuando forma parte de los resultados", () => {
  const list = [
    facility({ id: "a", name: "Alameda" }),
    facility({ id: "DEMO-ELEPEM-001", name: "Casa Costa Serena" }),
    facility({ id: "z", name: "Zorzal" }),
  ];
  const prioritized = prioritizeFacility(list, "DEMO-ELEPEM-001");
  assert.deepEqual(prioritized.map((item) => item.id), ["DEMO-ELEPEM-001", "a", "z"]);
  assert.deepEqual(list.map((item) => item.id), ["a", "DEMO-ELEPEM-001", "z"]);
});

test("la etapa ordena por las tres situaciones acordadas", () => {
  const list = [
    facility({ id: "sin" }),
    facility({ id: "mides", midesSocial: true }),
    facility({ id: "msp", mspFinal: true }),
  ];
  assert.deepEqual(sortFacilities(list, "stage").map((f) => f.id), ["msp", "mides", "sin"]);
  assert.equal(facilityStageRank(facility({ mspFinal: true, midesSocial: true })), 1);
});

test("las opciones de departamento traen conteo y orden alfabético", () => {
  const list = [
    facility({ id: "a", department: "PAYSANDU" }),
    facility({ id: "b", department: "Paysandú" }),
    facility({ id: "c", department: "Artigas" }),
  ];
  assert.deepEqual(departmentOptions(list, canonicalDepartment), [["Artigas", 1], ["Paysandú", 2]]);
});

test("las localidades salen del ámbito ya filtrado", () => {
  const list = [
    facility({ id: "a", locality: "Centro" }),
    facility({ id: "b", locality: "Centro" }),
    facility({ id: "c", locality: "Pocitos" }),
    facility({ id: "d", locality: "" }),
  ];
  assert.deepEqual(localityOptions(list), [["Centro", 2], ["Pocitos", 1]]);
});
