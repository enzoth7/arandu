// Fuente única de los departamentos de Uruguay y del plegado de texto usado
// para búsquedas y comparaciones en la interfaz.
//
// No confundir `foldText` con `normalizeText` de `facility-matching.mjs`: aquel
// expande abreviaturas de direcciones ("avenida" -> "av") para el cruce de
// candidatos y no sirve como normalizador genérico de búsqueda.

export const URUGUAY_DEPARTMENTS = Object.freeze([
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
]);

/** Quita acentos y pasa a minúsculas, colapsando espacios. */
export function foldText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .replace(/\s+/g, " ")
    .trim();
}

const DEPARTMENTS_BY_KEY = new Map(
  URUGUAY_DEPARTMENTS.map((department) => [foldText(department), department]),
);

/**
 * Devuelve el nombre canónico del departamento. Si el valor no corresponde a
 * ninguno conocido, se conserva tal cual (recortado) para no perder el dato.
 */
export function canonicalDepartment(value) {
  return DEPARTMENTS_BY_KEY.get(foldText(value)) ?? String(value ?? "").trim();
}

/**
 * Capitaliza una localidad respetando las partículas en minúscula.
 * Para departamentos usar `canonicalDepartment`.
 */
export function displayLocality(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const particles = new Set(["de", "del", "la", "las", "los", "y", "e"]);
  return text
    .toLocaleLowerCase("es-UY")
    .split(/\s+/)
    .map((word, index) => (
      index > 0 && particles.has(word)
        ? word
        : `${word.charAt(0).toLocaleUpperCase("es-UY")}${word.slice(1)}`
    ))
    .join(" ");
}
