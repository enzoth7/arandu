"use client";

import { useMemo } from "react";
import { useResidenciales } from "../hooks/useResidenciales";
import { consolidateFacilities } from "./facility-presentation";
import UruguayRegistry from "./UruguayRegistry";
import type { Facility } from "./map-types";
import { DemoFacilityGallery } from "./DemoFacilityGallery";

/**
 * Registro del portal de personas: sólo el padrón público.
 *
 * Deliberadamente no monta `usePrivateCandidateMapLayer`. Los candidatos del
 * piloto privado no pueden aparecer en el mapa público (`AGENTS.md`: ningún
 * candidato se publica automáticamente), y además evita dos peticiones que
 * siempre responderían 401 en este portal.
 */
export function PublicRegistry({ initialFacilities = [], demoMode = false }: { initialFacilities?: Facility[]; demoMode?: boolean }) {
  const { facilities, loading, error } = useResidenciales(initialFacilities);
  const consolidated = useMemo(() => consolidateFacilities(facilities), [facilities]);

  return <>
    <UruguayRegistry
      facilities={consolidated}
      loading={loading}
      error={error}
      showChoiceCta
    />
    {demoMode && <DemoFacilityGallery />}
  </>;
}
