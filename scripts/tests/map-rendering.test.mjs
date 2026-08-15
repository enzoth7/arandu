import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const streetMapPath = new URL("../../app/components/StreetMap.tsx", import.meta.url);
const leafletHookPath = new URL("../../app/hooks/useLeafletMap.ts", import.meta.url);
const globalStylesPath = new URL("../../app/globals.css", import.meta.url);
const registryPath = new URL("../../app/components/UruguayRegistry.tsx", import.meta.url);
const filterHookPath = new URL("../../app/hooks/useFacilityFilters.ts", import.meta.url);
const registryLoaderPath = new URL("../../lib/facility-registry.ts", import.meta.url);
const facilityPresentationPath = new URL("../../app/components/facility-presentation.ts", import.meta.url);

test("las etiquetas públicas del registro conservan los tildes UTF-8", async () => {
  const [presentation, registryLoader] = await Promise.all([
    readFile(facilityPresentationPath, "utf8"),
    readFile(registryLoaderPath, "utf8"),
  ]);
  for (const source of [presentation, registryLoader]) {
    assert.doesNotMatch(source, /Ã|Â|â|ï¿½|�/);
  }
  assert.match(presentation, /Situación no confirmada/);
  assert.match(presentation, /Habilitación MSP/);
  assert.match(registryLoader, /Fuente pública/);
});

test("el mapa no crea fichas emergentes por cada residencial", async () => {
  const [source, styles] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.doesNotMatch(source, /bindPopup|createPopup/);
  assert.match(source, /map\.closePopup\(\)/);
  assert.match(styles, /\.leafletRegistryMap \.leaflet-popup \{ display: none !important; \}/);
});

test("los puntos comparten canvas y los precios se ven desde el encuadre nacional", async () => {
  const [mapSource, hookSource] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(leafletHookPath, "utf8"),
  ]);
  assert.match(hookSource, /preferCanvas:\s*true/);
  assert.match(hookSource, /updateWhenIdle:\s*true/);
  assert.match(mapSource, /map\.getBounds\(\)\.pad\(0\.35\)/);
  assert.match(mapSource, /renderedMarkersRef/);
  assert.doesNotMatch(mapSource, /PRICE_LABEL_ZOOM|getZoom\(\)\s*>=/);
  assert.match(mapSource, /const priceIcon = priceMarkerIcon\(facility, category, isSelected\)/);
  assert.doesNotMatch(mapSource, /if \(facility\.isDemo\) return null/);
  assert.match(mapSource, /visibleMarker\.on\("dblclick"/);
  assert.match(mapSource, /onOpenDetailsRef\.current\?\.\(facility\.id\)/);
});

test("el mapa usa una ficha interactiva y reparte mapa y lista en mitades", async () => {
  const [source, styles] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(source, /facilityTooltipContent/);
  assert.match(source, /Sin calificación disponible/);
  assert.match(source, /image\.loading = "lazy"/);
  assert.match(source, /visibleMarker\.on\("focus"/);
  assert.match(source, /className: "facilityRichTooltip"/);
  assert.doesNotMatch(source, /mapPriceMarkerRating|ratingMarkup/);
  assert.match(source, /html: `<span class="\$\{markerClass\}">\$\{label\}<\/span>`/);
  assert.doesNotMatch(source, /\$\{facility\.isDemo \? " · DEMO"/);
  assert.match(styles, /grid-template-columns: minmax\(240px, 290px\) minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(styles, /\.mapFacilityTooltipCard/);
});

test("la capa pública conserva Casa Costa Serena como referencia violeta con clasificación Bueno", async () => {
  const source = await readFile(registryLoaderPath, "utf8");
  assert.match(source, /id = 'DEMO-ELEPEM-001'/);
  assert.match(source, /qualityRating: "good"/);
  assert.match(source, /where publication\.demo_facility_id = facility\.id/);
  assert.match(source, /const approvedPhotoUrls = Array\.isArray\(row\.approved_photo_ids\)/);
  assert.match(source, /photoUrl: photoUrls\[0\] \|\| undefined/);
  assert.match(source, /precisionLabel: "Ubicación aproximada"/);
  assert.match(source, /sourceLabel: "Arandú"/);
  assert.match(source, /statusShort: "Referencia Arandú",[\s\S]{0,180}description: row\.description/);
});

test("el panel recupera los filtros originales y usa clasificación desplegable", async () => {
  const [source, hookSource] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(filterHookPath, "utf8"),
  ]);
  assert.match(source, /<b>Departamento<\/b>[\s\S]*<select value=\{department\}/);
  assert.match(source, /<b>Situación institucional<\/b>[\s\S]*<select value=\{status\}/);
  assert.match(source, /<b>Clasificación<\/b>[\s\S]*<select[\s\S]*value=\{qualityRating\}/);
  assert.match(source, /aria-label="Precio mensual mínimo"/);
  assert.match(source, /aria-label="Precio mensual máximo"/);
  assert.doesNotMatch(source, /registryQualityFilter-/);
  assert.doesNotMatch(source, /ELEPEM de prueba/);
  assert.match(hookSource, /departmentOptions/);
  assert.match(hookSource, /prioritizeFacility\(sortFacilities\(matched, "name"\), "DEMO-ELEPEM-001"\)/);
  assert.match(hookSource, /monthlyPriceMin: activeMonthlyPriceRange\?\.min/);
});

test("la ficha permite salir y muestra precio y clasificación sin etiquetas de prueba", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.doesNotMatch(source, /Precio mensual demostrativo|Precio demostrativo|· DEMO/);
  assert.match(source, /aria-label={`Precio mensual:/);
  assert.match(source, /FacilityQualityBadge facility={facility}/);
  assert.match(source, /facilityCompactPrice/);
  assert.match(source, /onOpenDetails=\{openFacilityDetails\}/);
  assert.doesNotMatch(source, /!facility\.isDemo && typeof facility\.monthlyPriceUyu/);
  assert.match(source, /aria-label="Cerrar ficha"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(styles, /\.facilityMapDialogHeader \{[\s\S]*position: sticky/);
});
