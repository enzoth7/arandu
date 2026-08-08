"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

/** Encuadre nacional por defecto (centro aproximado de Uruguay). */
export const URUGUAY_VIEW = { center: [-32.8, -56] as [number, number], zoom: 6 };

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export type MapPoint = { id: string; lat: number; lng: number };

export type FitOptions = {
  padding?: [number, number];
  maxZoom?: number;
};

/**
 * Ciclo de vida compartido de Leaflet: inicializa el mapa una sola vez, agrega
 * la capa de teselas y un `layerGroup` para los marcadores, y limpia al
 * desmontar. `StreetMap` y `ActivityMap` repetían todo esto con estilos de
 * marcador distintos; aquí queda la parte común y cada mapa aporta la suya.
 */
export function useLeafletMap(view: { center: [number, number]; zoom: number } = URUGUAY_VIEW) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true })
      .setView(viewRef.current.center, viewRef.current.zoom);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  return { containerRef, mapRef, markersRef };
}

/** Límites que contienen todos los puntos, o `null` si la lista está vacía. */
export function pointBounds(points: readonly MapPoint[]) {
  if (!points.length) return null;
  return L.latLngBounds(points.map(({ lat, lng }) => [lat, lng] as [number, number]));
}

/** Clave estable de un conjunto de puntos, para no reencuadrar sin necesidad. */
export function pointsKey(points: readonly MapPoint[]) {
  return points.map((point) => point.id).sort().join("|");
}

/** Vuela hacia un punto concreto de la lista, si existe. */
export function flyToPoint(
  map: L.Map | null,
  points: readonly MapPoint[],
  id: string | null,
  zoom: number,
) {
  if (!map || !id) return false;
  const target = points.find((point) => point.id === id);
  if (!target) return false;
  map.flyTo([target.lat, target.lng], zoom, { duration: 1 });
  return true;
}
