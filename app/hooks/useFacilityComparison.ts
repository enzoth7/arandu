"use client";

import { useCallback, useMemo, useState } from "react";
import {
  canCompare,
  MAX_COMPARISON,
  MIN_COMPARISON,
  toggleSelection,
} from "../../lib/facility-comparison.mjs";
import type { Facility } from "../components/map-types";

/**
 * Selección de ELEPEM para comparar.
 *
 * La selección se guarda por identificador y se resuelve contra la lista
 * completa, no contra la filtrada: si alguien elige dos establecimientos y
 * después cambia un filtro, la selección no se pierde sin aviso.
 */
export function useFacilityComparison(facilities: Facility[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => toggleSelection(current, id, MAX_COMPARISON));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds([]);
    setIsOpen(false);
  }, []);

  const byId = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);
  const selected = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((f): f is Facility => Boolean(f)),
    [byId, selectedIds],
  );

  return {
    selectedIds,
    selected,
    isSelected: (id: string) => selectedIds.includes(id),
    toggle,
    clear,
    atLimit: selectedIds.length >= MAX_COMPARISON,
    canCompare: canCompare(selectedIds),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    minimum: MIN_COMPARISON,
    maximum: MAX_COMPARISON,
  };
}
