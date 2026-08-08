"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import {
  evidenceDescription,
  facilityDisplayCategory,
  facilityDisplayLabel,
  facilityHaystack,
  isVerificationFacility,
} from "./facility-presentation";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";
import type { Facility, FacilityStatus } from "./map-types";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

function matchesAdministrativeStatus(
  facility: Facility,
  status: FacilityStatus,
) {
  if (status === "habilitado") return facility.mspFinal;
  if (status === "mides") return facility.midesSocial;
  if (status === "otra_fuente") return facility.otherSource;
  if (status === "app") return facility.appDiscovered;
  if (status === "candidate_private") return facility.privateCandidate === true;
  return isVerificationFacility(facility);
}

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
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [privateWorkflowStatus, setPrivateWorkflowStatus] = useState<PrivateWorkflowStatus>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);
  const mapColumnRef = useRef<HTMLDivElement | null>(null);
  const consolidatedFacilities = facilities;

  const foldedQuery = useMemo(() => foldText(query), [query]);
  const statusIndependentWithoutDepartment = useMemo(() => facilities.filter((facility) => (
    (!privateWorkflowStatus || facility.privateCandidateStatus === privateWorkflowStatus)
      && (!foldedQuery || facilityHaystack(facility).includes(foldedQuery))
  )), [facilities, privateWorkflowStatus, foldedQuery]);

  const baseWithoutDepartment = useMemo(
    () => statusIndependentWithoutDepartment.filter(
      (facility) => !status || matchesAdministrativeStatus(facility, status),
    ),
    [statusIndependentWithoutDepartment, status],
  );
  const visible = useMemo(() => baseWithoutDepartment.filter((facility) => !department || canonicalDepartment(facility.department) === department), [baseWithoutDepartment, department]);
  const departmentCounts = useMemo(() => Object.entries(baseWithoutDepartment.reduce<Record<string, number>>((counts, facility) => {
    const canonical = canonicalDepartment(facility.department);
    if (canonical) counts[canonical] = (counts[canonical] ?? 0) + 1;
    return counts;
  }, {})).sort(([a], [b]) => a.localeCompare(b, "es")), [baseWithoutDepartment]);
  const selected = selectedId ? (visible.find((facility) => facility.id === selectedId) ?? null) : null;
  const detailedFacility = detailId
    ? (consolidatedFacilities.find((facility) => facility.id === detailId) ?? null)
    : null;
  const summaryKpiScope = useMemo(() => consolidatedFacilities.filter((facility) => (
    (!foldedQuery || facilityHaystack(facility).includes(foldedQuery))
      && (!department || canonicalDepartment(facility.department) === department)
  )), [consolidatedFacilities, department, foldedQuery]);
  const summaryTotals = useMemo(() => ({
    habilitado: summaryKpiScope.filter((facility) => facility.mspFinal).length,
    mides: summaryKpiScope.filter((facility) => facility.midesSocial).length,
    unconfirmed: summaryKpiScope.filter(isVerificationFacility).length,
  }), [summaryKpiScope]);
  const visibleOfficialCount = visible.filter((facility) => !isVerificationFacility(facility)).length;
  const visibleVerificationCount = visible.filter(isVerificationFacility).length;
  useEffect(() => {
    if (selectedId && !visible.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visible, selectedId]);

  const orderedResults = visible;

  function resetFilters() {
    setQuery(""); setDepartment(""); setStatus(""); setPrivateWorkflowStatus("");
    setSelectedId(null);
    setDetailId(null);
  }

  return <>
    <section className="card registryIntro">
      <div className="registryIntroCopy">
        <h1>Encontrá un residencial</h1>
        <p className="lead">Buscá por nombre o ubicación y consultá su situación administrativa.</p>
      </div>
      {loading && <div className="notice registryDataStatus" role="status">Cargando residenciales…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      {notices}
      <div className="registryQuickSummary" aria-label="Resumen y filtros rápidos">
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-blue ${!status ? "selected" : ""}`} help="Total consolidado de residenciales." helpId="all" label="Todos" onActivate={() => setStatus("")} onToggleHelp={setActiveKpiHelp} value={summaryKpiScope.length} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-green ${status === "habilitado" ? "selected" : ""}`} help="Establecimientos habilitados a junio 2026" helpId="msp-final" label="Habilitados MSP" onActivate={() => setStatus(status === "habilitado" ? "" : "habilitado")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.habilitado} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-amber ${status === "mides" ? "selected" : ""}`} help="Establecimientos que se encuentran en proceso de habilitación (definido por el Decreto 356/016) y que obtuvieron el certificado social por parte del Mides." helpId="mides" label="Certificados Social MIDES" onActivate={() => setStatus(status === "mides" ? "" : "mides")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.mides} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-gray ${status === "verificar" ? "selected" : ""}`} help="No figuran ni como habilitados ni como certificados." helpId="unconfirmed" label="Situación no confirmada" onActivate={() => setStatus(status === "verificar" ? "" : "verificar")} onToggleHelp={setActiveKpiHelp} value={summaryTotals.unconfirmed} />
      </div>
      <p className="registryOverlapNote">
        Algunos residenciales están incluidos tanto en la lista de <strong> Habilitados como en la de Certificados.</strong>
      </p>
      <div className="registrySearchHeaderRow">
        <div className="registrySearchFirst">
          <label className="searchField">
            <b>¿Qué residencial estás buscando?</b>
            <div className="registrySearchBox">
              <Search size={26} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribí un nombre, una calle o una localidad"
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
            <Link href="/personas/residenciales/form" className="btnTurquoisePrimary inlineBtn">
              Preparar mi elección
            </Link>
          </div>
        )}
      </div>
    </section>

    <div className="registryMapLayout">
      <aside className="card registryFiltersPanel" aria-label="Filtros del mapa">
        <div className="registryFiltersHeading">
          <div><span>Filtrar resultados</span><small>Elegí una o más opciones</small></div>
          <button
            type="button"
            className="registryClearFilters"
            disabled={!(query || department || status || privateWorkflowStatus || selectedId)}
            aria-label="Restablecer filtros y mapa"
            title="Restablecer filtros y mapa"
            onClick={resetFilters}
          ><RotateCcw size={17}/></button>
        </div>
        <div className="registryToolbar">
        <label><b>Departamento</b><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        {showPrivateWorkflowFilter ? <label><b>Estado de tratamiento</b><select value={privateWorkflowStatus} onChange={(event) => setPrivateWorkflowStatus(event.target.value as PrivateWorkflowStatus)}><option value="">Todos</option><option value="needs_review">Necesita revisión</option><option value="possible_match">Posible coincidencia</option><option value="verified_new">Nuevo verificado</option></select></label> : <label><b>Situación administrativa</b><select value={status} onChange={(event) => {
          const nextStatus = event.target.value as "" | FacilityStatus;
          setStatus(nextStatus);
        }}><option value="">Todos</option><option value="habilitado">Habilitados</option><option value="mides">Certificados</option><option value="verificar">Situación no confirmada</option></select></label>}
        </div>
      </aside>
      <div className="registryMapColumn" ref={mapColumnRef}>
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
        {detailedFacility && <FacilityMapDialog facility={detailedFacility} onClose={() => setDetailId(null)} />}
      </div>

      <aside className="card registryResults">
        <div className="resultsHead"><h2>Residenciales encontrados</h2><output className="resultCount">{visible.length}</output></div>
        <p className="resultsMeta">{visibleOfficialCount} habilitados o certificados{visibleVerificationCount > 0 ? ` + ${visibleVerificationCount} con situación no confirmada` : ""}</p>
        <div className="registryResultsScroll">
          {orderedResults.map((facility) => (
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
