import assert from "node:assert/strict";
import test from "node:test";

import {
  canCompare,
  comparisonRows,
  MAX_COMPARISON,
  NOT_AVAILABLE,
  toggleSelection,
} from "../../lib/facility-comparison.mjs";
import { canonicalDepartment } from "../../lib/uruguay.mjs";

const options = {
  canonicalDepartmentOf: canonicalDepartment,
  institutionalLabelOf: (f) => (f.mspFinal ? "Habilitado" : ""),
};

const facility = (o = {}) => ({ id: "a", name: "Hogar", department: "PAYSANDU", ...o });

test("compara sólo los campos acordados y en orden", () => {
  const rows = comparisonRows([facility()], options);
  assert.deepEqual(rows.map((r) => r.label), [
    "Ubicación",
    "Situación institucional",
    "Rango de precio",
    "Tipo de habitación",
  ]);
});

test("contacto no es una fila comparable", () => {
  const rows = comparisonRows([facility({ phone: "099" })], options);
  assert.equal(rows.some((r) => r.label.toLowerCase().includes("contacto")), false);
});

test("no incluye los campos que se pidió sacar", () => {
  const labels = comparisonRows([facility()], options).map((r) => r.label.toLowerCase());
  for (const removed of ["accesibilidad", "apoyos", "visitas", "servicios", "última actualización"]) {
    assert.equal(labels.some((l) => l.includes(removed)), false, `no debería estar: ${removed}`);
  }
});

test("el departamento se muestra canónico", () => {
  const [ubicacion] = comparisonRows([facility({ department: "PAYSANDU" })], options);
  assert.deepEqual(ubicacion.values, ["Paysandú"]);
});

test("un dato ausente se escribe, no se infiere", () => {
  const rows = comparisonRows([facility({ department: "" })], options);
  assert.equal(rows[0].values[0], NOT_AVAILABLE);
  assert.equal(rows[1].values[0], NOT_AVAILABLE);
});

test("precio y tipo de habitación quedan visibles como pendientes", () => {
  const rows = comparisonRows([facility()], options);
  const pending = rows.filter((r) => r.pending).map((r) => r.label);
  assert.deepEqual(pending, ["Rango de precio", "Tipo de habitación"]);
  assert.equal(rows[2].values[0], NOT_AVAILABLE);
});

test("una fila trae un valor por cada ELEPEM comparado", () => {
  const rows = comparisonRows([facility({ id: "a" }), facility({ id: "b", department: "Salto" })], options);
  assert.deepEqual(rows[0].values, ["Paysandú", "Salto"]);
});

test("la selección agrega, quita y no pasa del máximo", () => {
  let ids = toggleSelection([], "a");
  ids = toggleSelection(ids, "b");
  ids = toggleSelection(ids, "c");
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.deepEqual(toggleSelection(ids, "d"), ["a", "b", "c"]);
  assert.deepEqual(toggleSelection(ids, "b"), ["a", "c"]);
  assert.equal(MAX_COMPARISON, 3);
});

test("alternar no muta la selección original", () => {
  const ids = ["a"];
  toggleSelection(ids, "b");
  assert.deepEqual(ids, ["a"]);
});

test("se compara con dos o tres, no con uno", () => {
  assert.equal(canCompare([]), false);
  assert.equal(canCompare(["a"]), false);
  assert.equal(canCompare(["a", "b"]), true);
  assert.equal(canCompare(["a", "b", "c"]), true);
});
