"use client";

import { useMemo } from "react";
import { useResidenciales } from "../hooks/useResidenciales";
import { consolidateFacilities } from "./facility-presentation";
import UruguayRegistry from "./UruguayRegistry";
import type { Facility } from "./map-types";
import { AranduHomeHero } from "./AranduHomeHero";
import { ShieldAlert } from "lucide-react";

/**
 * Registro del portal de personas: sólo el padrón público.
 *
 * Lee únicamente el padrón ubicable de `public.elepem`. Las importaciones
 * aprobadas y los 83 registros aislados no forman una capa del mapa.
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
    <div className="aranduDemoBanner" role="note">
      <ShieldAlert size={24} aria-hidden="true" />
      <p><strong>PROTOTIPO ACADÉMICO</strong> · Usá sólo datos de demostración. Las comunicaciones se guardan para que el equipo las vea en su bandeja, pero no se envían a ningún organismo ni representan un servicio oficial.</p>
    </div>
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
