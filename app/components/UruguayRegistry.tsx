"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleHelp, Image as ImageIcon, Map as MapIcon, RotateCcw, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FacilityPrimaryStatusBadge,
  FacilityProfile,
  FacilityQualityBadge,
} from "./FacilityProfile";
import { RegistryAttributeFilters } from "./RegistryAttributeFilters";
import {
  facilityDisplayCategory,
  isVerificationFacility,
} from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import {
  useFacilityFilters,
  type PhotoAvailability,
  type PriceOrder,
  type RegistryFacilityStatus,
} from "../hooks/useFacilityFilters";
import {
  QUALITY_RATING_LABELS,
  type Facility,
  type FacilityQualityFilter,
} from "./map-types";
import { publicFacilityPath } from "../../lib/public-facility-code.mjs";
import {
  PUBLIC_REGISTRY_STATE_KEY,
  PUBLIC_REGISTRY_STATE_VERSION,
  hasPublicRegistryFilterParams,
  parsePublicRegistryState,
  parsePublicRegistrySearchParams,
  serializePublicRegistrySearchParams,
} from "../../lib/public-registry-state.mjs";
import type { RegistryMapBounds, RegistryMapViewport } from "./StreetMap";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

function formatMonthlyPrice(value: number) {
  return `UYU ${value.toLocaleString("es-UY")}`;
}

// El registro es presentacional: recibe las fichas ya consolidadas y no sabe de
// dónde vienen. Así el portal de personas nunca monta la capa privada de
// candidatos y el de organización puede sumarla sin propagar estado hacia arriba.
type UruguayRegistryProps = {
  facilities: Facility[];
  /** Capa ficticia separada: aparece sólo en el mapa y no altera resultados/KPI. */
  demoFacilities?: Facility[];
  loading?: boolean;
  error?: string;
  notices?: ReactNode;
  /** Filtro por estado de tratamiento; sólo tiene sentido en organización. */
  /** Tarjeta «La persona decide»; sólo en el portal de personas. */
  showChoiceCta?: boolean;
  /** Conserva el contexto al salir de la portada y volver desde una ficha o formulario. */
  persistNavigationState?: boolean;
};

type RegistryView = "list" | "map" | "mixed";

export default function UruguayRegistry({
  facilities,
  demoFacilities = [],
  loading = false,
  error = "",
  notices,
  showChoiceCta = false,
  persistNavigationState = false,
}: UruguayRegistryProps) {
  const router = useRouter();
  const registryFacilities = useMemo(
    () => facilities.filter((facility) => !facility.isDemo),
    [facilities],
  );
  const mapOnlyDemoFacilities = useMemo(() => {
    const byId = new Map<string, Facility>();
    for (const facility of facilities) {
      if (facility.isDemo) byId.set(facility.id, facility);
    }
    for (const facility of demoFacilities) byId.set(facility.id, facility);
    return [...byId.values()];
  }, [demoFacilities, facilities]);
  const allFacilities = useMemo(() => {
    const byId = new Map<string, Facility>();
    for (const facility of [...registryFacilities, ...mapOnlyDemoFacilities]) {
      byId.set(facility.id, facility);
    }
    return [...byId.values()];
  }, [mapOnlyDemoFacilities, registryFacilities]);
  const {
    query, setQuery,
    department, setDepartment,
    monthlyPriceBounds,
    monthlyPriceRange,
    activeMonthlyPriceRange,
    setMonthlyPriceRange,
    status, setStatus,
    qualityRating, setQualityRating,
    priceOrder, setPriceOrder,
    photoAvailability, setPhotoAvailability,
    attributeFilters, setAttributeFilters, toggleAttributeFilter,
    visible,
    departments,
    summaryScope,
    hasActiveFilters,
    reset,
  } = useFacilityFilters(allFacilities);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);
  const [registryView, setRegistryView] = useState<RegistryView>("mixed");
  const [mapBounds, setMapBounds] = useState<RegistryMapBounds | null>(null);
  const [mapAreaActive, setMapAreaActive] = useState(false);
  const [mapResetRevision, setMapResetRevision] = useState(0);
  const [navigationRestored, setNavigationRestored] = useState(!persistNavigationState);
  const [restoringNavigation, setRestoringNavigation] = useState(persistNavigationState);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const directFacilityHandled = useRef(false);
  const navigationRestoreHandled = useRef(false);
  const mapViewportRef = useRef<RegistryMapViewport | null>(null);
  const lastResultsScrollYRef = useRef(0);
  const persistenceReadyRef = useRef(!persistNavigationState);
  const latestNavigationStateRef = useRef({
    filters: { query, department, monthlyPriceRange: activeMonthlyPriceRange, status, qualityRating, priceOrder, photoAvailability, attributeFilters },
    registryView,
    selectedId,
    mapAreaActive,
  });
  latestNavigationStateRef.current = {
    filters: { query, department, monthlyPriceRange: activeMonthlyPriceRange, status, qualityRating, priceOrder, photoAvailability, attributeFilters },
    registryView,
    selectedId,
    mapAreaActive,
  };

  const resultFacilities = useMemo(() => {
    if (!mapAreaActive || !mapBounds || registryView === "list") return visible;
    return visible.filter((facility) => (
      Number.isFinite(facility.lat)
      && Number.isFinite(facility.lng)
      && facility.lat >= mapBounds.south
      && facility.lat <= mapBounds.north
      && facility.lng >= mapBounds.west
      && facility.lng <= mapBounds.east
    ));
  }, [mapAreaActive, mapBounds, registryView, visible]);
  const mapFacilities = visible;
  const selected = selectedId ? (mapFacilities.find((facility) => facility.id === selectedId) ?? null) : null;
  const detailedFacility = detailId
    ? (allFacilities.find((facility) => facility.id === detailId) ?? null)
    : null;

  const kpiScope = useMemo(() => summaryScope.filter((facility) => !facility.isDemo), [summaryScope]);
  const summaryTotals = useMemo(() => ({
    habilitado: kpiScope.filter((facility) => facility.mspFinal).length,
    mides: kpiScope.filter((facility) => facility.midesSocial).length,
    unconfirmed: kpiScope.filter(isVerificationFacility).length,
  }), [kpiScope]);
  const monthlyPriceSpread = monthlyPriceBounds ? monthlyPriceBounds.max - monthlyPriceBounds.min : 0;
  const monthlyPriceStart = monthlyPriceBounds && monthlyPriceRange && monthlyPriceSpread > 0
    ? ((monthlyPriceRange.min - monthlyPriceBounds.min) / monthlyPriceSpread) * 100
    : 0;
  const monthlyPriceEnd = monthlyPriceBounds && monthlyPriceRange && monthlyPriceSpread > 0
    ? ((monthlyPriceRange.max - monthlyPriceBounds.min) / monthlyPriceSpread) * 100
    : 100;
  const saveNavigationState = useCallback(() => {
    if (!persistNavigationState || !persistenceReadyRef.current) return;
    try {
      window.localStorage.setItem(PUBLIC_REGISTRY_STATE_KEY, JSON.stringify({
        version: PUBLIC_REGISTRY_STATE_VERSION,
        savedAt: Date.now(),
        ...latestNavigationStateRef.current,
        scroll: {
          windowY: 0,
          resultsY: 0,
        },
        mapViewport: mapViewportRef.current,
      }));
    } catch {
      // La persistencia es progresiva: nunca bloquea el mapa ni los filtros.
    }
  }, [persistNavigationState]);

  const bindResultsScroll = useCallback((node: HTMLDivElement | null) => {
    const previousNode = resultsScrollRef.current;
    if (previousNode && previousNode !== node) {
      lastResultsScrollYRef.current = Math.max(0, previousNode.scrollTop);
    }
    resultsScrollRef.current = node;
    if (node && lastResultsScrollYRef.current > 0) {
      node.scrollTop = lastResultsScrollYRef.current;
    }
  }, []);

  const applyFilterState = useCallback((filters: ReturnType<typeof parsePublicRegistrySearchParams>) => {
    setQuery(filters.query);
    setDepartment(filters.department);
    setMonthlyPriceRange(filters.monthlyPriceRange);
    setStatus(filters.status);
    setQualityRating(filters.qualityRating);
    setPriceOrder(filters.priceOrder);
    setPhotoAvailability(filters.photoAvailability);
    setAttributeFilters(filters.attributeFilters);
  }, [
    setAttributeFilters,
    setDepartment,
    setMonthlyPriceRange,
    setPhotoAvailability,
    setPriceOrder,
    setQuery,
    setQualityRating,
    setStatus,
  ]);

  useEffect(() => {
    if (navigationRestoreHandled.current) return;
    navigationRestoreHandled.current = true;

    const hasUrlFilters = hasPublicRegistryFilterParams(window.location.search);
    if (hasUrlFilters) applyFilterState(parsePublicRegistrySearchParams(window.location.search));

    if (!persistNavigationState || hasUrlFilters) {
      persistenceReadyRef.current = true;
      setNavigationRestored(true);
      setRestoringNavigation(false);
      return;
    }

    let restored = null;
    try {
      restored = parsePublicRegistryState(window.localStorage.getItem(PUBLIC_REGISTRY_STATE_KEY));
      if (!restored) window.localStorage.removeItem(PUBLIC_REGISTRY_STATE_KEY);
    } catch {
      // El registro sigue funcionando si el navegador bloquea el almacenamiento.
    }

    if (restored) {
      applyFilterState(restored.filters);
      setRegistryView(restored.registryView);
      setSelectedId(restored.selectedId);
      setMapAreaActive(restored.mapAreaActive);
      lastResultsScrollYRef.current = 0;
      mapViewportRef.current = restored.mapViewport;
    }
    persistenceReadyRef.current = true;
    setRestoringNavigation(false);
    setNavigationRestored(true);
  }, [
    applyFilterState,
    persistNavigationState,
  ]);

  useEffect(() => {
    const restoreFromHistory = () => applyFilterState(parsePublicRegistrySearchParams(window.location.search));
    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, [applyFilterState]);

  useEffect(() => {
    if (directFacilityHandled.current || allFacilities.length === 0) return;
    directFacilityHandled.current = true;
    const requestedId = new URLSearchParams(window.location.search).get("elepem");
    const requestedFacility = requestedId
      ? allFacilities.find((facility) => facility.id === requestedId || facility.legacyId === requestedId)
      : null;
    if (requestedFacility?.registryId) {
      setSelectedId(requestedFacility.id);
      router.replace(publicFacilityPath(requestedFacility.registryId));
    } else if (requestedFacility) {
      setSelectedId(requestedFacility.id);
      setDetailId(requestedFacility.id);
    }
  }, [allFacilities, router]);

  useEffect(() => {
    if (loading || !navigationRestored || restoringNavigation) return;
    const selectionScope = mapAreaActive ? resultFacilities : mapFacilities;
    if (selectedId && !selectionScope.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [loading, mapAreaActive, mapFacilities, navigationRestored, restoringNavigation, resultFacilities, selectedId]);

  useEffect(() => {
    saveNavigationState();
  }, [
    department,
    activeMonthlyPriceRange,
    attributeFilters,
    mapAreaActive,
    navigationRestored,
    photoAvailability,
    priceOrder,
    qualityRating,
    query,
    registryView,
    restoringNavigation,
    saveNavigationState,
    selectedId,
    status,
  ]);

  useEffect(() => {
    if (!navigationRestored || restoringNavigation) return;
    const params = serializePublicRegistrySearchParams({
      query,
      department,
      monthlyPriceRange: activeMonthlyPriceRange,
      status,
      qualityRating,
      priceOrder,
      photoAvailability,
      attributeFilters,
    }, window.location.search);
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [
    activeMonthlyPriceRange,
    attributeFilters,
    department,
    navigationRestored,
    photoAvailability,
    priceOrder,
    qualityRating,
    query,
    restoringNavigation,
    status,
  ]);

  function resetFilters() {
    reset();
    setMapAreaActive(false);
    setMapBounds(null);
    setSelectedId(null);
    setHighlightedId(null);
    setDetailId(null);
    lastResultsScrollYRef.current = 0;
    mapViewportRef.current = null;
    setMapResetRevision((revision) => revision + 1);
    if (persistNavigationState) {
      try {
        window.localStorage.removeItem(PUBLIC_REGISTRY_STATE_KEY);
      } catch {
        // El reinicio visual no depende del almacenamiento.
      }
    }
  }

  function openFacilityDetails(facilityId: string) {
    const facility = allFacilities.find((candidate) => candidate.id === facilityId);
    if (!facility) return;
    if (facility.registryId) {
      saveNavigationState();
      router.push(publicFacilityPath(facility.registryId));
      return;
    }
    setDetailId(facilityId);
  }

  return <>
    <section className="card registryIntro" id="registro">
      {loading && <div className="notice registryDataStatus" role="status">Cargando ELEPEM…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      {notices}
      <div className="registryQuickSummary" aria-label="Resumen y filtros rápidos">
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-blue ${!status ? "selected" : ""}`} help="Se pudieron georreferenciar estos residenciales a partir de fuentes públicas. Se estima que en Uruguay existen entre 1.400 y 1.500 residenciales en total." helpId="all" label="Todos" onActivate={() => setStatus("")} onToggleHelp={setActiveKpiHelp} value={kpiScope.length} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-green ${status === "habilitado" ? "selected" : ""}`} help="Establecimientos con habilitación final del MSP a junio de 2026." helpId="msp-final" label="Habilitados MSP" onActivate={() => setStatus(status === "habilitado" ? "" : "habilitado")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.habilitado} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-amber ${status === "mides" ? "selected" : ""}`} help="Establecimientos que se encuentran en proceso de habilitación (definido por el Decreto 356/016) y que obtuvieron el certificado social por parte del Mides." helpId="mides" label="Certificados Social MIDES" onActivate={() => setStatus(status === "mides" ? "" : "mides")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.mides} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-gray ${status === "verificar" ? "selected" : ""}`} help="No se encontró una situación actualizada en las fuentes públicas consultadas. Requiere verificación institucional; no significa que el establecimiento sea irregular." helpId="unconfirmed" label="Situación no confirmada" onActivate={() => setStatus(status === "verificar" ? "" : "verificar")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.unconfirmed} />
      </div>
      <p className="registryOverlapNote">
        Algunos residenciales están incluidos tanto en la lista de Habilitados como en la de Certificados.
      </p>
      <div className="registrySearchHeaderRow">
        <div className="registrySearchFirst">
          <label className="searchField">
            <b>Buscar por nombre, localidad o departamento</b>
            <div className="registrySearchBox">
              <Search size={26} aria-hidden="true" />
              <input
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribí un nombre, una localidad o un departamento"
              />
            </div>
          </label>
        </div>

        {showChoiceCta && (
          <div className="personDecidesInlineCard">
            <div className="personDecidesCopy">
              <strong>La persona decide</strong>
              <p>Usá el mapa para identificar opciones y preparar preguntas; no para reemplazar la voluntad de quien va a vivir allí.</p>
            </div>
            <Link href="/guia" className="btnTurquoisePrimary inlineBtn">
              Preparar mi elección
            </Link>
          </div>
        )}
      </div>
    </section>

    <div className="registryViewSwitcher" role="group" aria-label="Vista del padrón">
      <span>Elegir vista</span>
      <button type="button" className={registryView === "list" ? "active" : ""} aria-pressed={registryView === "list"} onClick={() => setRegistryView("list")}>Lista</button>
      <button type="button" className={registryView === "map" ? "active" : ""} aria-pressed={registryView === "map"} onClick={() => setRegistryView("map")}><MapIcon size={16} aria-hidden="true" />Mapa</button>
      <button type="button" className={registryView === "mixed" ? "active" : ""} aria-pressed={registryView === "mixed"} onClick={() => setRegistryView("mixed")}>Mixta</button>
    </div>

    <div className={`registryMapLayout registryMapLayout-${registryView}`}>
      <aside className="card registryFiltersPanel" aria-label="Filtros de resultados">
        <header className="registryFiltersHeading">
          <div>
            <h2>Filtrar resultados</h2>
            <output aria-live="polite">
              {resultFacilities.length} {mapAreaActive && registryView !== "list" ? "en esta zona" : "encontrados"}
            </output>
          </div>
          <button
            type="button"
            className="registryClearFilters"
            disabled={!hasActiveFilters && !selectedId && !mapAreaActive}
            onClick={resetFilters}
          ><RotateCcw size={17} aria-hidden="true" />Limpiar</button>
        </header>
        <div className="registryToolbar">
          <label>
            <b>Departamento</b>
            <select value={department} onChange={(event) => {
              setMapAreaActive(false);
              setMapBounds(null);
              setDepartment(event.target.value);
            }}>
              <option value="">Todos</option>
              {departments.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
            </select>
          </label>

          <label>
            <b>Situación institucional</b>
            <select value={status} onChange={(event) => setStatus(event.target.value as RegistryFacilityStatus)}>
              <option value="">Todas</option>
              <option value="habilitado">Habilitación final MSP</option>
              <option value="mides">Certificado social MIDES</option>
              <option value="verificar">Situación no confirmada</option>
            </select>
          </label>

          <label>
            <b>Clasificación</b>
            <select
              value={qualityRating}
              onChange={(event) => setQualityRating(event.target.value as FacilityQualityFilter)}
            >
              <option value="">Todas</option>
              {Object.entries(QUALITY_RATING_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="unrated">Sin calificar</option>
            </select>
          </label>

          <label>
            <b>Ordenar por:</b>
            <select value={priceOrder} onChange={(event) => setPriceOrder(event.target.value as PriceOrder)}>
              <option value="">Orden alfabético</option>
              <option value="asc">Precio: menor a mayor</option>
              <option value="desc">Precio: mayor a menor</option>
            </select>
            <small className="registryFilterHelp">Los residenciales sin precio quedan al final.</small>
          </label>

          <label>
            <b>Fotografías</b>
            <select
              value={photoAvailability}
              onChange={(event) => setPhotoAvailability(event.target.value as PhotoAvailability)}
            >
              <option value="">Todos</option>
              <option value="with">Con fotos</option>
              <option value="without">Sin fotos</option>
            </select>
          </label>

          {monthlyPriceBounds && monthlyPriceRange ? (
            <fieldset className="registryPriceRange">
              <legend>Precio mensual</legend>
              <output>
                <span>Desde {formatMonthlyPrice(monthlyPriceRange.min)}</span>
                <span>Hasta {formatMonthlyPrice(monthlyPriceRange.max)}</span>
              </output>
              <div className="registryPriceTrack">
                <span
                  aria-hidden="true"
                  className="registryPriceTrackSelected"
                  style={{ left: `${monthlyPriceStart}%`, right: `${100 - monthlyPriceEnd}%` }}
                />
                <input
                  aria-label="Precio mensual mínimo"
                  aria-valuetext={formatMonthlyPrice(monthlyPriceRange.min)}
                  max={monthlyPriceBounds.max}
                  min={monthlyPriceBounds.min}
                  onChange={(event) => {
                    const min = Math.min(Number(event.target.value), monthlyPriceRange.max);
                    setMonthlyPriceRange({ min, max: monthlyPriceRange.max });
                  }}
                  step={1_000}
                  type="range"
                  value={monthlyPriceRange.min}
                />
                <input
                  aria-label="Precio mensual máximo"
                  aria-valuetext={formatMonthlyPrice(monthlyPriceRange.max)}
                  max={monthlyPriceBounds.max}
                  min={monthlyPriceBounds.min}
                  onChange={(event) => {
                    const max = Math.max(Number(event.target.value), monthlyPriceRange.min);
                    setMonthlyPriceRange({ min: monthlyPriceRange.min, max });
                  }}
                  step={1_000}
                  type="range"
                  value={monthlyPriceRange.max}
                />
              </div>
              <p>Filtrá los precios públicos que constan en las fichas.</p>
            </fieldset>
          ) : (
            <section className="registryPriceRange registryPriceRangeUnavailable" aria-labelledby="registry-price-title">
              <strong id="registry-price-title">Precio mensual</strong>
              <div className="registryPriceTrack" aria-hidden="true"><span className="registryPriceTrackSelected" /></div>
              <p>Sin precios publicados todavía.</p>
            </section>
          )}

          <RegistryAttributeFilters value={attributeFilters} onToggle={toggleAttributeFilter} />
        </div>
      </aside>
      {registryView !== "list" && <div className="registryMapColumn">
        {navigationRestored ? <StreetMap
          key={`registry-map-${mapResetRevision}`}
          facilities={mapFacilities}
          selectedId={selected?.id ?? null}
          highlightedId={highlightedId}
          onSelect={setSelectedId}
          onOpenDetails={openFacilityDetails}
          initialViewport={mapViewportRef.current}
          restoreSelectionWithoutFlying={Boolean(mapViewportRef.current && selected)}
          autoFitFacilities={!mapAreaActive}
          onViewportChange={(viewport, context) => {
            mapViewportRef.current = viewport;
            setMapBounds(context.bounds);
            if (context.userInitiated) {
              setMapAreaActive(true);
              if (department) setDepartment("");
              lastResultsScrollYRef.current = 0;
              if (resultsScrollRef.current) resultsScrollRef.current.scrollTop = 0;
            }
            saveNavigationState();
          }}
        /> : <div className="streetMapLoading" role="status">Restaurando el mapa…</div>}
      </div>}

      {registryView !== "map" && <aside className="card registryResults">
        <div className="resultsHead">
          <h2>{mapAreaActive && registryView !== "list" ? "ELEPEM en esta zona del mapa" : "ELEPEM encontrados"}</h2>
          <output className="resultCount" aria-live="polite">{resultFacilities.length}</output>
        </div>

        <div className="registryResultsScroll" ref={bindResultsScroll}>
          {resultFacilities.map((facility) => (
            <FacilityResultCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              isListView={registryView === "list"}
              suppressAutoScroll={restoringNavigation}
              onSelect={(selectedFacility) => setSelectedId(selectedFacility.id)}
              onHighlight={setHighlightedId}
              onViewMore={(selectedFacility) => openFacilityDetails(selectedFacility.id)}
              key={facility.id}
            />
          ))}
          {!loading && resultFacilities.length === 0 && (
            <div className="registryEmptyResults">
              <p><strong>No hay ELEPEM que coincidan con esta búsqueda.</strong></p>
              <p>Probá con menos filtros o con otra forma de escribir el nombre. Que no aparezca acá no significa que el establecimiento no exista: puede no constar en las fuentes públicas consultadas.</p>
              {hasActiveFilters && (
                <button type="button" className="reportBack" onClick={resetFilters}>Quitar los filtros</button>
              )}
            </div>
          )}
        </div>
      </aside>}
    </div>

    {detailedFacility && (
      <FacilityMapDialog facility={detailedFacility} onClose={() => setDetailId(null)} />
    )}

  </>;
}

type RegistryKpiProps = {
  activeHelp: string | null;
  className: string;
  help: string;
  helpId: string;
  label: string;
  onActivate: () => void;
  onToggleHelp: (id: string | null) => void;
  value: number;
};

function RegistryKpi({ activeHelp, className, help, helpId, label, onActivate, onToggleHelp, value }: RegistryKpiProps) {
  const helpVisible = activeHelp === helpId;
  return <div className={`stat ${className}`}>
    <button type="button" className="registryKpiAction" onClick={onActivate}>
      <b>{value}</b>
      <p>{label}</p>
    </button>
    <button
      type="button"
      className="registryKpiHelp"
      aria-expanded={helpVisible}
      aria-label={`Explicar ${label}`}
      onClick={() => onToggleHelp(helpVisible ? null : helpId)}
      aria-describedby={`registry-kpi-tooltip-${helpId}`}
    ><CircleHelp size={17} aria-hidden="true" /></button>
    <span
      className={`registryKpiTooltip${helpVisible ? " is-open" : ""}`}
      id={`registry-kpi-tooltip-${helpId}`}
      role="tooltip"
    >{help}</span>
  </div>;
}

function FacilityResultCard({
  facility,
  isSelected,
  isListView,
  suppressAutoScroll,
  onSelect,
  onHighlight,
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
  isListView: boolean;
  suppressAutoScroll: boolean;
  onSelect: (facility: Facility) => void;
  onHighlight: (facilityId: string | null) => void;
  onViewMore: (facility: Facility) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const suppressAutoScrollRef = useRef(suppressAutoScroll);
  suppressAutoScrollRef.current = suppressAutoScroll;

  useEffect(() => {
    if (isSelected && !suppressAutoScrollRef.current) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  if (isListView) {
    return <FacilityListCard
      facility={facility}
      isSelected={isSelected}
      onSelect={onSelect}
      onHighlight={onHighlight}
      onViewMore={onViewMore}
    />;
  }
  const hasPublicPrice = typeof facility.monthlyPriceUyu === "number" && facility.monthlyPriceUyu > 0;

  return (
    <article
      ref={cardRef}
      className={`facilityCard facility-${facilityDisplayCategory(facility)} ${isSelected ? "selected" : ""}`}
      onMouseEnter={() => onHighlight(facility.id)}
      onMouseLeave={() => onHighlight(null)}
    >
      <button
        type="button"
        className="facilityCardSelect"
        aria-label={`Seleccionar ${facility.name} en el mapa`}
        aria-pressed={isSelected}
        onClick={() => onSelect(facility)}
      />
      <div className="facilityCompactLayout">
        <div className="facilityCompactSummary">
          <span className="facilityCompactMedia" aria-hidden="true">
            {facility.photoUrl
              ? <Image src={facility.photoUrl} alt="" fill sizes="190px" unoptimized />
              : <ImageIcon size={24} />}
          </span>
          <span className="facilityAccordionTitle">
            <strong>{facility.name}</strong>
            <span className="facilityCompactMeta">{facility.locality || "No informado"}</span>
            <span className="facilityCompactMeta">{canonicalDepartment(facility.department)}</span>
            <span className="facilityCompactMeta">{facility.address || "No informado"}</span>
            <FacilityPrimaryStatusBadge facility={facility} />
          </span>
        </div>
        <div className="facilityCompactAside">
          <button type="button" className="facilityCompactAction" onClick={() => onViewMore(facility)}>Ver más</button>
          <span
            className={`facilityCompactPrice${hasPublicPrice ? "" : " isMissing"}`}
            aria-label={hasPublicPrice ? `Precio mensual: ${formatMonthlyPrice(facility.monthlyPriceUyu as number)}` : "Precio no informado"}
          >
            {hasPublicPrice
              ? <b>{formatMonthlyPrice(facility.monthlyPriceUyu as number)}</b>
              : <small>Precio no informado</small>}
          </span>
          <FacilityQualityBadge facility={facility} />
        </div>
      </div>
    </article>
  );
}

function FacilityListCard({
  facility,
  isSelected,
  onSelect,
  onHighlight,
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
  onSelect: (facility: Facility) => void;
  onHighlight: (facilityId: string | null) => void;
  onViewMore: (facility: Facility) => void;
}) {
  const hasPublicPrice = typeof facility.monthlyPriceUyu === "number" && facility.monthlyPriceUyu > 0;
  return <article
    className={`facilityBookingCard facility-${facilityDisplayCategory(facility)} ${isSelected ? "selected" : ""}`}
    onMouseEnter={() => onHighlight(facility.id)}
    onMouseLeave={() => onHighlight(null)}
  >
    <button
      type="button"
      className="facilityCardSelect"
      aria-label={`Seleccionar ${facility.name} en el mapa`}
      aria-pressed={isSelected}
      onClick={() => onSelect(facility)}
    />
    <div className="facilityBookingMedia" aria-hidden="true">
    {facility.photoUrl
      ? <Image src={facility.photoUrl} alt="" fill sizes="200px" unoptimized />
      : <span className="facilityBookingPhotoPlaceholder"><ImageIcon size={26} /><small>Sin foto pública</small></span>}
    </div>
    <div className="facilityBookingContent">
      <h3>{facility.name}</h3>
      <p className="facilityBookingMeta">{facility.locality || "No informado"}</p>
      <p className="facilityBookingMeta">{canonicalDepartment(facility.department)}</p>
      <p className="facilityBookingMeta">{facility.address || "No informado"}</p>
      <FacilityPrimaryStatusBadge facility={facility} />
    </div>
    <div className="facilityBookingAside">
      <div className="facilityBookingAsideFooter">
        <button type="button" className="facilityBookingAction" onClick={() => onViewMore(facility)}>Ver más</button>
        <div
          className={`facilityBookingPrice${hasPublicPrice ? "" : " isMissing"}`}
          aria-label={hasPublicPrice ? `Precio mensual: ${formatMonthlyPrice(facility.monthlyPriceUyu as number)}` : "Precio no informado"}
        >
          {hasPublicPrice
            ? <strong>{formatMonthlyPrice(facility.monthlyPriceUyu as number)}</strong>
            : <small>Precio no informado</small>}
        </div>
        <FacilityQualityBadge facility={facility} />
      </div>
    </div>
  </article>;
}

function FacilityMapDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return <dialog
    ref={dialogRef}
    className="facilityMapDialog"
    aria-labelledby="facility-map-dialog-title"
    onClose={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="facilityMapDialogSurface">
    <header className="facilityMapDialogHeader">
      <div>
        <h2 id="facility-map-dialog-title">{facility.name}</h2>
        <p className="facilityMapDialogLocation">
          <span>{facility.address || "Dirección no informada"}</span>
          <i aria-hidden="true">|</i>
          <span>{facility.locality || "Localidad no informada"}</span>
          <i aria-hidden="true">|</i>
          <span>{canonicalDepartment(facility.department)}</span>
        </p>
      </div>
      <button type="button" className="facilityDialogClose" aria-label="Cerrar ficha" title="Cerrar ficha" onClick={onClose}><X size={22} aria-hidden="true" /></button>
    </header>
    <div className="facilityMapDialogContent">
      <FacilityProfile facility={facility} />
    </div>
    </div>
  </dialog>;
}
