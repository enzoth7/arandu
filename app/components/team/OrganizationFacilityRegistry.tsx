"use client";

import { useMemo } from "react";
import { useResidenciales } from "../../hooks/useResidenciales";
import { consolidateFacilities } from "../facility-presentation";
import type { Facility } from "../map-types";
import UruguayRegistry from "../UruguayRegistry";
import "./OrganizationFacilityRegistry.css";

/**
 * El registro estatal comparte el padrón consolidado con el portal público.
 * Las colas privadas de revisión se administran fuera de esta pantalla.
 */
export function OrganizationFacilityRegistry({ initialFacilities = [] }: { initialFacilities?: Facility[] }) {
  const { facilities, loading, error } = useResidenciales(initialFacilities);
  const consolidated = useMemo(() => consolidateFacilities(facilities), [facilities]);

  return (
    <section className="organizationRegistryWorkspace">
      <UruguayRegistry facilities={consolidated} loading={loading} error={error} />
    </section>
  );
}
