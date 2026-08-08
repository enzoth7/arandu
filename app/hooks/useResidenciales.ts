"use client";

import { useEffect, useState } from "react";
import type { Facility } from "../components/map-types";

type ResidencialesResponse = {
  facilities?: Facility[];
  error?: string;
};

/**
 * Padrón público de residenciales.
 *
 * `initialFacilities` viene del componente de servidor de la ruta, así que la
 * primera pintura ya trae datos y no hay cascada cliente → API → base. Si el
 * servidor pudo resolverlo, no se vuelve a pedir en el cliente.
 *
 * La petición de respaldo usa la caché por defecto en lugar de `no-store`: la
 * ruta ya publica `s-maxage=300, stale-while-revalidate=3600`, y forzar
 * `no-store` anulaba ese encabezado y provocaba una ida completa a la base en
 * cada montaje (medido entre 1,4 y 1,9 s).
 */
export function useResidenciales(initialFacilities: Facility[] = []) {
  const hasInitial = initialFacilities.length > 0;
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasInitial) return;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/residenciales", { signal: controller.signal });
        let data: ResidencialesResponse;
        try {
          data = await response.json() as ResidencialesResponse;
        } catch {
          throw new Error("No se pudo cargar el listado de ELEPEM.");
        }

        if (!response.ok || !Array.isArray(data.facilities)) {
          throw new Error(data.error || "No se pudo cargar el listado de ELEPEM.");
        }

        setFacilities(data.facilities);
        setError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el listado de ELEPEM.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [hasInitial]);

  return { facilities, loading, error };
}
