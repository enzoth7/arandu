// Búsqueda, filtrado y ordenamiento del listado de ELEPEM.
//
// Lógica pura y sin React: entra la lista consolidada y los criterios, sale lo
// que se dibuja. Vive acá para poder probarla con `node --test`.
//
// Reglas del producto que este módulo respeta (§6.2 y §6.3 de la especificación):
// los ordenamientos son explicables. Las estrellas se limitan a la clasificación
// documental; no son un ranking de calidad, seguridad ni una prioridad por pago.

import { foldText } from "./uruguay.mjs";
import { facilityDocumentStatus } from "./facility-document-status.mjs";

/** Un ELEPEM tiene respaldo administrativo si consta en MSP o en MIDES. */
export function hasOfficialAdministrativeRecord(facility) {
  return Boolean(facility.mspFinal || facility.midesSocial);
}

/**
 * No se localizó una situación vigente en las fuentes consultadas.
 * Ausencia de dato, nunca irregularidad: no implica que el ELEPEM sea
 * clandestino, ilegal ni que se le haya negado la habilitación.
 */
export function isUnconfirmedFacility(facility) {
  return facility.isDemo !== true && !hasOfficialAdministrativeRecord(facility);
}

export function matchesAdministrativeStatus(facility, status) {
  if (status === "habilitado") return Boolean(facility.mspFinal);
  if (status === "mides") return Boolean(facility.midesSocial);
  if (status === "otra_fuente") return Boolean(facility.otherSource);
  if (status === "app") return Boolean(facility.appDiscovered);
  if (status === "candidate_private") return facility.privateCandidate === true;
  return isUnconfirmedFacility(facility);
}

/**
 * Etapa administrativa más avanzada que consta para un ELEPEM.
 * Es un criterio declarado y verificable, no una medida de calidad.
 */
export function facilityStageRank(facility) {
  if (facility.mspFinal) return 1;              // Habilitación final MSP
  if (facility.midesSocial) return 2;           // Certificado social MIDES
  if (facility.mspRegistroHistorico) return 3;  // Registro MSP
  return 4;                                     // Situación no confirmada
}

export const SORT_ORDERS = Object.freeze(["name", "department", "stage", "places"]);

export function isSortOrder(value) {
  return SORT_ORDERS.includes(value);
}

const collator = new Intl.Collator("es-UY", { sensitivity: "base", numeric: true });

function byName(left, right) {
  return collator.compare(left.name || "", right.name || "");
}

/** Ordena sin mutar la lista recibida. */
export function sortFacilities(facilities, order = "name") {
  const list = [...facilities];
  if (order === "department") {
    return list.sort((a, b) =>
      collator.compare(a.department || "", b.department || "") || byName(a, b));
  }
  if (order === "stage") {
    return list.sort((a, b) => facilityStageRank(a) - facilityStageRank(b) || byName(a, b));
  }
  if (order === "places") {
    // Sin dato publicado va al final: es una ausencia de información, no un
    // valor bajo, así que no debe competir con las capacidades informadas.
    return list.sort((a, b) => {
      const left = typeof a.places === "number" ? a.places : null;
      const right = typeof b.places === "number" ? b.places : null;
      if (left === null && right === null) return byName(a, b);
      if (left === null) return 1;
      if (right === null) return -1;
      return right - left || byName(a, b);
    });
  }
  return list.sort(byName);
}

/**
 * Filtra por texto libre, departamento, localidad, precio mensual, situación
 * administrativa, clasificación documental y estado de tratamiento interno.
 * Los criterios vacíos no filtran.
 *
 * @param haystackFor función que devuelve el texto buscable ya plegado; se
 * inyecta para poder precalcularlo una sola vez por lista.
 */
export function filterFacilities(facilities, criteria = {}, haystackFor) {
  const {
    foldedQuery = "",
    department = "",
    locality = "",
    monthlyPriceMin = null,
    monthlyPriceMax = null,
    status = "",
    documentaryStatus = "",
    privateWorkflowStatus = "",
    canonicalDepartmentOf = (value) => value,
  } = criteria;

  return facilities.filter((facility) => {
    if (privateWorkflowStatus && facility.privateCandidateStatus !== privateWorkflowStatus) return false;
    if (foldedQuery && !haystackFor(facility).includes(foldedQuery)) return false;
    if (status && !matchesAdministrativeStatus(facility, status)) return false;
    if (documentaryStatus && facilityDocumentStatus(facility).key !== documentaryStatus) return false;
    if (department && canonicalDepartmentOf(facility.department) !== department) return false;
    if (locality && foldText(facility.locality) !== foldText(locality)) return false;
    const priceFilterActive = Number.isFinite(monthlyPriceMin) || Number.isFinite(monthlyPriceMax);
    if (priceFilterActive) {
      const monthlyPrice = Number(facility.monthlyPriceUyu);
      // Un precio no publicado no se adivina: si se aplica el filtro, sólo se
      // muestran fichas que tienen un precio mensual explícito dentro del rango.
      if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) return false;
      if (Number.isFinite(monthlyPriceMin) && monthlyPrice < monthlyPriceMin) return false;
      if (Number.isFinite(monthlyPriceMax) && monthlyPrice > monthlyPriceMax) return false;
    }
    return true;
  });
}

/** Opciones `[etiqueta, cantidad]` ordenadas alfabéticamente. */
function countBy(facilities, labelOf) {
  const counts = new Map();
  for (const facility of facilities) {
    const label = labelOf(facility);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => collator.compare(a, b));
}

export function departmentOptions(facilities, canonicalDepartmentOf = (value) => value) {
  return countBy(facilities, (facility) => canonicalDepartmentOf(facility.department));
}

/**
 * Localidades del ámbito ya filtrado, de modo que elegir un departamento
 * reduce la lista en lugar de ofrecer cientos de opciones sin relación.
 */
export function localityOptions(facilities) {
  return countBy(facilities, (facility) => (facility.locality || "").trim());
}
