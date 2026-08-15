"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CircleHelp, Image as ImageIcon, Map as MapIcon, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FacilityExperiences } from "./FacilityExperiences";
import {
  facilityDisplayCategory,
  facilityDisplayLabel,
  isVerificationFacility,
} from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import { useFacilityFilters } from "../hooks/useFacilityFilters";
import { QUALITY_RATING_LABELS, type Facility, type FacilityQualityRating, type FacilityStatus } from "./map-types";

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
};

type RegistryView = "list" | "map" | "mixed";

export default function UruguayRegistry({
  facilities,
  demoFacilities = [],
  loading = false,
  error = "",
  notices,
  showChoiceCta = false,
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
  const mapColumnRef = useRef<HTMLDivElement | null>(null);
  const directFacilityHandled = useRef(false);

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
    if (selectedId && !mapFacilities.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [mapFacilities, selectedId]);

  function resetFilters() {
    reset();
    setSelectedId(null);
    setDetailId(null);
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
        <strong>Habilitación MSP</strong> y <strong>certificado MIDES</strong> son datos distintos.
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

          <label>
            <b>Clasificación</b>
            <select
              value={qualityRating}
              onChange={(event) => setQualityRating(event.target.value as "" | FacilityQualityRating)}
            >
              <option value="">Todas</option>
              {(Object.entries(QUALITY_RATING_LABELS) as Array<[FacilityQualityRating, string]>).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
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
        <StreetMap
          facilities={mapFacilities}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onOpenDetails={openFacilityDetails}
        />
      </div>}

      {registryView !== "map" && <aside className="card registryResults">
        <div className="resultsHead"><h2>ELEPEM encontrados</h2><output className="resultCount">{resultFacilities.length}</output></div>

        <div className="registryResultsScroll">
          {resultFacilities.map((facility) => (
            <FacilityAccordionCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              isListView={registryView === "list"}
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
      <div
        className="facilityDialogLayer"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailId(null);
        }}
      >
        <FacilityMapDialog facility={detailedFacility} onClose={() => setDetailId(null)} />
      </div>
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
    facility.mspFinal && { label: "Habilitado", tone: "green" },
    facility.midesSocial && { label: "Certificado", tone: "amber" },
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
  if (!facility.qualityRating) return null;
  return <span className={`qualityRatingBadge qualityRatingBadge-${facility.qualityRating}`}>
    {QUALITY_RATING_LABELS[facility.qualityRating]}
  </span>;
}

function FacilityAccordionCard({
  facility,
  isSelected,
  isListView,
  onSelect,
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
  isListView: boolean;
  onSelect: (id: string) => void;
  onViewMore: (facility: Facility) => void;
}) {
  const [isOpen, setIsOpen] = useState(isSelected);
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSelected) {
      setIsOpen(true);
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
          <FacilityMembershipBadges facility={facility} />
          {typeof facility.monthlyPriceUyu === "number" && facility.monthlyPriceUyu > 0 && (
            <span
              className="facilityCompactPrice"
              aria-label={`Precio mensual: ${formatMonthlyPrice(facility.monthlyPriceUyu)}`}
            >
              <small>Precio mensual</small>
              <b>{formatMonthlyPrice(facility.monthlyPriceUyu)}</b>
            </span>
          )}
        </div>
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
      <FacilityMembershipBadges facility={facility} />
      <div className="facilityBookingFacts">
        {facility.address && <span>{facility.address}</span>}
      </div>
      {facility.description && <p className="facilityBookingDescription">{facility.description}</p>}
      {facility.sourceLabel && <p className="facilityBookingSource">Fuente: {facility.sourceLabel}</p>}
    </div>
    <div className="facilityBookingAside">
      <div className="facilityBookingAsideFooter">
        {hasPublicPrice && <div className="facilityBookingPrice">
          <small>Precio mensual</small>
          <strong>{formatMonthlyPrice(facility.monthlyPriceUyu as number)}</strong>
        </div>}
        <button type="button" className="facilityBookingAction" onClick={() => onViewMore(facility)}>Ver ficha</button>
      </div>
    </div>
  </article>;
}

function FacilityMapDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return <section ref={dialogRef} tabIndex={-1} className="facilityMapDialog" role="dialog" aria-modal="true" aria-labelledby="facility-map-dialog-title">
    <div className="facilityMapDialogHeader">
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
      <button ref={closeButtonRef} type="button" className="facilityDialogClose" aria-label="Cerrar ficha" title="Cerrar ficha" onClick={onClose}><X size={22} aria-hidden="true" /></button>
    </div>
    <div className="facilityProfileLead">
      <div className="facilityProfileMedia">
        {(facility.photoUrls?.length || facility.photoUrl)
          ? <div className="facilityProfileGallery">
              <Image
                src={(facility.photoUrls?.length ? facility.photoUrls[0] : facility.photoUrl) as string}
                alt={`Vista principal del ELEPEM ${facility.name}`}
                width={720}
                height={420}
                unoptimized
              />
              {(facility.photoUrls?.length || 0) > 1 && <div className="facilityProfileThumbnails" aria-label="Más fotos públicas">
                {facility.photoUrls?.slice(1).map((photoUrl, index) => (
                  <Image
                    src={photoUrl}
                    alt={`Vista ${index + 2} del ELEPEM ${facility.name}`}
                    width={240}
                    height={150}
                    unoptimized
                    key={photoUrl}
                  />
                ))}
              </div>}
            </div>
          : <div className="facilityProfilePhotoMissing">Foto no informada</div>}
        <div className="facilityProfilePrice">
          <strong>{facility.monthlyPriceUyu
            ? `Desde $ ${facility.monthlyPriceUyu.toLocaleString("es-UY")}`
            : "No informado"}</strong>
          <span>Precio mensual</span>
          <FacilityQualityBadge facility={facility} />
        </div>
      </div>
      <div>
        <FacilityMembershipBadges facility={facility} showQuality={false} />
        <p>{facility.description || "Todavía no hay una descripción pública verificada de la vida cotidiana en este ELEPEM."}</p>
      </div>
    </div>

    <div className="facilityProfileActions">
      <Link href={`/experiencia?elepem=${encodeURIComponent(facility.id)}`}>Dejar una experiencia</Link>
      <Link href={`/preocupacion?elepem=${encodeURIComponent(facility.id)}`}>Contar una preocupación</Link>
    </div>
    <FacilityExperiences facilityId={facility.id} />
  </section>;
}
