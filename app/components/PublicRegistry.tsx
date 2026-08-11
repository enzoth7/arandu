"use client";

import { useMemo } from "react";
import { useResidenciales } from "../hooks/useResidenciales";
import { consolidateFacilities } from "./facility-presentation";
import UruguayRegistry from "./UruguayRegistry";
import type { Facility } from "./map-types";
import { AranduHomeHero } from "./AranduHomeHero";

/**
 * Registro del portal de personas: sólo el padrón público.
 *
 * Deliberadamente no monta `usePrivateCandidateMapLayer`. Los candidatos del
 * piloto privado no pueden aparecer en el mapa público (`AGENTS.md`: ningún
 * candidato se publica automáticamente), y además evita dos peticiones que
 * siempre responderían 401 en este portal.
 */
export function PublicRegistry({
  initialFacilities = [],
  demoFacilities = [],
  demoMode = false,
}: {
  initialFacilities?: Facility[];
  demoFacilities?: Facility[];
  demoMode?: boolean;
}) {
  const { facilities, loading, error } = useResidenciales(initialFacilities);
  const consolidated = useMemo(() => consolidateFacilities(facilities), [facilities]);

  return <>
    <AranduHomeHero />
    <UruguayRegistry
      facilities={consolidated}
      demoFacilities={demoMode ? demoFacilities : []}
      loading={loading}
      error={error}
      showChoiceCta
    />
  </>;
}
