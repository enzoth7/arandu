import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PUBLIC_REGISTRY_STATE_MAX_AGE_MS,
  hasPublicRegistryFilterParams,
  parsePublicRegistrySearchParams,
  parsePublicRegistryState,
  serializePublicRegistrySearchParams,
} from "../../lib/public-registry-state.mjs";
import { emptyFacilityAttributeFilters } from "../../lib/facility-filter-options.mjs";
import {
  formatPublicFacilityCode,
  parsePublicFacilityCode,
  publicFacilityPath,
} from "../../lib/public-facility-code.mjs";

const streetMapPath = new URL("../../app/components/StreetMap.tsx", import.meta.url);
const leafletHookPath = new URL("../../app/hooks/useLeafletMap.ts", import.meta.url);
const globalStylesPath = new URL("../../app/globals.css", import.meta.url);
const registryPath = new URL("../../app/components/UruguayRegistry.tsx", import.meta.url);
const facilityProfilePath = new URL("../../app/components/FacilityProfile.tsx", import.meta.url);
const facilityPagePath = new URL("../../app/(publico)/elepem/[codigo]/page.tsx", import.meta.url);
const publicScrollResetPath = new URL("../../app/components/PublicScrollReset.tsx", import.meta.url);
const photoCarouselPath = new URL("../../app/components/FacilityPhotoCarousel.tsx", import.meta.url);
const filterHookPath = new URL("../../app/hooks/useFacilityFilters.ts", import.meta.url);
const registryLoaderPath = new URL("../../lib/facility-registry.ts", import.meta.url);
const facilityPresentationPath = new URL("../../app/components/facility-presentation.ts", import.meta.url);
const residencialesFormPath = new URL("../../app/components/ResidencialesFormView.tsx", import.meta.url);
const homeHeroPath = new URL("../../app/components/AranduHomeHero.tsx", import.meta.url);
const attributeFiltersPath = new URL("../../app/components/RegistryAttributeFilters.tsx", import.meta.url);
const qualityRatingSelectPath = new URL("../../app/components/QualityRatingSelect.tsx", import.meta.url);
const nextConfigPath = new URL("../../next.config.mjs", import.meta.url);
const portalChromePath = new URL("../../app/components/PortalChrome.tsx", import.meta.url);
const accountAccessPath = new URL("../../app/components/AccountAccess.tsx", import.meta.url);
const publicRegistryPagePath = new URL("../../app/(publico)/page.tsx", import.meta.url);
const residencialesApiPath = new URL("../../app/api/residenciales/route.ts", import.meta.url);
const residencialesHookPath = new URL("../../app/hooks/useResidenciales.ts", import.meta.url);

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

test("los puntos comparten canvas y el mapa no muestra precios", async () => {
  const [mapSource, hookSource] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(leafletHookPath, "utf8"),
  ]);
  assert.match(hookSource, /preferCanvas:\s*true/);
  assert.match(hookSource, /updateWhenIdle:\s*true/);
  assert.match(mapSource, /map\.getBounds\(\)\.pad\(0\.35\)/);
  assert.match(mapSource, /renderedMarkersRef/);
  assert.doesNotMatch(mapSource, /priceMarkerIcon|mapPriceMarker|formatPriceChip|monthlyPriceUyu/);
  assert.match(mapSource, /const visibleMarker = L\.circleMarker/);
  assert.match(mapSource, /visibleMarker\.on\("dblclick"/);
  assert.match(mapSource, /onOpenDetailsRef\.current\?\.\(facility\.id\)/);
});

test("la lista sigue la zona visible sin quitar los demás filtros", async () => {
  const [mapSource, registrySource] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(registryPath, "utf8"),
  ]);

  assert.match(mapSource, /export type RegistryMapBounds/);
  assert.match(mapSource, /userInitiated: userViewportChangeRef\.current/);
  assert.match(mapSource, /map\.on\("dragstart", markUserViewportChange\)/);
  assert.match(mapSource, /mapContainer\.addEventListener\("click", markViewportControlChange/);
  assert.match(mapSource, /mapContainer\.addEventListener\("wheel"/);
  assert.match(mapSource, /if \(!autoFitFacilities\)/);
  assert.match(registrySource, /const resultFacilities = useMemo/);
  assert.match(registrySource, /facility\.lat >= mapBounds\.south/);
  assert.match(registrySource, /facility\.lng <= mapBounds\.east/);
  assert.match(registrySource, /const mapFacilities = visible/);
  assert.match(registrySource, /autoFitFacilities=\{!mapAreaActive\}/);
  assert.match(registrySource, /setMapResetRevision\(\(revision\) => revision \+ 1\)/);
  assert.match(registrySource, /key=\{`registry-map-\$\{mapResetRevision\}`\}/);
  assert.match(registrySource, /if \(context\.userInitiated\)[\s\S]*setMapAreaActive\(true\)[\s\S]*if \(department\) setDepartment\(""\)/);
  assert.match(registrySource, /ELEPEM en esta zona del mapa/);
});

test("el mapa muestra el estado institucional y comparte el ancho con la lista", async () => {
  const [source, styles] = await Promise.all([
    readFile(streetMapPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(source, /facilityTooltipContent/);
  assert.match(source, /appendInstitutionalStatus\("Habilitado MSP", "habilitado"\)/);
  assert.match(source, /appendInstitutionalStatus\("Certificado Social MIDES", "mides"\)/);
  assert.match(source, /className = "mapFacilityTooltipStatuses"/);
  assert.doesNotMatch(source, /Habilitación final MSP|\.join\(" · "\)/);
  assert.match(source, /Situación no confirmada/);
  assert.doesNotMatch(source, /calificación|qualityRating|mapFacilityTooltipRating/i);
  assert.match(source, /image\.loading = "lazy"/);
  assert.match(source, /visibleMarker\.on\("focus"/);
  assert.match(source, /className: "facilityRichTooltip"/);
  assert.doesNotMatch(source, /mapPriceMarker|ratingMarkup/);
  assert.doesNotMatch(source, /\$\{facility\.isDemo \? " · DEMO"/);
  assert.match(styles, /grid-template-columns: minmax\(300px, 340px\) repeat\(2, minmax\(360px, 1fr\)\)/);
  assert.match(styles, /grid-template-areas: "filters map results"/);
  assert.match(styles, /\.registryFiltersPanel \{[\s\S]{0,260}height: auto;[\s\S]{0,180}overflow: visible/);
  assert.match(styles, /\.registryMapColumn \{[\s\S]{0,120}position: sticky;[\s\S]{0,80}top: 96px/);
  assert.match(styles, /\.mapFacilityTooltipCard/);
  assert.match(styles, /\.mapFacilityTooltipStatus/);
});

test("la portada muestra la foto nítida, completa y sin un velo blanco", async () => {
  const [hero, styles] = await Promise.all([
    readFile(homeHeroPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(hero, /src="\/Hero\.webp"/);
  assert.match(styles, /\.aranduHeroVisual \{[\s\S]{0,220}position: absolute;[\s\S]{0,160}inset: 0;/);
  assert.doesNotMatch(styles, /\.aranduHeroVisual::before/);
  assert.match(hero, /href="#mapa-registro"/);
  assert.match(hero, /registry\.scrollIntoView/);
  assert.match(styles, /\.aranduHero \{[\s\S]{0,220}overflow: hidden;[\s\S]{0,100}border-radius: 28px/);
  assert.match(styles, /\.aranduHeroImage \{[\s\S]{0,220}object-fit: contain;[\s\S]{0,100}object-position: right center;[\s\S]{0,100}transform: none;[\s\S]{0,100}filter: none;[\s\S]{0,100}opacity: 1/);
  assert.match(styles, /\.aranduHero::before \{[\s\S]{0,260}width: 58%;[\s\S]{0,100}background: #fff/);
  assert.match(styles, /\.aranduHeroVisual::after \{ display: none; \}/);
  assert.doesNotMatch(styles, /\.aranduHero::before \{[\s\S]{0,260}linear-gradient/);
  assert.match(styles, /\.aranduHeroCredit \{[\s\S]{0,120}width: 100%;[\s\S]{0,100}text-align: right/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.aranduHeroVisual \{[\s\S]{0,180}position: relative;[\s\S]{0,180}aspect-ratio: 1400 \/ 935/);
});

test("el aviso académico aparece en el acceso de cuenta y en todos los portales", async () => {
  const [portalChrome, accountAccess] = await Promise.all([
    readFile(portalChromePath, "utf8"),
    readFile(accountAccessPath, "utf8"),
  ]);
  assert.match(portalChrome, /<AcademicPrototypeNotice \/>/);
  assert.doesNotMatch(portalChrome, /portal === "public" && <AcademicPrototypeNotice/);
  assert.match(accountAccess, /<main className="accessGate">[\s\S]*<AcademicPrototypeNotice \/>/);
});

test("el padrón público consulta Supabase sin una ventana de caché", async () => {
  const [page, api, hook] = await Promise.all([
    readFile(publicRegistryPagePath, "utf8"),
    readFile(residencialesApiPath, "utf8"),
    readFile(residencialesHookPath, "utf8"),
  ]);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(page, /export const revalidate = 300/);
  assert.match(api, /"Cache-Control": "no-store, max-age=0"/);
  assert.match(hook, /fetch\("\/api\/residenciales", \{ cache: "no-store", signal: controller\.signal \}\)/);
});

test("las listas muestran las denominaciones institucionales completas", async () => {
  const [registrySource, facilityProfileSource, residencialesFormSource] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(facilityProfilePath, "utf8"),
    readFile(residencialesFormPath, "utf8"),
  ]);

  assert.match(`${registrySource}\n${facilityProfileSource}`, /label: "Habilitación MSP"/);
  assert.match(`${registrySource}\n${facilityProfileSource}`, /label: "Certificado social MIDES"/);
  assert.match(residencialesFormSource, /label: "Habilitado MSP"/);
  assert.match(residencialesFormSource, /label: "Certificado Social MIDES"/);
});

test("el registro conserva filtros, selección y viewport con un snapshot versionado", async () => {
  const now = Date.UTC(2026, 7, 15, 12, 0, 0);
  const snapshot = {
    version: 1,
    savedAt: now - 1_000,
    filters: {
      query: "costa",
      department: "Montevideo",
      monthlyPriceRange: { min: 50_000, max: 90_000 },
      status: "habilitado",
      qualityRating: "good",
      priceOrder: "asc",
      photoAvailability: "with",
      attributeFilters: {
        ...emptyFacilityAttributeFilters(),
        careServices: ["enfermeria"],
      },
    },
    registryView: "mixed",
    selectedId: "ELP-0001",
    mapAreaActive: true,
    scroll: { windowY: 720, resultsY: 430 },
    mapViewport: { center: [-34.9, -56.2], zoom: 13 },
  };

  assert.deepEqual(parsePublicRegistryState(JSON.stringify(snapshot), now), snapshot);
  assert.equal(parsePublicRegistryState(JSON.stringify({ ...snapshot, version: 2 }), now), null);
  assert.equal(parsePublicRegistryState(JSON.stringify({
    ...snapshot,
    savedAt: now - PUBLIC_REGISTRY_STATE_MAX_AGE_MS - 1,
  }), now), null);
  assert.deepEqual(parsePublicRegistryState(JSON.stringify({
    ...snapshot,
    mapViewport: { center: [-120, -56.2], zoom: 13 },
  }), now), { ...snapshot, mapViewport: null });

  assert.deepEqual(parsePublicRegistryState(JSON.stringify({
    version: 1,
    savedAt: now - 2_000,
    filters: {
      query: "costa",
      department: "Montevideo",
      monthlyPriceRange: { min: 90_000, max: 50_000 },
      status: "estado-retirado",
      qualityRating: "valor-retirado",
      priceOrder: "lado",
      photoAvailability: "desconocido",
      attributeFilters: { careServices: ["valor_invalido"] },
    },
    registryView: "grid",
    selectedId: { id: "ELP-0001" },
    scroll: { windowY: -120, resultsY: "430" },
    mapViewport: { center: [-34.9, -56.2], zoom: 99 },
  }), now), {
    version: 1,
    savedAt: now - 2_000,
    filters: {
      query: "costa",
      department: "Montevideo",
      monthlyPriceRange: null,
      status: "",
      qualityRating: "",
      priceOrder: "",
      photoAvailability: "",
      attributeFilters: emptyFacilityAttributeFilters(),
    },
    registryView: "mixed",
    selectedId: null,
    mapAreaActive: false,
    scroll: { windowY: 0, resultsY: 0 },
    mapViewport: null,
  });

  assert.deepEqual(parsePublicRegistryState(JSON.stringify({
    version: 1,
    savedAt: now - 3_000,
    filters: { query: "serena", department: "Canelones" },
  }), now), {
    version: 1,
    savedAt: now - 3_000,
    filters: {
      query: "serena",
      department: "Canelones",
      monthlyPriceRange: null,
      status: "",
      qualityRating: "",
      priceOrder: "",
      photoAvailability: "",
      attributeFilters: emptyFacilityAttributeFilters(),
    },
    registryView: "mixed",
    selectedId: null,
    mapAreaActive: false,
    scroll: { windowY: 0, resultsY: 0 },
    mapViewport: null,
  });

  const registrySource = await readFile(registryPath, "utf8");
  assert.match(registrySource, /PUBLIC_REGISTRY_STATE_KEY/);
  assert.match(registrySource, /resultsScrollRef/);
  assert.match(registrySource, /lastResultsScrollYRef/);
  assert.match(registrySource, /mapViewportRef/);
  assert.match(registrySource, /persistenceReadyRef/);
  assert.match(registrySource, /suppressAutoScroll=\{restoringNavigation\}/);
  assert.match(registrySource, /Algunos residenciales están incluidos tanto en la lista de Habilitados como en la de Certificados\./);
});

test("los filtros relevantes se comparten por URL y toleran valores retirados", () => {
  const attributes = { ...emptyFacilityAttributeFilters(), careServices: ["enfermeria"] };
  const params = serializePublicRegistrySearchParams({
    query: "costa",
    department: "Canelones",
    monthlyPriceRange: { min: 50_000, max: 90_000 },
    status: "mides",
    qualityRating: "good",
    priceOrder: "asc",
    photoAvailability: "with",
    attributeFilters: attributes,
  }, "?elepem=DEMO-ELEPEM-001");
  assert.equal(params.get("elepem"), "DEMO-ELEPEM-001");
  assert.equal(hasPublicRegistryFilterParams(params), true);
  assert.deepEqual(parsePublicRegistrySearchParams(params), {
    query: "costa",
    department: "Canelones",
    monthlyPriceRange: { min: 50_000, max: 90_000 },
    status: "mides",
    qualityRating: "good",
    priceOrder: "asc",
    photoAvailability: "with",
    attributeFilters: attributes,
  });
  assert.deepEqual(parsePublicRegistrySearchParams("?cuidados=valor_retirado").attributeFilters, emptyFacilityAttributeFilters());
  assert.equal(parsePublicRegistrySearchParams("?clasificacion=valor_retirado").qualityRating, "");
});

test("recargar o volver inicia arriba sin reponer el scroll anterior", async () => {
  const [source, page, scrollReset] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(facilityPagePath, "utf8"),
    readFile(publicScrollResetPath, "utf8"),
  ]);

  assert.match(scrollReset, /window\.history\.scrollRestoration = "manual"/);
  assert.match(scrollReset, /window\.location\.pathname !== "\/"/);
  assert.match(scrollReset, /\["#registro", "#mapa-registro"\]\.includes\(window\.location\.hash\)/);
  assert.match(scrollReset, /requestedTarget\.scrollIntoView/);
  assert.match(scrollReset, /window\.addEventListener\("pageshow", resetHomeScroll\)/);
  assert.match(scrollReset, /window\.addEventListener\("popstate", resetHomeScroll\)/);
  assert.match(scrollReset, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(source, /scroll: \{[\s\S]{0,100}windowY: 0,[\s\S]{0,100}resultsY: 0/);
  assert.doesNotMatch(source, /RESTORE_SCROLL_|scroll\.windowY|scroll\.resultsY/);
  assert.match(page, /<Link href="\/" className="facilityPermanentBack">/);
});

test("Ver más no selecciona ni desplaza el mapa y la tarjeta sí puede señalarlo", async () => {
  const [source, mapSource] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(streetMapPath, "utf8"),
  ]);
  const openDetailsStart = source.indexOf("function openFacilityDetails");
  const openDetailsSource = source.slice(openDetailsStart, source.indexOf("\n\n  return <>", openDetailsStart));

  assert.doesNotMatch(openDetailsSource, /setSelectedId/);
  assert.match(openDetailsSource, /window\.open\(publicFacilityPath\(facility\.registryId\), "_blank", "noopener,noreferrer"\)/);
  assert.doesNotMatch(openDetailsSource, /router\.push/);
  assert.doesNotMatch(source, /mapColumnRef|scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /className="facilityCardSelect"[\s\S]{0,240}onClick=\{\(\) => onSelect\(facility\)\}/);
  assert.match(source, /onMouseEnter=\{\(\) => onHighlight\(facility\.id\)\}/);
  assert.match(source, /highlightedId=\{highlightedId\}/);
  assert.match(mapSource, /facilityId === selectedId \|\| facilityId === highlightedId/);
  assert.doesNotMatch(mapSource, /flyToPoint\([^\n]*highlightedId/);
});

test("la capa pública conserva Casa Costa Serena como referencia violeta y datos de filtros", async () => {
  const source = await readFile(registryLoaderPath, "utf8");
  assert.match(source, /id = 'DEMO-ELEPEM-001'/);
  assert.match(source, /facility\.cuidados_profesionales/);
  assert.match(source, /careServices: row\.cuidados_profesionales/);
  assert.match(source, /where publication\.demo_facility_id = facility\.id/);
  assert.match(source, /const approvedPhotoUrls = Array\.isArray\(row\.approved_photo_paths\)/);
  assert.match(source, /left join storage\.objects as storage_object/);
  assert.match(source, /filter \(where storage_object\.id is not null\)/);
  assert.match(source, /storage\/v1\/object\/public\/\$\{FACILITY_PHOTO_BUCKET\}/);
  assert.match(source, /photoUrl: photoUrls\[0\] \|\| undefined/);
  assert.match(source, /precisionLabel: "Ubicación aproximada"/);
  assert.match(source, /sourceLabel: "Arandú"/);
  assert.match(source, /statusShort: "Referencia Arandú",[\s\S]{0,700}description: row\.description/);
  assert.match(source, /qualityRating: "good"/);
});

test("el panel agrupa filtros verificables y conserva la clasificación", async () => {
  const [source, hookSource, attributeFilters, qualityRatingSelect] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(filterHookPath, "utf8"),
    readFile(attributeFiltersPath, "utf8"),
    readFile(qualityRatingSelectPath, "utf8"),
  ]);
  assert.match(source, /<b>Departamento<\/b>[\s\S]*<select value=\{department\}/);
  assert.match(source, /<b>Situación institucional<\/b>[\s\S]*<select value=\{status\}/);
  assert.match(source, /<b id="registry-quality-filter-label">Clasificación<\/b>[\s\S]*<QualityRatingSelect/);
  assert.match(qualityRatingSelect, /QUALITY_RATING_LABELS/);
  assert.match(qualityRatingSelect, /Sin calificar/);
  assert.match(qualityRatingSelect, /registryQualityDot-/);
  assert.match(qualityRatingSelect, /role="listbox"/);
  assert.match(attributeFilters, /<div className="registryAdvancedFilters">/);
  assert.match(attributeFilters, /<fieldset key=\{group\.key\}>/);
  assert.match(attributeFilters, /type="checkbox"/);
  assert.doesNotMatch(attributeFilters, /Más filtros|Sin información verificada|registryDemoFilterNotice/);
  assert.match(source, /<b>Ordenar por:<\/b>[\s\S]*Precio: menor a mayor[\s\S]*Precio: mayor a menor/);
  assert.doesNotMatch(source, /Los residenciales sin precio quedan al final/);
  assert.match(source, /<b>Fotografías<\/b>[\s\S]*value=\{photoAvailability\}/);
  assert.match(source, /aria-label="Precio mensual mínimo"/);
  assert.match(source, /aria-label="Precio mensual máximo"/);
  assert.doesNotMatch(source, /ELEPEM de prueba/);
  assert.doesNotMatch(source, /activeFilterChips|registryActiveFilters|Quitar filtro/);
  assert.match(hookSource, /departmentOptions/);
  assert.match(hookSource, /sortFacilitiesByPrice\(matched, priceOrder\)/);
  assert.match(hookSource, /photoAvailability/);
  assert.match(hookSource, /qualityRating/);
  assert.match(hookSource, /attributeFilters/);
  assert.match(hookSource, /monthlyPriceMin: activeMonthlyPriceRange\?\.min/);
  assert.match(source, /serializePublicRegistrySearchParams/);
  assert.match(source, /window\.addEventListener\("popstate"/);
});

test("la política de contenido permite las fotografías públicas de Supabase", async () => {
  const config = await readFile(nextConfigPath, "utf8");
  assert.match(config, /img-src 'self' data: blob: \$\{supabaseOrigin\} https:\/\/\*\.supabase\.co/);
  assert.match(config, /connect-src 'self' \$\{supabaseOrigin\} https:\/\/\*\.supabase\.co/);
  assert.match(config, /images:\s*\{[\s\S]*remotePatterns:\s*\[[\s\S]*hostname: supabaseUrl\.hostname/);
  assert.match(config, /pathname: "\/storage\/v1\/object\/public\/intake-evidence\/\*\*"/);
  assert.match(config, /search: ""/);
});

test("la ficha permite salir y las tarjetas muestran precio y clasificación", async () => {
  const [source, profile, page, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(facilityProfilePath, "utf8"),
    readFile(facilityPagePath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.doesNotMatch(source, /Precio mensual demostrativo|Precio demostrativo|· DEMO/);
  assert.match(source, /aria-label=\{hasPublicPrice \? `Precio mensual:/);
  assert.match(source, /Precio no informado/);
  assert.match(profile, /function FacilityQualityBadge/);
  assert.match(profile, /Sin calificar/);
  assert.match(source, /facilityCompactPrice/);
  assert.match(source, /onOpenDetails=\{openFacilityDetails\}/);
  assert.doesNotMatch(source, /!facility\.isDemo && typeof facility\.monthlyPriceUyu/);
  assert.match(source, /aria-label="Cerrar ficha"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /dialog\.showModal\(\)/);
  assert.match(source, /onClose=\{\(event\) => \{[\s\S]{0,100}event\.target === event\.currentTarget/);
  assert.match(profile, /<FacilityPhotoCarousel facilityName=\{facility\.name\}/);
  assert.match(page, /Volver a resultados/);
  assert.match(page, /resolvePublicFacilityRoute/);
  assert.match(source, /window\.open\(publicFacilityPath\(facility\.registryId\), "_blank", "noopener,noreferrer"\)/);
  assert.match(styles, /\.facilityMapDialogHeader \{[\s\S]*position: sticky/);
});

test("la vista Lista alinea acción, precio y clasificación a la derecha", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  const listCardSource = source.slice(
    source.indexOf("function FacilityListCard"),
    source.indexOf("function FacilityMapDialog"),
  );

  assert.match(listCardSource, /<FacilityPrimaryStatusBadge facility=\{facility\} \/>/);
  assert.doesNotMatch(listCardSource, /Localidad:<\/b>|Departamento:<\/b>|Dirección:<\/b>/);
  assert.match(listCardSource, /facility\.locality[\s\S]*canonicalDepartment\(facility\.department\)[\s\S]*facility\.address/);
  assert.match(listCardSource, /className="facilityBookingAction"[\s\S]*>Ver más<\/button>[\s\S]*facilityBookingPrice[\s\S]*FacilityQualityBadge/);
  assert.match(listCardSource, /Precio no informado/);
  assert.doesNotMatch(listCardSource, /<small>Precio mensual<\/small>/);
  assert.doesNotMatch(listCardSource, /Fuente:/);
  assert.match(styles, /\.facilityBookingAside[\s\S]{0,220}align-items: flex-end/);
  assert.match(styles, /\.qualityRatingBadge/);
});

test("la vista mixta es estática y muestra datos, clasificación, precio y acción", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  const mixedCardSource = source.slice(
    source.indexOf("function FacilityResultCard"),
    source.indexOf("function FacilityListCard"),
  );

  assert.match(mixedCardSource, /<FacilityPrimaryStatusBadge facility=\{facility\} \/>/);
  assert.doesNotMatch(mixedCardSource, /Localidad:<\/b>|Departamento:<\/b>|Dirección:<\/b>/);
  assert.match(mixedCardSource, /facility\.locality[\s\S]*canonicalDepartment\(facility\.department\)[\s\S]*facility\.address/);
  assert.match(mixedCardSource, /className="facilityCompactAside"[\s\S]*className="facilityCompactAction"[\s\S]*>Ver más<\/button>[\s\S]*facilityCompactPrice[\s\S]*FacilityQualityBadge/);
  assert.match(mixedCardSource, /Precio no informado/);
  assert.doesNotMatch(mixedCardSource, /aria-expanded|facilityAccordionChevron|facilityAccordionBody|ChevronUp|ChevronDown/);
  assert.doesNotMatch(mixedCardSource, /<small>Precio mensual<\/small>/);
  assert.match(styles, /\.facilityCompactAside[\s\S]{0,180}justify-items: end/);
  assert.match(styles, /\.facilityCompactLayout[\s\S]{0,160}min-height: 206px/);
  assert.match(styles, /\.qualityRatingBadge/);
});

test("la ficha muestra todos los medios de contacto públicos disponibles", async () => {
  const [source, styles, registryLoader] = await Promise.all([
    readFile(facilityProfilePath, "utf8"),
    readFile(globalStylesPath, "utf8"),
    readFile(registryLoaderPath, "utf8"),
  ]);
  assert.match(source, /function FacilityContactChannels/);
  assert.match(source, /facility\.contactPhones, facility\.contactPhone/);
  assert.match(source, /facility\.contactEmails, facility\.contactEmail/);
  assert.match(source, /facility\.websites/);
  assert.match(source, /facility\.instagramUrls/);
  assert.match(source, /facility\.facebookUrls/);
  assert.match(source, /<FacilityContactChannels facility=\{facility\} \/>/);
  assert.match(source, /target: "_blank", rel: "noreferrer"/);
  assert.match(styles, /\.facilityContactChannelList \{[\s\S]{0,180}grid-template-columns: repeat\(auto-fill, minmax\(250px, 320px\)\);[\s\S]{0,100}justify-content: start/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.facilityContactChannelList \{ grid-template-columns: 1fr; \}/);
  assert.match(registryLoader, /contactPhone: row\.telefonos\[0\] \|\| undefined/);
  assert.match(registryLoader, /contactEmail: row\.emails\[0\] \|\| undefined/);
});

test("cada id tiene un código ELPM y una ruta pública determinista", () => {
  assert.equal(formatPublicFacilityCode(1), "ELPM-0001");
  assert.equal(formatPublicFacilityCode(185), "ELPM-0185");
  assert.equal(formatPublicFacilityCode(10_000), "ELPM-10000");
  assert.equal(parsePublicFacilityCode("elpm-0185"), 185);
  assert.equal(parsePublicFacilityCode("ELP-0185"), null);
  assert.equal(parsePublicFacilityCode("ELPM-0000"), null);
  assert.equal(publicFacilityPath(185), "/elepem/elpm-0185");
});

test("la ficha permanente evita repeticiones y usa una sola superficie visual", async () => {
  const [profile, page, styles] = await Promise.all([
    readFile(facilityProfilePath, "utf8"),
    readFile(facilityPagePath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);

  assert.doesNotMatch(profile, /Ficha actualizada|facilityProfileUpdated|facilityProfileLocation/);
  assert.doesNotMatch(profile, /Sin descripción pública verificada/);
  assert.doesNotMatch(page, /facilityPermanentCode|Contar una preocupación/);
  assert.match(page, /<FacilityProfile facility=\{facility\} showSources=\{false\}/);
  assert.doesNotMatch(profile, /showConcernAction|\/preocupacion|Contar una preocupación/);
  assert.doesNotMatch(profile, /Vigente o registrado|El precio incluye:/);
  assert.match(profile, /<dt>Habilitación<\/dt>[\s\S]{0,120}<FacilityPrimaryStatusBadge facility=\{facility\}/);
  assert.match(profile, /<dd className="facilityFactPrice">\{facility\.monthlyPriceUyu/);
  assert.match(profile, /className="facilityProfileShell"/);
  assert.match(page, /className="facilityPermanentPage"/);
  assert.match(styles, /\.facilityPermanentPage \{[\s\S]{0,500}background: #fff;[\s\S]{0,200}box-shadow:/);
  assert.match(styles, /\.facilityProfileSummary \{[\s\S]{0,180}padding: 0;[\s\S]{0,100}border: 0;[\s\S]{0,100}background: transparent;[\s\S]{0,100}box-shadow: none/);
  assert.match(styles, /\.facilityProfileFacts \.qualityRatingBadge,[\s\S]{0,120}\.facilityProfileFacts \.facilityBadges \.sourceBadge \{[\s\S]{0,120}width: 184px;[\s\S]{0,100}min-height: 32px/);
  assert.match(styles, /\.facilityProfileFacts dd\.facilityFactPrice \{[\s\S]{0,100}width: 184px;[\s\S]{0,100}justify-content: center;[\s\S]{0,100}color: var\(--blue2\);[\s\S]{0,80}font-size: 1rem/);
  assert.doesNotMatch(styles, /\.facilityFactValue/);
  assert.match(page, /title: \{ absolute: `Arandú \| \$\{facility\.name\}` \}/);
  assert.doesNotMatch(page, /title: `\$\{facility\.name\} \| \$\{publicCode\}`/);
  assert.match(styles, /\.facilityPermanentContent \.facilityProfileExperiences \.facilityExperiencesSection \{[\s\S]{0,160}border-top: 0;/);
});

test("la ficha usa un carrusel accesible y abre las fotos en un visor ampliado", async () => {
  const [carousel, styles] = await Promise.all([
    readFile(photoCarouselPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(carousel, /aria-label=\{`Ampliar foto/);
  assert.match(carousel, /event\.key === "ArrowLeft"/);
  assert.match(carousel, /event\.key === "ArrowRight"/);
  assert.doesNotMatch(carousel, /facilityCarouselCount|>Ampliar<|<span>\{photo\.index \+ 1\}<\/span>/);
  assert.match(carousel, /facilityCarouselExpand" aria-hidden="true"><Maximize2 size=\{22\} \/>/);
  assert.match(carousel, /aria-current=\{photo\.index === activeIndex/);
  assert.match(carousel, /className="facilityPhotoLightbox"/);
  assert.match(carousel, /aria-label="Cerrar imagen ampliada"/);
  assert.match(carousel, /const omitFailedPhoto = useCallback/);
  assert.match(carousel, /onError=\{\(\) => omitFailedPhoto\(activePhoto\)\}/);
  assert.match(carousel, /normalizedPhotos\.filter\(\(url\) => !failedPhotoUrls\.has\(url\)\)/);
  assert.match(carousel, /onClose=\{\(event\) => \{[\s\S]{0,100}event\.stopPropagation\(\)/);
  assert.match(styles, /\.facilityCarouselThumbnails \{[\s\S]{0,180}grid-template-columns: repeat\(5/);
  assert.doesNotMatch(styles, /\.facilityCarouselThumbnails \{[\s\S]{0,300}overflow-x:\s*auto/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.facilityCarouselImageButton/);
});
