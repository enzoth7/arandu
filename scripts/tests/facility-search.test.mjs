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
  sortFacilities,
} from "../../lib/facility-search.mjs";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";

function facility(overrides = {}) {
  return {
    id: "f1",
    name: "Hogar Las Acacias",
    department: "Montevideo",
    locality: "Centro",
    address: "18 de Julio 1000",
    places: 20,
    mspFinal: false,
    midesSocial: false,
    mspRegistroHistorico: false,
    otherSource: false,
    appDiscovered: false,
    ...overrides,
  };
}

const haystackFor = (f) => foldText(`${f.name} ${f.address} ${f.locality} ${f.department}`);
const criteria = (extra) => ({ canonicalDepartmentOf: canonicalDepartment, ...extra });

test("un ELEPEM con MSP o MIDES tiene respaldo administrativo", () => {
  assert.equal(hasOfficialAdministrativeRecord(facility({ mspFinal: true })), true);
  assert.equal(hasOfficialAdministrativeRecord(facility({ midesSocial: true })), true);
  assert.equal(hasOfficialAdministrativeRecord(facility()), false);
});

test("la ausencia de dato es «no confirmada», no una categoría negativa", () => {
  assert.equal(isUnconfirmedFacility(facility()), true);
  assert.equal(isUnconfirmedFacility(facility({ mspFinal: true })), false);
  // El registro histórico por sí solo no acredita situación vigente.
  assert.equal(isUnconfirmedFacility(facility({ mspRegistroHistorico: true })), true);
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

test("los criterios se combinan", () => {
  const list = [
    facility({ id: "a", department: "Montevideo", mspFinal: true }),
    facility({ id: "b", department: "Montevideo" }),
    facility({ id: "c", department: "Salto", mspFinal: true }),
  ];
  const found = filterFacilities(list, criteria({ department: "Montevideo", status: "habilitado" }), haystackFor);
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

test("la etapa ordena por situación declarada, no por calidad", () => {
  const list = [
    facility({ id: "sin" }),
    facility({ id: "mides", midesSocial: true }),
    facility({ id: "msp", mspFinal: true }),
    facility({ id: "registro", mspRegistroHistorico: true }),
  ];
  assert.deepEqual(sortFacilities(list, "stage").map((f) => f.id), ["msp", "mides", "registro", "sin"]);
  assert.equal(facilityStageRank(facility({ mspFinal: true, midesSocial: true })), 1);
});

test("sin plazas publicadas se ordena al final, no como capacidad cero", () => {
  const list = [
    facility({ id: "sin", places: null }),
    facility({ id: "chico", places: 8 }),
    facility({ id: "grande", places: 40 }),
  ];
  assert.deepEqual(sortFacilities(list, "places").map((f) => f.id), ["grande", "chico", "sin"]);
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
