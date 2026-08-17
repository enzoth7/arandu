import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PUBLIC_REGISTRY_STATE_MAX_AGE_MS,
  parsePublicRegistryState,
} from "../../lib/public-registry-state.mjs";

const streetMapPath = new URL("../../app/components/StreetMap.tsx", import.meta.url);
const leafletHookPath = new URL("../../app/hooks/useLeafletMap.ts", import.meta.url);
const globalStylesPath = new URL("../../app/globals.css", import.meta.url);
const registryPath = new URL("../../app/components/UruguayRegistry.tsx", import.meta.url);
const photoCarouselPath = new URL("../../app/components/FacilityPhotoCarousel.tsx", import.meta.url);
const filterHookPath = new URL("../../app/hooks/useFacilityFilters.ts", import.meta.url);
const registryLoaderPath = new URL("../../lib/facility-registry.ts", import.meta.url);
const facilityPresentationPath = new URL("../../app/components/facility-presentation.ts", import.meta.url);
const residencialesFormPath = new URL("../../app/components/ResidencialesFormView.tsx", import.meta.url);

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

test("el mapa muestra el estado institucional y reparte mapa/lista 50/50", async () => {
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
  assert.match(source, /Sin calificación disponible/);
  assert.match(source, /image\.loading = "lazy"/);
  assert.match(source, /visibleMarker\.on\("focus"/);
  assert.match(source, /className: "facilityRichTooltip"/);
  assert.doesNotMatch(source, /mapPriceMarkerRating|ratingMarkup/);
  assert.match(source, /html: `<span class="\$\{markerClass\}">\$\{label\}<\/span>`/);
  assert.doesNotMatch(source, /\$\{facility\.isDemo \? " · DEMO"/);
  assert.match(styles, /grid-template-columns: minmax\(240px, 290px\) repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.mapFacilityTooltipCard/);
  assert.match(styles, /\.mapFacilityTooltipStatus/);
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
    },
    registryView: "mixed",
    selectedId: "ELP-0001",
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
      qualityRating: "valor-transitorio",
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
    },
    registryView: "mixed",
    selectedId: null,
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
    },
    registryView: "mixed",
    selectedId: null,
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

test("la capa pública conserva Casa Costa Serena como referencia violeta con clasificación Bueno", async () => {
  const source = await readFile(registryLoaderPath, "utf8");
  assert.match(source, /id = 'DEMO-ELEPEM-001'/);
  assert.match(source, /qualityRating: "good"/);
  assert.match(source, /where publication\.demo_facility_id = facility\.id/);
  assert.match(source, /const approvedPhotoUrls = Array\.isArray\(row\.approved_photo_paths\)/);
  assert.match(source, /left join storage\.objects as storage_object/);
  assert.match(source, /filter \(where storage_object\.id is not null\)/);
  assert.match(source, /storage\/v1\/object\/public\/\$\{FACILITY_PHOTO_BUCKET\}/);
  assert.match(source, /photoUrl: photoUrls\[0\] \|\| undefined/);
  assert.match(source, /precisionLabel: "Ubicación aproximada"/);
  assert.match(source, /sourceLabel: "Arandú"/);
  assert.match(source, /statusShort: "Referencia Arandú",[\s\S]{0,700}description: row\.description/);
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
  assert.match(source, /dialog\.showModal\(\)/);
  assert.match(source, /onClose=\{\(event\) => \{[\s\S]{0,100}event\.target === event\.currentTarget/);
  assert.match(source, /<FacilityPhotoCarousel facilityName=\{facility\.name\}/);
  assert.match(styles, /\.facilityMapDialogHeader \{[\s\S]*position: sticky/);
});

test("la vista Lista alinea precio y clasificación a la derecha sin rótulos ni fuente", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  const listCardSource = source.slice(
    source.indexOf("function FacilityListCard"),
    source.indexOf("function FacilityMapDialog"),
  );

  assert.match(listCardSource, /<FacilityMembershipBadges facility=\{facility\} showQuality=\{false\} \/>/);
  assert.match(listCardSource, /className="facilityBookingPrice"[\s\S]*<strong>\{formatMonthlyPrice/);
  assert.match(listCardSource, /<FacilityQualityBadge facility=\{facility\} \/>/);
  assert.doesNotMatch(listCardSource, /<small>Precio mensual<\/small>/);
  assert.doesNotMatch(listCardSource, /Fuente:/);
  assert.match(styles, /\.facilityBookingAside[\s\S]{0,220}align-items: flex-end/);
  for (const tone of ["outstanding", "good", "requires_improvement", "inadequate", "unrated"]) {
    assert.match(styles, new RegExp(`\\.qualityRatingBadge-${tone}`));
  }
  assert.match(source, /"Sin calificar"/);
});

test("la vista mixta muestra precio y clasificación separados a la derecha", async () => {
  const [source, styles] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(globalStylesPath, "utf8"),
  ]);
  const mixedCardSource = source.slice(
    source.indexOf("function FacilityAccordionCard"),
    source.indexOf("function FacilityListCard"),
  );

  assert.match(mixedCardSource, /<FacilityMembershipBadges facility=\{facility\} showQuality=\{false\} \/>/);
  assert.match(mixedCardSource, /className="facilityCompactAside"[\s\S]*className="facilityCompactPrice"[\s\S]*<FacilityQualityBadge facility=\{facility\} \/>/);
  assert.doesNotMatch(mixedCardSource, /<small>Precio mensual<\/small>/);
  assert.match(styles, /\.facilityCompactAside[\s\S]{0,180}justify-items: end/);
  assert.doesNotMatch(styles, /\.qualityRatingBadge::before/);
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
