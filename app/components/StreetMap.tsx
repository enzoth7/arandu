"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  flyToPoint,
  pointBounds,
  pointsKey,
  URUGUAY_VIEW,
  useLeafletMap,
} from "../hooks/useLeafletMap";
import {
  evidenceDescription,
  facilityDisplayCategory,
  facilityDisplayLabel,
  sourceCategoryLabels,
} from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import type { Facility } from "./map-types";

const FIT_OPTIONS = { padding: [28, 28] as [number, number], maxZoom: 14 };
const SELECTED_ZOOM = 16;

/** Los colores viven en los tokens de `globals.css`; aquí se leen del tema. */
const MARKER_COLOR_VARIABLES: Record<string, string> = {
  habilitado: "--facility-habilitado",
  mides: "--facility-mides",
  unconfirmed: "--facility-unconfirmed",
};

function themeColor(variable: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function markerColor(category: string) {
  const fallbacks: Record<string, string> = {
    habilitado: "#087443",
    mides: "#d97706",
    unconfirmed: "#64748b",
  };
  return themeColor(MARKER_COLOR_VARIABLES[category], fallbacks[category]);
}

function appendText(parent: HTMLElement, tag: string, text: string, className?: string) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

function createPopup(facility: Facility) {
  const popup = document.createElement("div");
  popup.className = "mapPopup";

  appendText(popup, "strong", facility.name);
  appendText(popup, "p", facility.address);
  appendText(popup, "p", `${facility.locality} · ${canonicalDepartment(facility.department)}`);

  const badges = document.createElement("div");
  badges.className = "facilityBadges mapPopupBadges";
  const category = facilityDisplayCategory(facility);
  const tone = category === "habilitado" ? "green" : category === "mides" ? "amber" : "gray";
  appendText(badges, "span", facilityDisplayLabel(facility), `sourceBadge sourceBadge-${tone}`);
  popup.appendChild(badges);

  appendText(popup, "b", `Estado en el mapa: ${facilityDisplayLabel(facility)}`);

  const sourceCategories = sourceCategoryLabels(facility);
  if (sourceCategories.length) {
    appendText(popup, "p", `Procedencia: ${sourceCategories.join(" · ")}`);
  }

  if (facility.privateCandidate) {
    const tier = facility.privateCandidateEvidenceTier || "C";
    appendText(popup, "p", `Evidencia ${tier}: ${evidenceDescription(facility.privateCandidateEvidenceTier)}`);
  }

  appendText(popup, "small", facility.sourceLabel);
  return popup;
}

export default function StreetMap({
  facilities,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { containerRef, mapRef, markersRef } = useLeafletMap(URUGUAY_VIEW);
  const fittedKeyRef = useRef("");
  const previousSelectedIdRef = useRef<string | null>(null);

  // Redibujar marcadores cuando cambia la lista o la selección.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    for (const facility of facilities) {
      const isSelected = selectedId === facility.id;
      const category = facilityDisplayCategory(facility);
      const marker = L.circleMarker([facility.lat, facility.lng], {
        radius: isSelected ? 11 : category === "unconfirmed" ? 8 : 6,
        color: isSelected ? "#155eef" : "#fff",
        weight: isSelected ? 3 : 2,
        fillColor: markerColor(category),
        fillOpacity: 0.92,
      });
      marker.on("click", () => onSelect(facility.id));
      marker.bindTooltip(facility.name, {
        direction: "top",
        offset: [0, -7],
        opacity: 0.96,
        className: "facilityNameTooltip",
      });
      marker.bindPopup(createPopup(facility));
      marker.addTo(markers);
    }

    // Encuadrar sólo en la carga inicial o al cambiar los filtros.
    const key = pointsKey(facilities);
    const bounds = pointBounds(facilities);
    if (bounds && key !== fittedKeyRef.current) {
      fittedKeyRef.current = key;
      map.fitBounds(bounds, FIT_OPTIONS);
    }
  }, [facilities, mapRef, markersRef, onSelect, selectedId]);

  // Acercar al residencial seleccionado.
  useEffect(() => {
    flyToPoint(mapRef.current, facilities, selectedId, SELECTED_ZOOM);
  }, [facilities, mapRef, selectedId]);

  // Al quitar la selección, volver al encuadre general de los resultados.
  useEffect(() => {
    const map = mapRef.current;
    const previousSelectedId = previousSelectedIdRef.current;
    previousSelectedIdRef.current = selectedId;
    if (!map || previousSelectedId === null || selectedId !== null) return;

    const bounds = pointBounds(facilities);
    if (bounds) map.flyToBounds(bounds, { ...FIT_OPTIONS, duration: 0.8 });
    else map.flyTo(URUGUAY_VIEW.center, URUGUAY_VIEW.zoom, { duration: 0.8 });
  }, [facilities, mapRef, selectedId]);

  return <div ref={containerRef} className="leafletRegistryMap" role="region" aria-label="Mapa de residenciales"/>;
}
