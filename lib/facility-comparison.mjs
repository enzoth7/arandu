// Comparación de dos o tres ELEPEM.
//
// Reglas del producto que este módulo hace explícitas (§10 y §6.3):
// - Sólo se comparan los campos acordados. Contacto no se compara: vive en la
//   ficha, porque es un dato para llamar, no para poner en competencia.
// - Cuando un dato no existe se escribe «Información no disponible». Nunca se
//   infiere, se estima ni se completa con un valor por defecto.
// - No hay puntaje, ranking ni orden de preferencia entre las columnas.

export const MIN_COMPARISON = 2;
export const MAX_COMPARISON = 3;

export const NOT_AVAILABLE = "Información no disponible";

function present(value) {
  const text = typeof value === "string" ? value.trim() : value;
  return text === 0 || text ? String(text) : NOT_AVAILABLE;
}

/**
 * Campos comparables, en orden de aparición.
 *
 * `pending: true` marca los que se acordó mostrar aunque todavía no exista el
 * dato, para que la ausencia quede a la vista en lugar de esconder la fila.
 */
export function comparisonFields({ canonicalDepartmentOf = (value) => value, institutionalLabelOf } = {}) {
  return [
    {
      key: "department",
      label: "Ubicación",
      get: (facility) => present(canonicalDepartmentOf(facility.department)),
    },
    {
      key: "institutional",
      label: "Situación institucional",
      get: (facility) => present(institutionalLabelOf ? institutionalLabelOf(facility) : ""),
    },
    {
      key: "price",
      label: "Rango de precio",
      pending: true,
      get: () => NOT_AVAILABLE,
    },
    {
      key: "room",
      label: "Tipo de habitación",
      pending: true,
      get: () => NOT_AVAILABLE,
    },
  ];
}

/** Filas listas para dibujar: una por campo, con un valor por ELEPEM. */
export function comparisonRows(facilities, options) {
  const list = Array.isArray(facilities) ? facilities : [];
  return comparisonFields(options).map((field) => ({
    key: field.key,
    label: field.label,
    pending: Boolean(field.pending),
    values: list.map((facility) => field.get(facility)),
  }));
}

/** Alterna un ELEPEM respetando el máximo, sin mutar la selección recibida. */
export function toggleSelection(selectedIds, id, max = MAX_COMPARISON) {
  const current = [...selectedIds];
  const index = current.indexOf(id);
  if (index >= 0) return current.filter((value) => value !== id);
  if (current.length >= max) return current;
  return [...current, id];
}

export function canCompare(selectedIds) {
  return selectedIds.length >= MIN_COMPARISON && selectedIds.length <= MAX_COMPARISON;
}
