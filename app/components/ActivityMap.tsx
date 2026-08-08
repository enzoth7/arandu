"use client";

import { useEffect } from "react";
import L from "leaflet";
import { flyToPoint, pointBounds, useLeafletMap } from "../hooks/useLeafletMap";
import type { ActivityItem } from "./ActivitiesView";

const ACTIVITY_VIEW = { center: [-32.5228, -55.7658] as [number, number], zoom: 7 };
const SELECTED_ZOOM = 14;
// Un conjunto de puntos contenido en menos de 0,7° es una ciudad o zona: en ese
// caso se acerca más que cuando los resultados se reparten por todo el país.
const LOCAL_AREA_DEGREES = 0.7;

export default function ActivityMap({
  activities,
  selectedId,
  onSelect,
}: {
  activities: ActivityItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { containerRef, mapRef, markersRef } = useLeafletMap(ACTIVITY_VIEW);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    for (const activity of activities) {
      const isSelected = selectedId === activity.id;
      const marker = L.circleMarker([activity.lat, activity.lng], {
        radius: isSelected ? 11 : 8,
        color: isSelected ? "#0f172a" : "#1d4ed8",
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? "#2563eb" : "#3b82f6",
        fillOpacity: 0.9,
      });

      marker.bindTooltip(`${activity.icon} ${activity.title}`, {
        permanent: false,
        direction: "top",
        className: "customMapTooltip",
        offset: [0, -10],
      });
      marker.on("mouseover", () => marker.openTooltip());
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onSelect(activity.id);
        marker.openTooltip();
      });
      if (isSelected) marker.openTooltip();
      marker.addTo(markers);
    }

    const bounds = pointBounds(activities);
    if (bounds && !selectedId) {
      const isLocalArea = Math.abs(bounds.getNorth() - bounds.getSouth()) < LOCAL_AREA_DEGREES
        && Math.abs(bounds.getEast() - bounds.getWest()) < LOCAL_AREA_DEGREES;
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: isLocalArea ? 13 : 8 });
    }
  }, [activities, mapRef, markersRef, onSelect, selectedId]);

  useEffect(() => {
    flyToPoint(mapRef.current, activities, selectedId, SELECTED_ZOOM);
  }, [activities, mapRef, selectedId]);

  return <div ref={containerRef} className="activityMapContainer" role="region" aria-label="Mapa de actividades cercanas"/>;
}
