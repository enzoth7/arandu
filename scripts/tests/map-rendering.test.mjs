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

const streetMapPath = new URL("../../app/components/StreetMap.tsx", import.meta.url);
const leafletHookPath = new URL("../../app/hooks/useLeafletMap.ts", import.meta.url);
const globalStylesPath = new URL("../../app/globals.css", import.meta.url);
const registryPath = new URL("../../app/components/UruguayRegistry.tsx", import.meta.url);
const photoCarouselPath = new URL("../../app/components/FacilityPhotoCarousel.tsx", import.meta.url);
const filterHookPath = new URL("../../app/hooks/useFacilityFilters.ts", import.meta.url);
const registryLoaderPath = new URL("../../lib/facility-registry.ts", import.meta.url);
const facilityPresentationPath = new URL("../../app/components/facility-presentation.ts", import.meta.url);
const residencialesFormPath = new URL("../../app/components/ResidencialesFormView.tsx", import.meta.url);
const homeHeroPath = new URL("../../app/components/AranduHomeHero.tsx", import.meta.url);
const attributeFiltersPath = new URL("../../app/components/RegistryAttributeFilters.tsx", import.meta.url);
const nextConfigPath = new URL("../../next.config.mjs", import.meta.url);
const portalChromePath = new URL("../../app/components/PortalChrome.tsx", import.meta.url);
const institutionalAccessPath = new URL("../../app/components/InstitutionalAccess.tsx", import.meta.url);
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

test("la portada mantiene las personas nítidas y amplía la foto para ocultar bordes", async () => {
  const [hero, styles] = await Promise.all([
    readFile(homeHeroPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(hero, /src="\/Hero\.webp"/);
  assert.match(styles, /\.aranduHeroVisual \{[\s\S]{0,220}position: absolute;[\s\S]{0,160}inset: 0;/);
  assert.doesNotMatch(styles, /\.aranduHeroVisual::before/);
  assert.match(styles, /\.aranduHeroImage \{[\s\S]{0,220}object-fit: contain;[\s\S]{0,100}object-position: right center;[\s\S]{0,100}transform: scale\(1\.12\);[\s\S]{0,100}filter: none;[\s\S]{0,100}opacity: 1/);
  assert.match(styles, /\.aranduHero::before \{[\s\S]{0,260}width: 74%/);
  assert.match(styles, /#fff 0 42%/);
  assert.match(styles, /transparent 100%/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.aranduHeroVisual \{[\s\S]{0,180}position: relative;[\s\S]{0,180}aspect-ratio: 1400 \/ 935/);
});

test("el aviso académico aparece en el acceso institucional y en todos sus portales", async () => {
  const [portalChrome, institutionalAccess] = await Promise.all([
    readFile(portalChromePath, "utf8"),
    readFile(institutionalAccessPath, "utf8"),
  ]);
  assert.match(portalChrome, /<AcademicPrototypeNotice \/>/);
  assert.doesNotMatch(portalChrome, /portal === "public" && <AcademicPrototypeNotice/);
  assert.match(institutionalAccess, /<main className="accessGate">[\s\S]*<AcademicPrototypeNotice \/>/);
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
  const [registrySource, residencialesFormSource] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(residencialesFormPath, "utf8"),
  ]);

  for (const source of [registrySource, residencialesFormSource]) {
    assert.match(source, /label: "Habilitado MSP"/);
    assert.match(source, /label: "Certificado Social MIDES"/);
    assert.doesNotMatch(source, /label: "Habilitado(?:s)?",/);
    assert.doesNotMatch(source, /label: "Certificado(?:s)?",/);
  }
});

test("el registro conserva filtros, scroll, selección y viewport con un snapshot versionado", async () => {
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
  assert.match(registrySource, /visibilitychange/);
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

test("el registro captura windowY antes de una navegación interna de Next", async () => {
  const source = await readFile(registryPath, "utf8");

  assert.match(source, /lastWindowScrollYRef/);
  assert.match(source, /navigationWindowYRef/);
  assert.match(source, /document\.addEventListener\("click", captureInternalNavigation, true\)/);
  assert.match(source, /event\.button !== 0[\s\S]*event\.metaKey[\s\S]*event\.ctrlKey[\s\S]*event\.shiftKey[\s\S]*event\.altKey/);
  assert.match(source, /anchor\.hasAttribute\("download"\)/);
  assert.match(source, /browsingContext && browsingContext !== "_self"/);
  assert.match(source, /destination\.origin !== current\.origin/);
  assert.match(source, /destination\.pathname === current\.pathname && destination\.search === current\.search/);
  assert.match(source, /navigationWindowYRef\.current = windowY;[\s\S]*saveNavigationState\(windowY\)/);
  assert.match(source, /window\.addEventListener\("beforeunload", saveLastPosition\)/);
  assert.match(source, /saveNavigationState\(navigationWindowYRef\.current \?\? lastWindowScrollYRef\.current\)/);
  assert.match(source, /document\.removeEventListener\("click", captureInternalNavigation, true\)/);
});

test("la restauración reintenta ambos scrolls hasta estabilizar el layout", async () => {
  const source = await readFile(registryPath, "utf8");

  assert.match(source, /RESTORE_SCROLL_MAX_ATTEMPTS = 30/);
  assert.match(source, /RESTORE_SCROLL_RETRY_MS = 100/);
  assert.match(source, /RESTORE_SCROLL_STABLE_PASSES = 2/);
  assert.match(source, /resultsNode\.scrollTop = scroll\.resultsY/);
  assert.match(source, /window\.scrollTo\(\{ top: scroll\.windowY, left: 0, behavior: "auto" \}\)/);
  assert.match(source, /document\.documentElement\.scrollHeight/);
  assert.match(source, /currentResultsNode\?\.scrollHeight/);
  assert.match(source, /stablePasses >= RESTORE_SCROLL_STABLE_PASSES/);
  assert.match(source, /attempts >= RESTORE_SCROLL_MAX_ATTEMPTS/);
  assert.match(source, /persistenceReadyRef\.current = true;[\s\S]*setRestoringNavigation\(false\);[\s\S]*saveNavigationState\(lastWindowScrollYRef\.current\)/);
  assert.match(source, /window\.clearTimeout\(retryTimer\)/);
  assert.match(source, /window\.cancelAnimationFrame\(applyFrame\)/);
  assert.match(source, /window\.cancelAnimationFrame\(verifyFrame\)/);
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
  const [source, hookSource, attributeFilters] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(filterHookPath, "utf8"),
    readFile(attributeFiltersPath, "utf8"),
  ]);
  assert.match(source, /<b>Departamento<\/b>[\s\S]*<select value=\{department\}/);
  assert.match(source, /<b>Situación institucional<\/b>[\s\S]*<select value=\{status\}/);
  assert.match(source, /<b>Clasificación<\/b>[\s\S]*value=\{qualityRating\}/);
  assert.match(source, /QUALITY_RATING_LABELS/);
  assert.match(source, /Sin calificar/);
  assert.match(attributeFilters, /<div className="registryAdvancedFilters">/);
  assert.match(attributeFilters, /<fieldset key=\{group\.key\}>/);
  assert.match(attributeFilters, /type="checkbox"/);
  assert.doesNotMatch(attributeFilters, /Más filtros|Sin información verificada|registryDemoFilterNotice/);
  assert.match(source, /<b>Ordenar por:<\/b>[\s\S]*Precio: menor a mayor[\s\S]*Precio: mayor a menor/);
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
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.doesNotMatch(source, /Precio mensual demostrativo|Precio demostrativo|· DEMO/);
  assert.match(source, /aria-label=\{hasPublicPrice \? `Precio mensual:/);
  assert.match(source, /Precio no informado/);
  assert.match(source, /function FacilityQualityBadge/);
  assert.match(source, /Sin calificar/);
  assert.match(source, /facilityCompactPrice/);
  assert.match(source, /onOpenDetails=\{openFacilityDetails\}/);
  assert.doesNotMatch(source, /!facility\.isDemo && typeof facility\.monthlyPriceUyu/);
  assert.match(source, /aria-label="Cerrar ficha"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /dialog\.showModal\(\)/);
  assert.match(source, /onClose=\{\(event\) => \{[\s\S]{0,100}event\.target === event\.currentTarget/);
  assert.match(source, /<FacilityPhotoCarousel facilityName=\{facility\.name\}/);
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
    readFile(registryPath, "utf8"),
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
  assert.match(styles, /\.facilityProfileContactChannels \{/);
  assert.match(styles, /\.facilityContactChannelList \{/);
  assert.match(registryLoader, /contactPhone: row\.phone \|\| undefined/);
  assert.match(registryLoader, /contactEmail: row\.email \|\| undefined/);
});

test("la ficha usa un carrusel accesible y abre las fotos en un visor ampliado", async () => {
  const [carousel, styles] = await Promise.all([
    readFile(photoCarouselPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  assert.match(carousel, /aria-label=\{`Ampliar foto/);
  assert.match(carousel, /event\.key === "ArrowLeft"/);
  assert.match(carousel, /event\.key === "ArrowRight"/);
  assert.match(carousel, /aria-live="polite"/);
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
