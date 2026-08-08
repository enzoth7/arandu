"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildPrivateCandidateLayer,
  EMPTY_CANDIDATE_SUMMARY,
} from "../../lib/private-candidate-layer.mjs";
import type {
  PrivateCandidateSummary,
  UnlocatedDiscoveryCandidate,
} from "../../lib/private-candidate-layer.mjs";
import type { Facility } from "../components/map-types";

export type {
  EvidenceTier,
  PrivateCandidateSummary,
  PrivateQueueCandidate,
  PrivateUnlocatedCandidate,
  UnlocatedDiscoveryCandidate,
} from "../../lib/private-candidate-layer.mjs";
export type { SourceCategory as CandidateSourceCategory } from "../../lib/facility-sources.mjs";
export { EMPTY_CANDIDATE_SUMMARY } from "../../lib/private-candidate-layer.mjs";

type CandidateResponse = { candidates?: unknown[]; error?: string };
type UnlocatedResponse = { candidates?: UnlocatedDiscoveryCandidate[]; error?: string };

async function readJson<T>(response: Response): Promise<T> {
  return await response.json().catch(() => ({})) as T;
}

/**
 * Carga la capa privada de candidatos. Sólo responde con datos para sesiones de
 * equipo autenticadas: en el portal de personas ambas rutas devuelven 401 y el
 * hook queda en estado no disponible, sin exponer candidatos en el mapa público.
 */
export function usePrivateCandidateMapLayer() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [unlocatedCandidates, setUnlocatedCandidates] = useState<UnlocatedDiscoveryCandidate[]>([]);
  const [summary, setSummary] = useState<PrivateCandidateSummary>(EMPTY_CANDIDATE_SUMMARY);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    try {
      const [candidateResponse, unlocatedResponse] = await Promise.all([
        fetch("/api/team/facility-candidates", { cache: "no-store", signal }),
        fetch("/api/team/facility-candidates/unlocated", { cache: "no-store", signal }),
      ]);
      const data = await readJson<CandidateResponse>(candidateResponse);
      const unlocated = await readJson<UnlocatedResponse>(unlocatedResponse);

      if (!candidateResponse.ok || !Array.isArray(data.candidates)) {
        throw new Error(data.error || "No se pudo cargar la capa privada de candidatos.");
      }

      const manualCandidates = unlocatedResponse.ok && Array.isArray(unlocated.candidates)
        ? unlocated.candidates
        : [];
      const manualWarning = !unlocatedResponse.ok
        ? unlocated.error || "No se pudo cargar la lista interna de candidatos sin ubicar."
        : "";

      const layer = buildPrivateCandidateLayer<Facility>(data.candidates, manualCandidates);
      if (signal.aborted) return;

      setAvailable(true);
      setFacilities(layer.facilities);
      setSummary(layer.summary);
      setUnlocatedCandidates(manualCandidates);
      setError(manualWarning);
    } catch (loadError) {
      if (signal.aborted) return;
      setAvailable(false);
      setFacilities([]);
      setSummary(EMPTY_CANDIDATE_SUMMARY);
      setUnlocatedCandidates([]);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la capa privada.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    // Sólo se refresca si la capa está disponible. Sin este control, un portal
    // sin sesión repetía las dos peticiones —y sus dos 401— en cada cambio de
    // pestaña, para siempre.
    const refreshWhenVisible = () => {
      if (!available) return;
      if (document.visibilityState === "visible") void load(controller.signal);
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [available, load]);

  return { facilities, unlocatedCandidates, summary, available, loading, error };
}
