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
const PRICE_LABEL_ZOOM = 13;

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

function monthlyPrice(facility: Facility) {
  const price = facility.monthlyPriceUyu;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

function formatPriceChip(price: number) {
  return `UYU ${price.toLocaleString("es-UY")}`;
}

function priceMarkerIcon(facility: Facility, category: string, isSelected: boolean) {
  const price = monthlyPrice(facility);
  if (price === null) return null;
  const markerClass = [
    "mapPriceMarker",
    `mapPriceMarker-${category}`,
    isSelected ? "mapPriceMarker-selected" : "",
  ].filter(Boolean).join(" ");
  const label = formatPriceChip(price);
  const width = Math.max(84, label.length * 8 + 22);

  return L.divIcon({
    className: "mapPriceMarkerShell",
    html: `<span class="${markerClass}">${label}</span>`,
    iconAnchor: [width / 2, 16],
    iconSize: [width, 32],
  });
}

type RenderedMarker = {
  facility: Facility;
  category: string;
  layer: L.CircleMarker | L.Marker;
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
  if (marker.layer instanceof L.Marker) {
    marker.layer.getElement()
      ?.querySelector(".mapPriceMarker")
      ?.classList.toggle("mapPriceMarker-selected", isSelected);
    return;
  }
  const style = circleMarkerStyle(marker.category, isSelected);
  marker.layer.setRadius(style.radius);
  marker.layer.setStyle(style);
}

export default function StreetMap({
  facilities,
  selectedId,
  onSelect,
  onOpenDetails,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}) {
  const { containerRef, mapRef, markersRef } = useLeafletMap(URUGUAY_VIEW);
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
  const renderedMarkersRef = useRef(new Map<string, RenderedMarker>());
  const onSelectRef = useRef(onSelect);
  const onOpenDetailsRef = useRef(onOpenDetails);
  const selectedIdRef = useRef(selectedId);
  const [showPriceMarkers, setShowPriceMarkers] = useState(false);
  const [viewportRevision, setViewportRevision] = useState(0);
  onSelectRef.current = onSelect;
  onOpenDetailsRef.current = onOpenDetails;
  selectedIdRef.current = selectedId;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let timer: number | undefined;
    const syncViewport = () => {
      const nextPriceMode = map.getZoom() >= PRICE_LABEL_ZOOM;
      setShowPriceMarkers(nextPriceMode);
      if (nextPriceMode) setViewportRevision((value) => value + 1);
    };
    const scheduleSync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(syncViewport, 60);
    };
    const suppressPopup = () => map.closePopup();
    syncViewport();
    map.on("zoomend moveend", scheduleSync);
    map.on("popupopen", suppressPopup);
    return () => {
      window.clearTimeout(timer);
      map.off("zoomend moveend", scheduleSync);
      map.off("popupopen", suppressPopup);
    };
  }, [mapRef]);

  // Los puntos normales comparten un único canvas. Al mostrar precios se crean
  // solamente los marcadores del viewport, no cientos de nodos fuera de vista.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    renderedMarkersRef.current.clear();
    const visibleBounds = showPriceMarkers ? map.getBounds().pad(0.35) : null;
    const visibleFacilities = visibleBounds
      ? mappedFacilities.filter((facility) => visibleBounds.contains([facility.lat, facility.lng]))
      : mappedFacilities;

    for (const facility of visibleFacilities) {
      const isSelected = selectedIdRef.current === facility.id;
      const category = facility.isDemo ? "demo" : facilityDisplayCategory(facility);
      const priceIcon = showPriceMarkers ? priceMarkerIcon(facility, category, isSelected) : null;
      const visibleMarker: L.CircleMarker | L.Marker = priceIcon
        ? L.marker([facility.lat, facility.lng], { icon: priceIcon, keyboard: true })
        : L.circleMarker([facility.lat, facility.lng], circleMarkerStyle(category, isSelected));
      let singleClickTimer: number | undefined;
      visibleMarker.on("click", () => {
        window.clearTimeout(singleClickTimer);
        singleClickTimer = window.setTimeout(() => onSelectRef.current(facility.id), 240);
      });
      visibleMarker.on("dblclick", (event: L.LeafletMouseEvent) => {
        window.clearTimeout(singleClickTimer);
        L.DomEvent.preventDefault(event.originalEvent);
        L.DomEvent.stopPropagation(event.originalEvent);
        onOpenDetailsRef.current?.(facility.id);
      });
      visibleMarker.on("remove", () => window.clearTimeout(singleClickTimer));
      visibleMarker.bindTooltip(facility.name, {
        direction: "top",
        offset: [0, -7],
        opacity: 0.96,
        className: "facilityNameTooltip",
      });
      visibleMarker.addTo(markers);
      renderedMarkersRef.current.set(facility.id, { facility, category, layer: visibleMarker });
    }
  }, [mapRef, mappedFacilities, markersRef, showPriceMarkers, viewportRevision]);

  // La selección sólo modifica los dos marcadores afectados.
  useEffect(() => {
    const previousId = styledSelectedIdRef.current;
    if (previousId !== selectedId) {
      updateMarkerSelection(renderedMarkersRef.current.get(previousId || ""), false);
    }
    updateMarkerSelection(renderedMarkersRef.current.get(selectedId || ""), true);
    styledSelectedIdRef.current = selectedId;
  }, [selectedId]);

  // Encuadrar sólo en la carga inicial o al cambiar los filtros.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = pointsKey(mappedFacilities);
    const bounds = pointBounds(mappedFacilities);
    if (bounds && key !== fittedKeyRef.current) {
      fittedKeyRef.current = key;
      map.fitBounds(bounds, FIT_OPTIONS);
    }
  }, [mapRef, mappedFacilities]);

  useEffect(() => {
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
