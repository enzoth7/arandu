"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import {
  evidenceDescription,
  facilityDisplayCategory,
  facilityDisplayLabel,
  isVerificationFacility,
} from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";
import { useFacilityFilters } from "../hooks/useFacilityFilters";
import type { SortOrder } from "../../lib/facility-search.mjs";
import type { Facility, FacilityStatus } from "./map-types";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

const SORT_LABELS: Record<SortOrder, string> = {
  name: "Nombre (A–Z)",
  department: "Departamento",
  stage: "Etapa institucional",
  places: "Plazas publicadas",
};

// El registro es presentacional: recibe las fichas ya consolidadas y no sabe de
// dónde vienen. Así el portal de personas nunca monta la capa privada de
// candidatos y el de organización puede sumarla sin propagar estado hacia arriba.
type UruguayRegistryProps = {
  facilities: Facility[];
  loading?: boolean;
  error?: string;
  notices?: ReactNode;
  /** Filtro por estado de tratamiento; sólo tiene sentido en organización. */
  showPrivateWorkflowFilter?: boolean;
  /** Tarjeta «La persona decide»; sólo en el portal de personas. */
  showChoiceCta?: boolean;
};

type PrivateWorkflowStatus = "" | "needs_review" | "possible_match" | "verified_new";

export default function UruguayRegistry({
  facilities,
  loading = false,
  error = "",
  notices,
  showPrivateWorkflowFilter = false,
  showChoiceCta = false,
}: UruguayRegistryProps) {
  const {
    query, setQuery,
    department, setDepartment,
    locality, setLocality,
    status, setStatus,
    privateWorkflowStatus, setPrivateWorkflowStatus,
    sortOrder, setSortOrder,
    visible,
    departments,
    localities,
    summaryScope,
    hasActiveFilters,
    reset,
  } = useFacilityFilters(facilities);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);
  const mapColumnRef = useRef<HTMLDivElement | null>(null);

  const selected = selectedId ? (visible.find((facility) => facility.id === selectedId) ?? null) : null;
  const detailedFacility = detailId
    ? (facilities.find((facility) => facility.id === detailId) ?? null)
    : null;

  const summaryTotals = useMemo(() => ({
    habilitado: summaryScope.filter((facility) => facility.mspFinal).length,
    mides: summaryScope.filter((facility) => facility.midesSocial).length,
    unconfirmed: summaryScope.filter(isVerificationFacility).length,
  }), [summaryScope]);
  const visibleOfficialCount = visible.filter((facility) => !isVerificationFacility(facility)).length;
  const visibleVerificationCount = visible.filter(isVerificationFacility).length;

  useEffect(() => {
    if (selectedId && !visible.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visible, selectedId]);

  function resetFilters() {
    reset();
    setSelectedId(null);
    setDetailId(null);
  }

  return <>
    <section className="card registryIntro">
      <div className="registryIntroCopy">
        <h1>Encontrá información sobre establecimientos de larga estadía</h1>
        <p className="lead">Buscá, compará y consultá información sobre ELEPEM en Uruguay: los establecimientos de larga estadía donde viven personas mayores.</p>
      </div>
      {loading && <div className="notice registryDataStatus" role="status">Cargando ELEPEM…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      {notices}
      <div className="registryQuickSummary" aria-label="Resumen y filtros rápidos">
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-blue ${!status ? "selected" : ""}`} help="Total consolidado de ELEPEM." helpId="all" label="Todos" onActivate={() => setStatus("")} onToggleHelp={setActiveKpiHelp} value={summaryScope.length} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-green ${status === "habilitado" ? "selected" : ""}`} help="Establecimientos con habilitación final del MSP a junio de 2026." helpId="msp-final" label="Habilitados MSP" onActivate={() => setStatus(status === "habilitado" ? "" : "habilitado")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.habilitado} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-amber ${status === "mides" ? "selected" : ""}`} help="Establecimientos que se encuentran en proceso de habilitación (definido por el Decreto 356/016) y que obtuvieron el certificado social por parte del Mides." helpId="mides" label="Certificados Social MIDES" onActivate={() => setStatus(status === "mides" ? "" : "mides")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.mides} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-gray ${status === "verificar" ? "selected" : ""}`} help="No se encontró una situación actualizada en las fuentes públicas consultadas. Requiere verificación institucional; no significa que el establecimiento sea irregular." helpId="unconfirmed" label="Sin situación localizada" onActivate={() => setStatus(status === "verificar" ? "" : "verificar")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.unconfirmed} />
      </div>
      <p className="registryOverlapNote">
        Un mismo ELEPEM puede constar a la vez en la lista de <strong>habilitados</strong> y en la de <strong>certificados</strong>: son etapas distintas y se muestran por separado.
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

    <div className="registryMapLayout">
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
            <b>Localidad</b>
            <select
              value={locality}
              onChange={(event) => setLocality(event.target.value)}
              disabled={localities.length === 0}
            >
              <option value="">Todas</option>
              {localities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
            </select>
          </label>

          <label>
            <b>Situación institucional</b>
            <select value={status} onChange={(event) => setStatus(event.target.value as "" | FacilityStatus)}>
              <option value="">Todas</option>
              <option value="habilitado">Habilitación final MSP</option>
              <option value="mides">Certificado social MIDES</option>
              <option value="verificar">Sin situación localizada</option>
            </select>
          </label>

          {/* Ortogonal a la situación institucional: una es la etapa que consta
              en las fuentes y la otra el avance de la revisión interna. */}
          {showPrivateWorkflowFilter && (
            <label>
              <b>Estado de tratamiento</b>
              <select value={privateWorkflowStatus} onChange={(event) => setPrivateWorkflowStatus(event.target.value as PrivateWorkflowStatus)}>
                <option value="">Todos</option>
                <option value="needs_review">Necesita revisión</option>
                <option value="possible_match">Posible coincidencia</option>
                <option value="verified_new">Nuevo verificado</option>
              </select>
            </label>
          )}

          <label>
            <b>Ordenar por</b>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
              {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => (
                <option key={order} value={order}>{SORT_LABELS[order]}</option>
              ))}
            </select>
          </label>
          <p className="registryFilterNote">
            El orden es alfabético o por la etapa administrativa que consta en las fuentes. No hay puntajes, estrellas ni posiciones pagas.
          </p>
        </div>
      </aside>
      <div className="registryMapColumn" ref={mapColumnRef}>
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
        {detailedFacility && <FacilityMapDialog facility={detailedFacility} onClose={() => setDetailId(null)} />}
      </div>

      <aside className="card registryResults">
        <div className="resultsHead"><h2>ELEPEM encontrados</h2><output className="resultCount">{visible.length}</output></div>
        <p className="resultsMeta">
          {visibleOfficialCount} con situación institucional localizada
          {visibleVerificationCount > 0 ? ` · ${visibleVerificationCount} sin información vigente en las fuentes consultadas` : ""}
        </p>
        <div className="registryResultsScroll">
          {visible.map((facility) => (
            <FacilityAccordionCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              onSelect={setSelectedId}
              onViewMore={(selectedFacility) => {
                setSelectedId(selectedFacility.id);
                setDetailId(selectedFacility.id);
                window.requestAnimationFrame(() => mapColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
              key={facility.id}
            />
          ))}
          {!loading && visible.length === 0 && (
            <div className="registryEmptyResults">
              <p><strong>No hay ELEPEM que coincidan con esta búsqueda.</strong></p>
              <p>Probá con menos filtros o con otra forma de escribir el nombre. Que no aparezca acá no significa que el establecimiento no exista: puede no constar en las fuentes públicas consultadas.</p>
              {hasActiveFilters && (
                <button type="button" className="reportBack" onClick={resetFilters}>Quitar los filtros</button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>

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
    >?</button>
    {helpVisible && <span className="registryKpiTooltip" role="status">{help}</span>}
  </div>;
}

function badgeTone(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "habilitado") return "green";
  if (category === "mides") return "amber";
  return "gray";
}

function FacilityPrimaryBadge({ facility }: { facility: Facility }) {
  return <span className="facilityBadges" aria-label="Situación principal">
    <span className={`sourceBadge sourceBadge-${badgeTone(facility)}`}>{facilityDisplayLabel(facility)}</span>
  </span>;
}

function FacilityMembershipBadges({ facility }: { facility: Facility }) {
  if (isVerificationFacility(facility)) return <FacilityPrimaryBadge facility={facility} />;

  const badges = [
    facility.mspFinal && { label: "Habilitado", tone: "green" },
    facility.midesSocial && { label: "Certificado", tone: "amber" },
  ].filter(Boolean) as { label: string; tone: string }[];

  return <span className="facilityBadges" aria-label="Situaciones confirmadas">
    {badges.map((badge) => (
      <span className={`sourceBadge sourceBadge-${badge.tone}`} key={badge.label}>{badge.label}</span>
    ))}
  </span>;
}

function FacilityAccordionCard({
  facility,
  isSelected,
  onSelect,
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
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

  return (
    <article ref={cardRef} className={`facilityCard facility-${facilityDisplayCategory(facility)} ${isOpen ? "isOpen" : ""} ${isSelected ? "selected" : ""}`}>
      <button type="button" className="facilityAccordionHeader" onClick={toggle} aria-expanded={isOpen}>
        <div className="facilityAccordionTitle">
          <strong>{facility.name}</strong>
          <span className="facilityLocation">{facility.locality} · {canonicalDepartment(facility.department)}</span>
          <FacilityMembershipBadges facility={facility} />
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

function FacilityMapDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const formatDate = (value?: string) => {
    if (!value) return "Sin fecha registrada";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-UY");
  };
  return <section className="facilityMapDialog" role="dialog" aria-modal="false" aria-labelledby="facility-map-dialog-title">
    <div className="facilityMapDialogHeader">
      <div>
        <span>Información del residencial</span>
        <h2 id="facility-map-dialog-title">{facility.name}</h2>
        <p>{facility.locality} · {canonicalDepartment(facility.department)}</p>
      </div>
      <button type="button" onClick={onClose}><X size={18}/> Cerrar</button>
    </div>
    <FacilityMembershipBadges facility={facility} />
    <dl className="facilityMapDialogFacts">
      <div><dt>Identificador</dt><dd>{facility.id}</dd></div>
      <div><dt>Dirección</dt><dd>{facility.address || "Sin dirección informada"}</dd></div>
      <div><dt>Departamento</dt><dd>{canonicalDepartment(facility.department)}</dd></div>
      <div><dt>Localidad</dt><dd>{facility.locality || "Sin localidad informada"}</dd></div>
      <div><dt>Capacidad</dt><dd>{facility.places != null ? `${facility.places} plazas` : "Sin dato"}</dd></div>
      <div><dt>Situación principal</dt><dd>{facilityDisplayLabel(facility)}</dd></div>
      <div><dt>Etapa registrada</dt><dd>{facility.statusStage || "Sin detalle"}</dd></div>
      <div><dt>Resumen registrado</dt><dd>{facility.statusShort || "Sin detalle"}</dd></div>
      <div><dt>Fuente registrada</dt><dd>{facility.sourceLabel || "Sin detalle"}</dd></div>
      <div><dt>Ubicación registrada</dt><dd>{facility.precisionLabel || "Sin detalle"}</dd></div>
      <div><dt>Coordenadas</dt><dd>{facility.lat}, {facility.lng}</dd></div>
      <div><dt>Registro PACP</dt><dd>{facility.pacp ? "Sí" : "No"}</dd></div>
      <div><dt>Otra fuente registrada</dt><dd>{facility.otherSource ? "Sí" : "No"}</dd></div>
      <div><dt>Hallazgo de la aplicación</dt><dd>{facility.appDiscovered ? "Sí" : "No"}</dd></div>
      <div><dt>Creado en la base</dt><dd>{formatDate(facility.createdAt)}</dd></div>
      <div><dt>Última actualización</dt><dd>{formatDate(facility.updatedAt)}</dd></div>
      {facility.privateCandidate && <>
        <div><dt>Nivel de evidencia</dt><dd>{facility.privateCandidateEvidenceTier || "C"} · {evidenceDescription(facility.privateCandidateEvidenceTier)}</dd></div>
        <div><dt>Estado de revisión</dt><dd>{facility.privateCandidateStatus || "Sin estado registrado"}</dd></div>
        <div><dt>Fecha de consulta</dt><dd>{facility.privateCandidateRetrievedAt || "Sin fecha registrada"}</dd></div>
        <div><dt>Referencia pública</dt><dd>{facility.privateCandidateSourceUrl
          ? <a href={facility.privateCandidateSourceUrl} target="_blank" rel="noopener noreferrer">{facility.privateCandidateSourceUrl}</a>
          : "Sin enlace registrado"}</dd></div>
      </>}
    </dl>
  </section>;
}
