"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  flyToPoint,
  pointBounds,
  pointsKey,
  URUGUAY_VIEW,
  useLeafletMap,
} from "../hooks/useLeafletMap";
import { facilityDisplayCategory } from "./facility-presentation";
import type { Facility } from "./map-types";

const FIT_OPTIONS = { padding: [28, 28] as [number, number], maxZoom: 14 };
const SELECTED_ZOOM = 16;

export type RegistryMapViewport = {
  center: [number, number];
  zoom: number;
};

export type RegistryMapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type RegistryMapViewportContext = {
  bounds: RegistryMapBounds;
  userInitiated: boolean;
};

const MARKER_COLOR_VARIABLES: Record<string, string> = {
  habilitado: "--facility-habilitado",
  mides: "--facility-mides",
  unconfirmed: "--facility-unconfirmed",
  demo: "--facility-demo",
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
    demo: "#7c3aed",
  };
  return themeColor(MARKER_COLOR_VARIABLES[category], fallbacks[category]);
}

function facilityTooltipContent(facility: Facility) {
  const card = document.createElement("article");
  card.className = "mapFacilityTooltipCard";
  card.setAttribute("aria-label", `Información de ${facility.name}`);

  const media = document.createElement("span");
  media.className = "mapFacilityTooltipMedia";
  if (facility.photoUrl) {
    const image = document.createElement("img");
    image.src = facility.photoUrl;
    image.alt = "";
    image.loading = "lazy";
    media.append(image);
  } else {
    media.classList.add("is-placeholder");
    media.textContent = "Sin foto";
  }

  const copy = document.createElement("span");
  copy.className = "mapFacilityTooltipCopy";
  const name = document.createElement("strong");
  name.textContent = facility.name;
  const institutionalStatuses = document.createElement("span");
  institutionalStatuses.className = "mapFacilityTooltipStatuses";
  const category = facility.isDemo ? "demo" : facilityDisplayCategory(facility);
  const appendInstitutionalStatus = (label: string, tone: string) => {
    const badge = document.createElement("span");
    badge.className = `mapFacilityTooltipStatus mapFacilityTooltipStatus-${tone}`;
    badge.textContent = label;
    institutionalStatuses.append(badge);
  };
  if (facility.isDemo) {
    appendInstitutionalStatus("Ejemplo", "demo");
  } else {
    if (facility.mspFinal) appendInstitutionalStatus("Habilitado MSP", "habilitado");
    if (facility.midesSocial) appendInstitutionalStatus("Certificado Social MIDES", "mides");
    if (!facility.mspFinal && !facility.midesSocial) {
      appendInstitutionalStatus("Situación no confirmada", category);
    }
  }
  const address = document.createElement("small");
  address.textContent = facility.address || "Dirección no informada";
  copy.append(name, institutionalStatuses, address);
  card.append(media, copy);
  return card;
}

type RenderedMarker = {
  facility: Facility;
  category: string;
  layer: L.CircleMarker;
};

function circleMarkerStyle(category: string, isSelected: boolean) {
  return {
    radius: isSelected ? 11 : category === "unconfirmed" ? 8 : 6,
    color: isSelected ? "#155eef" : "#fff",
    weight: isSelected ? 3 : 2,
    fillColor: markerColor(category),
    fillOpacity: 0.92,
    bubblingMouseEvents: false,
  };
}

function updateMarkerSelection(marker: RenderedMarker | undefined, isSelected: boolean) {
  if (!marker) return;
  const style = circleMarkerStyle(marker.category, isSelected);
  marker.layer.setRadius(style.radius);
  marker.layer.setStyle(style);
}

export default function StreetMap({
  facilities,
  selectedId,
  highlightedId = null,
  onSelect,
  onOpenDetails,
  initialViewport = null,
  onViewportChange,
  restoreSelectionWithoutFlying = false,
  autoFitFacilities = true,
}: {
  facilities: Facility[];
  selectedId: string | null;
  highlightedId?: string | null;
  onSelect: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  initialViewport?: RegistryMapViewport | null;
  onViewportChange?: (viewport: RegistryMapViewport, context: RegistryMapViewportContext) => void;
  restoreSelectionWithoutFlying?: boolean;
  autoFitFacilities?: boolean;
}) {
  const { containerRef, mapRef, markersRef } = useLeafletMap(initialViewport ?? URUGUAY_VIEW);
  const mappedFacilities = useMemo(
    () => facilities.filter((facility) => (
      Number.isFinite(facility.lat)
      && Number.isFinite(facility.lng)
      && facility.lat >= -56
      && facility.lat <= -29
      && facility.lng >= -59
      && facility.lng <= -52
    )),
    [facilities],
  );
  const fittedKeyRef = useRef("");
  const previousSelectedIdRef = useRef<string | null>(null);
  const styledSelectedIdRef = useRef<string | null>(null);
  const styledHighlightedIdRef = useRef<string | null>(null);
  const renderedMarkersRef = useRef(new Map<string, RenderedMarker>());
  const onSelectRef = useRef(onSelect);
  const onOpenDetailsRef = useRef(onOpenDetails);
  const onViewportChangeRef = useRef(onViewportChange);
  const selectedIdRef = useRef(selectedId);
  const userViewportChangeRef = useRef(false);
  const skipInitialFitRef = useRef(Boolean(initialViewport));
  const skipInitialSelectionFlyRef = useRef(restoreSelectionWithoutFlying);
  const [viewportRevision, setViewportRevision] = useState(0);
  onSelectRef.current = onSelect;
  onOpenDetailsRef.current = onOpenDetails;
  onViewportChangeRef.current = onViewportChange;
  selectedIdRef.current = selectedId;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let timer: number | undefined;
    const mapContainer = map.getContainer();
    const markUserViewportChange = () => {
      userViewportChangeRef.current = true;
    };
    const markViewportControlChange = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".leaflet-control-zoom-in, .leaflet-control-zoom-out")) {
        markUserViewportChange();
      }
    };
    const syncViewport = () => {
      setViewportRevision((value) => value + 1);
      const center = map.getCenter();
      const bounds = map.getBounds();
      onViewportChangeRef.current?.(
        { center: [center.lat, center.lng], zoom: map.getZoom() },
        {
          bounds: {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          },
          userInitiated: userViewportChangeRef.current,
        },
      );
      userViewportChangeRef.current = false;
    };
    const scheduleSync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(syncViewport, 60);
    };
    const suppressPopup = () => map.closePopup();
    syncViewport();
    mapContainer.addEventListener("click", markViewportControlChange, true);
    mapContainer.addEventListener("wheel", markUserViewportChange, { capture: true, passive: true });
    mapContainer.addEventListener("keydown", markUserViewportChange, true);
    map.on("dragstart", markUserViewportChange);
    map.on("zoomend moveend", scheduleSync);
    map.on("popupopen", suppressPopup);
    return () => {
      window.clearTimeout(timer);
      mapContainer.removeEventListener("click", markViewportControlChange, true);
      mapContainer.removeEventListener("wheel", markUserViewportChange, true);
      mapContainer.removeEventListener("keydown", markUserViewportChange, true);
      map.off("dragstart", markUserViewportChange);
      map.off("zoomend moveend", scheduleSync);
      map.off("popupopen", suppressPopup);
    };
  }, [mapRef]);

  // Todos los ELEPEM comparten un único canvas; el precio queda reservado para
  // las listas y las fichas, sin competir visualmente con el mapa.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    renderedMarkersRef.current.clear();
    const visibleBounds = map.getBounds().pad(0.35);
    const visibleFacilities = mappedFacilities.filter((facility) => visibleBounds.contains([facility.lat, facility.lng]));

    for (const facility of visibleFacilities) {
      const isSelected = selectedIdRef.current === facility.id;
      const category = facility.isDemo ? "demo" : facilityDisplayCategory(facility);
      const visibleMarker = L.circleMarker(
        [facility.lat, facility.lng],
        circleMarkerStyle(category, isSelected),
      );
      let singleClickTimer: number | undefined;
      visibleMarker.on("click", () => {
        window.clearTimeout(singleClickTimer);
        visibleMarker.openTooltip();
        singleClickTimer = window.setTimeout(() => onSelectRef.current(facility.id), 240);
      });
      visibleMarker.on("focus", () => visibleMarker.openTooltip());
      visibleMarker.on("blur", () => visibleMarker.closeTooltip());
      visibleMarker.on("dblclick", (event: L.LeafletMouseEvent) => {
        window.clearTimeout(singleClickTimer);
        L.DomEvent.preventDefault(event.originalEvent);
        L.DomEvent.stopPropagation(event.originalEvent);
        onOpenDetailsRef.current?.(facility.id);
      });
      visibleMarker.on("remove", () => window.clearTimeout(singleClickTimer));
      visibleMarker.bindTooltip(facilityTooltipContent(facility), {
        direction: "top",
        offset: [0, -10],
        opacity: 0.96,
        className: "facilityRichTooltip",
        interactive: true,
      });
      visibleMarker.addTo(markers);
      renderedMarkersRef.current.set(facility.id, { facility, category, layer: visibleMarker });
    }
  }, [mapRef, mappedFacilities, markersRef, viewportRevision]);

  // La selección y el hover sólo modifican los marcadores afectados. El hover
  // no cambia el centro ni el zoom del mapa.
  useEffect(() => {
    const affectedIds = new Set([
      styledSelectedIdRef.current,
      styledHighlightedIdRef.current,
      selectedId,
      highlightedId,
    ]);
    for (const facilityId of affectedIds) {
      if (!facilityId) continue;
      updateMarkerSelection(
        renderedMarkersRef.current.get(facilityId),
        facilityId === selectedId || facilityId === highlightedId,
      );
    }
    styledSelectedIdRef.current = selectedId;
    styledHighlightedIdRef.current = highlightedId;
  }, [highlightedId, selectedId, viewportRevision]);

  // Encuadrar sólo en la carga inicial o al cambiar los filtros.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = pointsKey(mappedFacilities);
    const bounds = pointBounds(mappedFacilities);
    if (!autoFitFacilities) {
      fittedKeyRef.current = key;
      return;
    }
    if (skipInitialFitRef.current) {
      skipInitialFitRef.current = false;
      fittedKeyRef.current = key;
      return;
    }
    if (bounds && key !== fittedKeyRef.current) {
      fittedKeyRef.current = key;
      map.fitBounds(bounds, FIT_OPTIONS);
    }
  }, [autoFitFacilities, mapRef, mappedFacilities]);

  useEffect(() => {
    if (skipInitialSelectionFlyRef.current) {
      skipInitialSelectionFlyRef.current = false;
      return;
    }
    flyToPoint(mapRef.current, mappedFacilities, selectedId, SELECTED_ZOOM);
  }, [mapRef, mappedFacilities, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const previousSelectedId = previousSelectedIdRef.current;
    previousSelectedIdRef.current = selectedId;
    if (!map || previousSelectedId === null || selectedId !== null) return;

    const bounds = pointBounds(mappedFacilities);
    if (bounds) map.flyToBounds(bounds, { ...FIT_OPTIONS, duration: 0.8 });
    else map.flyTo(URUGUAY_VIEW.center, URUGUAY_VIEW.zoom, { duration: 0.8 });
  }, [mapRef, mappedFacilities, selectedId]);

  return <div ref={containerRef} className="leafletRegistryMap" role="region" aria-label="Mapa de ELEPEM"/>;
}
