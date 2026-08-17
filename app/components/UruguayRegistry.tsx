"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CircleHelp, Globe2, Image as ImageIcon, Mail, Map as MapIcon, Phone, RotateCcw, Search, Share2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FacilityPhotoCarousel } from "./FacilityPhotoCarousel";
import { FacilityExperiences } from "./FacilityExperiences";
import { QualityRatingSelect } from "./QualityRatingSelect";
import {
  facilityDisplayCategory,
  facilityDisplayLabel,
  isVerificationFacility,
} from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import {
  useFacilityFilters,
  type PhotoAvailability,
  type PriceOrder,
} from "../hooks/useFacilityFilters";
import { QUALITY_RATING_LABELS, type Facility, type FacilityStatus } from "./map-types";
import {
  PUBLIC_REGISTRY_STATE_KEY,
  PUBLIC_REGISTRY_STATE_VERSION,
  parsePublicRegistryState,
} from "../../lib/public-registry-state.mjs";
import type { RegistryMapViewport } from "./StreetMap";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

const RESTORE_SCROLL_MAX_ATTEMPTS = 30;
const RESTORE_SCROLL_RETRY_MS = 100;
const RESTORE_SCROLL_STABLE_PASSES = 2;
const RESTORE_SCROLL_TOLERANCE_PX = 1;

function formatMonthlyPrice(value: number) {
  return `UYU ${value.toLocaleString("es-UY")}`;
}

type ContactChannelKind = "phone" | "email" | "website" | "instagram" | "facebook";

type ContactChannel = {
  kind: ContactChannelKind;
  label: string;
  value: string;
  href: string;
};

function uniqueContactValues(...sources: Array<readonly string[] | string | undefined>) {
  const values: string[] = [];
  const known = new Set<string>();
  for (const source of sources) {
    const items = Array.isArray(source) ? source : [source];
    for (const item of items) {
      if (typeof item !== "string") continue;
      const value = item.trim();
      const key = value.toLocaleLowerCase("es-UY");
      if (!value || known.has(key)) continue;
      known.add(key);
      values.push(value);
    }
  }
  return values;
}

function publicContactUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function FacilityContactIcon({ kind }: { kind: ContactChannelKind }) {
  const props = { "aria-hidden": true, size: 20, strokeWidth: 2 } as const;
  if (kind === "phone") return <Phone {...props} />;
  if (kind === "email") return <Mail {...props} />;
  if (kind === "website") return <Globe2 {...props} />;
  return <Share2 {...props} />;
}

function FacilityContactChannels({ facility }: { facility: Facility }) {
  const channels: ContactChannel[] = [];

  for (const value of uniqueContactValues(facility.contactPhones, facility.contactPhone)) {
    if (/^[+()0-9\s.-]{6,32}$/.test(value)) {
      channels.push({ kind: "phone", label: "Teléfono", value, href: `tel:${value.replace(/[()\s.-]/g, "")}` });
    }
  }
  for (const value of uniqueContactValues(facility.contactEmails, facility.contactEmail)) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      channels.push({ kind: "email", label: "Correo electrónico", value, href: `mailto:${encodeURIComponent(value)}` });
    }
  }
  for (const [kind, label, values] of [
    ["website", "Sitio web", facility.websites],
    ["instagram", "Instagram", facility.instagramUrls],
    ["facebook", "Facebook", facility.facebookUrls],
  ] as const) {
    for (const value of uniqueContactValues(values)) {
      const href = publicContactUrl(value);
      if (href) channels.push({ kind, label, value, href });
    }
  }

  if (!channels.length) return null;

  return <section className="facilityProfileContactChannels" aria-labelledby="facility-contact-channels-title">
    <div className="facilityProfileContactHeading">
      <h3 id="facility-contact-channels-title">Medios de contacto</h3>
      <p>Información pública disponible del residencial.</p>
    </div>
    <ul className="facilityContactChannelList">
      {channels.map((channel) => {
        const isExternal = ["website", "instagram", "facebook"].includes(channel.kind);
        return <li key={`${channel.kind}:${channel.href}`}>
          <a
            href={channel.href}
            aria-label={`${channel.label}: ${channel.value}`}
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <span className="facilityContactChannelIcon"><FacilityContactIcon kind={channel.kind} /></span>
            <span><small>{channel.label}</small><strong>{channel.value}</strong></span>
          </a>
        </li>;
      })}
    </ul>
  </section>;
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
    setMonthlyPriceRange,
    status, setStatus,
    qualityRating, setQualityRating,
    priceOrder, setPriceOrder,
    photoAvailability, setPhotoAvailability,
    visible,
    departments,
    summaryScope,
    hasActiveFilters,
    reset,
  } = useFacilityFilters(allFacilities);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);
  const [registryView, setRegistryView] = useState<RegistryView>("mixed");
  const [navigationRestored, setNavigationRestored] = useState(!persistNavigationState);
  const [restoringNavigation, setRestoringNavigation] = useState(persistNavigationState);
  const mapColumnRef = useRef<HTMLDivElement | null>(null);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const directFacilityHandled = useRef(false);
  const navigationRestoreHandled = useRef(false);
  const restoredScrollRef = useRef<{ windowY: number; resultsY: number } | null>(null);
  const mapViewportRef = useRef<RegistryMapViewport | null>(null);
  const lastWindowScrollYRef = useRef(0);
  const navigationWindowYRef = useRef<number | null>(null);
  const lastResultsScrollYRef = useRef(0);
  const persistenceReadyRef = useRef(!persistNavigationState);
  const latestNavigationStateRef = useRef({
    filters: { query, department, monthlyPriceRange, status, qualityRating, priceOrder, photoAvailability },
    registryView,
    selectedId,
  });
  latestNavigationStateRef.current = {
    filters: { query, department, monthlyPriceRange, status, qualityRating, priceOrder, photoAvailability },
    registryView,
    selectedId,
  };

  const resultFacilities = visible;
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

  const saveNavigationState = useCallback((windowYOverride?: number) => {
    if (!persistNavigationState || !persistenceReadyRef.current) return;
    const windowY = Math.max(
      0,
      typeof windowYOverride === "number" && Number.isFinite(windowYOverride)
        ? windowYOverride
        : navigationWindowYRef.current ?? lastWindowScrollYRef.current,
    );
    const resultsY = Math.max(
      0,
      resultsScrollRef.current?.scrollTop ?? lastResultsScrollYRef.current,
    );
    lastWindowScrollYRef.current = windowY;
    lastResultsScrollYRef.current = resultsY;
    try {
      window.localStorage.setItem(PUBLIC_REGISTRY_STATE_KEY, JSON.stringify({
        version: PUBLIC_REGISTRY_STATE_VERSION,
        savedAt: Date.now(),
        ...latestNavigationStateRef.current,
        scroll: {
          windowY,
          resultsY,
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

  useEffect(() => {
    if (navigationRestoreHandled.current) return;
    navigationRestoreHandled.current = true;

    if (!persistNavigationState) {
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
      setQuery(restored.filters.query);
      setDepartment(restored.filters.department);
      setMonthlyPriceRange(restored.filters.monthlyPriceRange);
      setStatus(restored.filters.status);
      setQualityRating(restored.filters.qualityRating);
      setPriceOrder(restored.filters.priceOrder);
      setPhotoAvailability(restored.filters.photoAvailability);
      setRegistryView(restored.registryView);
      setSelectedId(restored.selectedId);
      restoredScrollRef.current = restored.scroll;
      lastWindowScrollYRef.current = restored.scroll.windowY;
      lastResultsScrollYRef.current = restored.scroll.resultsY;
      mapViewportRef.current = restored.mapViewport;
    } else {
      lastWindowScrollYRef.current = Math.max(0, window.scrollY);
      persistenceReadyRef.current = true;
      setRestoringNavigation(false);
    }
    setNavigationRestored(true);
  }, [
    persistNavigationState,
    setDepartment,
    setMonthlyPriceRange,
    setPhotoAvailability,
    setPriceOrder,
    setQualityRating,
    setQuery,
    setStatus,
  ]);

  useEffect(() => {
    if (directFacilityHandled.current || allFacilities.length === 0) return;
    directFacilityHandled.current = true;
    const requestedId = new URLSearchParams(window.location.search).get("elepem");
    if (requestedId && allFacilities.some((facility) => facility.id === requestedId)) {
      setSelectedId(requestedId);
      setDetailId(requestedId);
    }
  }, [allFacilities]);

  useEffect(() => {
    if (loading || !navigationRestored || restoringNavigation) return;
    if (selectedId && !mapFacilities.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [loading, mapFacilities, navigationRestored, restoringNavigation, selectedId]);

  useEffect(() => {
    saveNavigationState();
  }, [
    department,
    monthlyPriceRange,
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
    if (!persistNavigationState || !navigationRestored) return;
    let frame = 0;
    let navigationResetTimer = 0;
    const resultsNode = resultsScrollRef.current;
    const scheduleSave = () => {
      if (navigationWindowYRef.current === null) {
        lastWindowScrollYRef.current = Math.max(0, window.scrollY);
      }
      if (resultsNode) {
        lastResultsScrollYRef.current = Math.max(0, resultsNode.scrollTop);
      }
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(saveNavigationState);
    };
    const saveLastPosition = () => {
      saveNavigationState(navigationWindowYRef.current ?? lastWindowScrollYRef.current);
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveLastPosition();
    };
    const captureInternalNavigation = (event: MouseEvent) => {
      if (
        event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return;

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      const browsingContext = anchor.target.trim().toLowerCase();
      if (browsingContext && browsingContext !== "_self") return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin) return;
      if (destination.pathname === current.pathname && destination.search === current.search) return;

      const windowY = Math.max(0, window.scrollY);
      navigationWindowYRef.current = windowY;
      lastWindowScrollYRef.current = windowY;
      saveNavigationState(windowY);

      // Si un manejador cancela la navegación, la vista sigue montada. El
      // resguardo se libera más tarde sin alterar el click ni su destino.
      window.clearTimeout(navigationResetTimer);
      navigationResetTimer = window.setTimeout(() => {
        navigationWindowYRef.current = null;
        lastWindowScrollYRef.current = Math.max(0, window.scrollY);
        saveNavigationState(lastWindowScrollYRef.current);
      }, 30_000);
    };
    window.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("pagehide", saveLastPosition);
    window.addEventListener("beforeunload", saveLastPosition);
    document.addEventListener("click", captureInternalNavigation, true);
    document.addEventListener("visibilitychange", saveWhenHidden);
    resultsNode?.addEventListener("scroll", scheduleSave, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(navigationResetTimer);
      window.removeEventListener("scroll", scheduleSave);
      window.removeEventListener("pagehide", saveLastPosition);
      window.removeEventListener("beforeunload", saveLastPosition);
      document.removeEventListener("click", captureInternalNavigation, true);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      resultsNode?.removeEventListener("scroll", scheduleSave);
      if (resultsNode) {
        lastResultsScrollYRef.current = Math.max(0, resultsNode.scrollTop);
      }
      // Next.js puede desmontar esta vista sin emitir `pagehide`; el cleanup
      // cierra esa ventana y conserva el último scroll antes de navegar.
      saveLastPosition();
    };
  }, [navigationRestored, persistNavigationState, registryView, saveNavigationState]);

  useEffect(() => {
    if (!navigationRestored || !restoringNavigation || loading) return;
    const scroll = restoredScrollRef.current;
    if (!scroll) {
      persistenceReadyRef.current = true;
      setRestoringNavigation(false);
      return;
    }

    let applyFrame = 0;
    let verifyFrame = 0;
    let retryTimer = 0;
    let attempts = 0;
    let stablePasses = 0;
    let previousLayoutSignature = "";
    let finished = false;

    const finishRestore = () => {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(applyFrame);
      window.cancelAnimationFrame(verifyFrame);
      window.clearTimeout(retryTimer);
      lastWindowScrollYRef.current = Math.max(0, window.scrollY);
      lastResultsScrollYRef.current = Math.max(
        0,
        resultsScrollRef.current?.scrollTop ?? scroll.resultsY,
      );
      restoredScrollRef.current = null;
      persistenceReadyRef.current = true;
      setRestoringNavigation(false);
      saveNavigationState(lastWindowScrollYRef.current);
    };

    const applyScroll = () => {
      if (finished) return;
      attempts += 1;
      const resultsNode = resultsScrollRef.current;
      if (resultsNode) resultsNode.scrollTop = scroll.resultsY;
      window.scrollTo({ top: scroll.windowY, left: 0, behavior: "auto" });

      verifyFrame = window.requestAnimationFrame(() => {
        if (finished) return;
        const currentResultsNode = resultsScrollRef.current;
        const windowReached = Math.abs(window.scrollY - scroll.windowY) <= RESTORE_SCROLL_TOLERANCE_PX;
        const resultsReached = !currentResultsNode
          || Math.abs(currentResultsNode.scrollTop - scroll.resultsY) <= RESTORE_SCROLL_TOLERANCE_PX;
        const layoutSignature = [
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
          currentResultsNode?.scrollHeight ?? 0,
          currentResultsNode?.clientHeight ?? 0,
        ].join(":");
        const reachedAndStable = windowReached
          && resultsReached
          && layoutSignature === previousLayoutSignature;
        stablePasses = reachedAndStable
          ? stablePasses + 1
          : windowReached && resultsReached ? 1 : 0;
        previousLayoutSignature = layoutSignature;

        if (
          stablePasses >= RESTORE_SCROLL_STABLE_PASSES
          || attempts >= RESTORE_SCROLL_MAX_ATTEMPTS
        ) {
          finishRestore();
          return;
        }
        retryTimer = window.setTimeout(() => {
          applyFrame = window.requestAnimationFrame(applyScroll);
        }, RESTORE_SCROLL_RETRY_MS);
      });
    };

    applyFrame = window.requestAnimationFrame(applyScroll);
    return () => {
      finished = true;
      window.cancelAnimationFrame(applyFrame);
      window.cancelAnimationFrame(verifyFrame);
      window.clearTimeout(retryTimer);
    };
  }, [loading, navigationRestored, registryView, restoringNavigation, resultFacilities.length, saveNavigationState]);

  function resetFilters() {
    reset();
    setSelectedId(null);
    setDetailId(null);
    restoredScrollRef.current = null;
    lastResultsScrollYRef.current = 0;
    mapViewportRef.current = null;
    if (persistNavigationState) {
      try {
        window.localStorage.removeItem(PUBLIC_REGISTRY_STATE_KEY);
      } catch {
        // El reinicio visual no depende del almacenamiento.
      }
    }
  }

  function openFacilityDetails(facilityId: string) {
    setSelectedId(facilityId);
    setDetailId(facilityId);
  }

  return <>
    <section className="card registryIntro" id="registro">
      {loading && <div className="notice registryDataStatus" role="status">Cargando ELEPEM…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      {notices}
      <div className="registryQuickSummary" aria-label="Resumen y filtros rápidos">
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-blue ${!status ? "selected" : ""}`} help="Total de ELEPEM contemplados en los indicadores institucionales." helpId="all" label="Todos" onActivate={() => setStatus("")} onToggleHelp={setActiveKpiHelp} value={kpiScope.length} />
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
              <Search size={26} />
              <input
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
      <span>Ver el padrón como</span>
      <button type="button" className={registryView === "list" ? "active" : ""} aria-pressed={registryView === "list"} onClick={() => setRegistryView("list")}>Lista</button>
      <button type="button" className={registryView === "map" ? "active" : ""} aria-pressed={registryView === "map"} onClick={() => setRegistryView("map")}><MapIcon size={16} aria-hidden="true" />Mapa</button>
      <button type="button" className={registryView === "mixed" ? "active" : ""} aria-pressed={registryView === "mixed"} onClick={() => setRegistryView("mixed")}>Mixta</button>
    </div>

    <div className={`registryMapLayout registryMapLayout-${registryView}`}>
      <aside className="card registryFiltersPanel" aria-label="Filtros de resultados">
        <div className="registryFiltersHeading">
          <div><span>Filtrar resultados</span><small>Elegí una o más opciones</small></div>
          <button
            type="button"
            className="registryClearFilters"
            disabled={!hasActiveFilters && !selectedId}
            aria-label="Restablecer filtros y mapa"
            title="Restablecer filtros y mapa"
            onClick={resetFilters}
          ><RotateCcw size={17}/></button>
        </div>
        <div className="registryToolbar">
          <label>
            <b>Departamento</b>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">Todos</option>
              {departments.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
            </select>
          </label>

          <label>
            <b>Situación institucional</b>
            <select value={status} onChange={(event) => setStatus(event.target.value as "" | FacilityStatus)}>
              <option value="">Todas</option>
              <option value="habilitado">Habilitación final MSP</option>
              <option value="mides">Certificado social MIDES</option>
              <option value="verificar">Situación no confirmada</option>
            </select>
          </label>

          <div className="registryFilterField">
            <b id="registry-quality-filter-label">Clasificación</b>
            <QualityRatingSelect
              labelledBy="registry-quality-filter-label"
              value={qualityRating}
              onChange={setQualityRating}
            />
          </div>

          <label>
            <b>Orden por precio</b>
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
        </div>
      </aside>
      {registryView !== "list" && <div className="registryMapColumn" ref={mapColumnRef}>
        {navigationRestored ? <StreetMap
          facilities={mapFacilities}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onOpenDetails={openFacilityDetails}
          initialViewport={mapViewportRef.current}
          restoreSelectionWithoutFlying={Boolean(mapViewportRef.current && selected)}
          onViewportChange={(viewport) => {
            mapViewportRef.current = viewport;
            saveNavigationState();
          }}
        /> : <div className="streetMapLoading" role="status">Restaurando el mapa…</div>}
      </div>}

      {registryView !== "map" && <aside className="card registryResults">
        <div className="resultsHead"><h2>ELEPEM encontrados</h2><output className="resultCount">{resultFacilities.length}</output></div>

        <div className="registryResultsScroll" ref={bindResultsScroll}>
          {resultFacilities.map((facility) => (
            <FacilityAccordionCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              isListView={registryView === "list"}
              suppressAutoScroll={restoringNavigation}
              onSelect={setSelectedId}
              onViewMore={(selectedFacility) => {
                openFacilityDetails(selectedFacility.id);
                window.requestAnimationFrame(() => mapColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
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

function badgeTone(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "demo") return "violet";
  if (category === "habilitado") return "green";
  if (category === "mides") return "amber";
  return "gray";
}

function FacilityMembershipBadges({ facility, showQuality = true }: { facility: Facility; showQuality?: boolean }) {
  const badges = [
    facility.mspFinal && { label: "Habilitado MSP", tone: "green" },
    facility.midesSocial && { label: "Certificado Social MIDES", tone: "amber" },
  ].filter(Boolean) as { label: string; tone: string }[];
  const primaryBadge = isVerificationFacility(facility);

  return <span className="facilityBadges" aria-label="Situaciones y clasificación">
    {primaryBadge ? (
      <span className={`sourceBadge sourceBadge-${badgeTone(facility)}`}>{facilityDisplayLabel(facility)}</span>
    ) : badges.map((badge) => (
      <span className={`sourceBadge sourceBadge-${badge.tone}`} key={badge.label}>{badge.label}</span>
    ))}
    {showQuality && <FacilityQualityBadge facility={facility} />}
  </span>;
}

function FacilityQualityBadge({ facility }: { facility: Facility }) {
  const rating = facility.qualityRating ?? "unrated";
  const label = facility.qualityRating ? QUALITY_RATING_LABELS[facility.qualityRating] : "Sin calificar";
  return <span className={`qualityRatingBadge qualityRatingBadge-${rating}`}>
    {label}
  </span>;
}

function FacilityAccordionCard({
  facility,
  isSelected,
  isListView,
  suppressAutoScroll,
  onSelect,
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
  isListView: boolean;
  suppressAutoScroll: boolean;
  onSelect: (id: string) => void;
  onViewMore: (facility: Facility) => void;
}) {
  const [isOpen, setIsOpen] = useState(isSelected);
  const cardRef = useRef<HTMLElement | null>(null);
  const suppressAutoScrollRef = useRef(suppressAutoScroll);
  suppressAutoScrollRef.current = suppressAutoScroll;

  useEffect(() => {
    if (isSelected) {
      setIsOpen(true);
      if (!suppressAutoScrollRef.current) {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [isSelected]);

  const toggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      onSelect(facility.id);
    }
  };

  if (isListView) return <FacilityListCard facility={facility} onViewMore={onViewMore} />;

  return (
    <article ref={cardRef} className={`facilityCard facility-${facilityDisplayCategory(facility)} ${isOpen ? "isOpen" : ""} ${isSelected ? "selected" : ""}`}>
      <button type="button" className="facilityAccordionHeader" onClick={toggle} aria-expanded={isOpen}>
        <span className="facilityCompactMedia" aria-hidden="true">
          {facility.photoUrl
            ? <Image src={facility.photoUrl} alt="" fill sizes="64px" unoptimized />
            : <ImageIcon size={19} />}
        </span>
        <div className="facilityAccordionTitle">
          <strong>{facility.name}</strong>
          <span className="facilityLocation">{facility.locality} · {canonicalDepartment(facility.department)}</span>
          <FacilityMembershipBadges facility={facility} showQuality={false} />
        </div>
        <span className="facilityCompactAside">
          {typeof facility.monthlyPriceUyu === "number" && facility.monthlyPriceUyu > 0 && (
            <span
              className="facilityCompactPrice"
              aria-label={`Precio mensual: ${formatMonthlyPrice(facility.monthlyPriceUyu)}`}
            >
              <b>{formatMonthlyPrice(facility.monthlyPriceUyu)}</b>
            </span>
          )}
          <FacilityQualityBadge facility={facility} />
        </span>
        <span className="facilityAccordionChevron">
          {isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </span>
      </button>

      {isOpen && (
        <div className="facilityAccordionBody">
          {facility.address && <p className="facilityAddress"><strong>Dirección:</strong> {facility.address}</p>}
          <div className="facilityAccordionActions">
            <button type="button" className="reportContinue facilityViewMoreBtn" onClick={() => onViewMore(facility)}>Ver más</button>
          </div>
        </div>
      )}
    </article>
  );
}

function FacilityListCard({ facility, onViewMore }: { facility: Facility; onViewMore: (facility: Facility) => void }) {
  const hasPublicPrice = typeof facility.monthlyPriceUyu === "number" && facility.monthlyPriceUyu > 0;
  return <article className={`facilityBookingCard facility-${facilityDisplayCategory(facility)}`}>
    <div className="facilityBookingMedia" aria-hidden="true">
    {facility.photoUrl
      ? <Image src={facility.photoUrl} alt="" fill sizes="200px" unoptimized />
      : <span className="facilityBookingPhotoPlaceholder"><ImageIcon size={26} /><small>Sin foto pública</small></span>}
    </div>
    <div className="facilityBookingContent">
      <h3>{facility.name}</h3>
      <p className="facilityBookingLocation">{facility.locality} · {canonicalDepartment(facility.department)}</p>
      <FacilityMembershipBadges facility={facility} showQuality={false} />
      <div className="facilityBookingFacts">
        {facility.address && <span>{facility.address}</span>}
      </div>
      {facility.description && <p className="facilityBookingDescription">{facility.description}</p>}
    </div>
    <div className="facilityBookingAside">
      <div className="facilityBookingAsideFooter">
        {hasPublicPrice && <div
          className="facilityBookingPrice"
          aria-label={`Precio mensual: ${formatMonthlyPrice(facility.monthlyPriceUyu as number)}`}
        >
          <strong>{formatMonthlyPrice(facility.monthlyPriceUyu as number)}</strong>
        </div>}
        <FacilityQualityBadge facility={facility} />
        <button type="button" className="facilityBookingAction" onClick={() => onViewMore(facility)}>Ver ficha</button>
      </div>
    </div>
  </article>;
}

function FacilityMapDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const photoUrls = useMemo(() => facility.photoUrls?.length
    ? facility.photoUrls
    : facility.photoUrl
      ? [facility.photoUrl]
      : [], [facility.photoUrl, facility.photoUrls]);

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
    <div className="facilityProfileLead">
      <div className="facilityProfileMedia">
        {photoUrls.length
          ? <FacilityPhotoCarousel facilityName={facility.name} photoUrls={photoUrls} />
          : <div className="facilityProfilePhotoMissing">Foto no informada</div>}
      </div>
      <div className="facilityProfileSummary">
        <FacilityMembershipBadges facility={facility} showQuality={false} />
        <h3>Información del ELEPEM</h3>
        <p>{facility.description || "Todavía no hay una descripción pública verificada de la vida cotidiana en este ELEPEM."}</p>
        <div className="facilityProfilePrice">
          <span>Precio mensual</span>
          <strong>{facility.monthlyPriceUyu
            ? `Desde $ ${facility.monthlyPriceUyu.toLocaleString("es-UY")}`
            : "No informado"}</strong>
          <FacilityQualityBadge facility={facility} />
        </div>
        <div className="facilityProfileActions">
          <Link href={`/experiencia?elepem=${encodeURIComponent(facility.id)}`}>Dejar una experiencia</Link>
          <Link href={`/preocupacion?elepem=${encodeURIComponent(facility.id)}`}>Contar una preocupación</Link>
        </div>
      </div>
    </div>

    <FacilityContactChannels facility={facility} />
    <div className="facilityProfileExperiences">
      <FacilityExperiences facilityId={facility.id} />
    </div>
    </div>
    </div>
  </dialog>;
}
