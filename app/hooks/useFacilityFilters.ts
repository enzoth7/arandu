"use client";

import { useEffect, useMemo, useState } from "react";
import {
  departmentOptions,
  filterFacilities,
  localityOptions,
  sortFacilities,
  type SortOrder,
} from "../../lib/facility-search.mjs";
import { facilityHaystack } from "../components/facility-presentation";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";
import type { Facility, FacilityStatus } from "../components/map-types";

export type PrivateWorkflowStatus = "" | "needs_review" | "possible_match" | "verified_new";

/**
 * Estado de búsqueda del listado de ELEPEM.
 *
 * Separa el estado y la memoización del dibujo: el registro queda como
 * componente de presentación y la lógica de filtrado vive en
 * `lib/facility-search.mjs`, donde se puede probar sin React.
 */
export function useFacilityFilters(facilities: Facility[]) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [locality, setLocality] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [privateWorkflowStatus, setPrivateWorkflowStatus] = useState<PrivateWorkflowStatus>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");

  // El texto buscable se calcula una vez por lista y no en cada pulsación.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const facility of facilities) map.set(facility.id, facilityHaystack(facility));
    return map;
  }, [facilities]);
  const haystackFor = useMemo(
    () => (facility: Facility) => haystacks.get(facility.id) ?? facilityHaystack(facility),
    [haystacks],
  );

  const foldedQuery = useMemo(() => foldText(query), [query]);

  // Ámbito de cada faceta: una faceta no se filtra a sí misma, así que sus
  // opciones siguen siendo alcanzables después de elegir una.
  const withoutDepartment = useMemo(
    () => filterFacilities(
      facilities,
      { foldedQuery, status, privateWorkflowStatus, canonicalDepartmentOf: canonicalDepartment },
      haystackFor,
    ),
    [facilities, foldedQuery, status, privateWorkflowStatus, haystackFor],
  );
  const withoutLocality = useMemo(
    () => filterFacilities(
      withoutDepartment,
      { department, canonicalDepartmentOf: canonicalDepartment },
      haystackFor,
    ),
    [withoutDepartment, department, haystackFor],
  );
  const matched = useMemo(
    () => filterFacilities(withoutLocality, { locality }, haystackFor),
    [withoutLocality, locality, haystackFor],
  );

  const visible = useMemo(() => sortFacilities(matched, sortOrder), [matched, sortOrder]);
  const departments = useMemo(
    () => departmentOptions(withoutDepartment, canonicalDepartment),
    [withoutDepartment],
  );
  const localities = useMemo(() => localityOptions(withoutLocality), [withoutLocality]);

  // Si la localidad elegida deja de existir en el ámbito actual —por ejemplo al
  // cambiar de departamento— se descarta para no dejar cero resultados sin causa
  // visible.
  useEffect(() => {
    if (!locality) return;
    if (!localities.some(([name]) => name === locality)) setLocality("");
  }, [localities, locality]);

  // Ámbito de los indicadores: responde a la búsqueda y a la ubicación, pero no
  // a la situación administrativa, que es justamente lo que los KPI filtran.
  const summaryScope = useMemo(
    () => filterFacilities(
      facilities,
      { foldedQuery, department, locality, canonicalDepartmentOf: canonicalDepartment },
      haystackFor,
    ),
    [facilities, foldedQuery, department, locality, haystackFor],
  );

  const hasActiveFilters = Boolean(query || department || locality || status || privateWorkflowStatus);

  function reset() {
    setQuery("");
    setDepartment("");
    setLocality("");
    setStatus("");
    setPrivateWorkflowStatus("");
    setSortOrder("name");
  }

  return {
    query, setQuery,
    department, setDepartment,
    locality, setLocality,
    status, setStatus,
    privateWorkflowStatus, setPrivateWorkflowStatus,
    sortOrder, setSortOrder,
    visible,
    departments,
    localities,
    summaryScope,
    hasActiveFilters,
    reset,
  };
}
