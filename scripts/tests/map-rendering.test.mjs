import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const streetMapPath = new URL("../../app/components/StreetMap.tsx", import.meta.url);
const leafletHookPath = new URL("../../app/hooks/useLeafletMap.ts", import.meta.url);
const globalStylesPath = new URL("../../app/globals.css", import.meta.url);
const registryPath = new URL("../../app/components/UruguayRegistry.tsx", import.meta.url);

test("el mapa no crea fichas emergentes por cada residencial", async () => {
  const [source, styles] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.doesNotMatch(source, /bindPopup|createPopup/);
  assert.match(source, /map\.closePopup\(\)/);
  assert.match(styles, /\.leafletRegistryMap \.leaflet-popup \{ display: none !important; \}/);
});

test("los puntos comparten canvas y los precios se limitan al viewport", async () => {
  const [mapSource, hookSource] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(leafletHookPath, "utf8"),
  ]);
  assert.match(hookSource, /preferCanvas:\s*true/);
  assert.match(hookSource, /updateWhenIdle:\s*true/);
  assert.match(mapSource, /map\.getBounds\(\)\.pad\(0\.35\)/);
  assert.match(mapSource, /renderedMarkersRef/);
  assert.match(mapSource, /const PRICE_LABEL_ZOOM = 13/);
  assert.doesNotMatch(mapSource, /if \(facility\.isDemo\) return null/);
  assert.match(mapSource, /visibleMarker\.on\("dblclick"/);
  assert.match(mapSource, /onOpenDetailsRef\.current\?\.\(facility\.id\)/);
});

test("la ficha permite salir y muestra el precio demo solamente cuando existe", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(source, /Precio mensual de prueba/);
  assert.match(source, /facilityCompactPrice/);
  assert.match(source, /onOpenDetails=\{openFacilityDetails\}/);
  assert.doesNotMatch(source, /!facility\.isDemo && typeof facility\.monthlyPriceUyu/);
  assert.match(source, /aria-label="Cerrar ficha"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(styles, /\.facilityMapDialogHeader \{[\s\S]*position: sticky/);
});
