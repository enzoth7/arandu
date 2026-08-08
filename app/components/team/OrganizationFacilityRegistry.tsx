"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivateCandidateMapLayer } from "../../hooks/usePrivateCandidateMapLayer";
import type {
  PrivateCandidateSummary,
  PrivateQueueCandidate,
} from "../../hooks/usePrivateCandidateMapLayer";
import { useResidenciales } from "../../hooks/useResidenciales";
import {
  candidateStatusLabel,
  SOURCE_CATEGORY_LABELS,
} from "../../../lib/facility-sources.mjs";
import { canonicalDepartment, foldText } from "../../../lib/uruguay.mjs";
import { consolidateFacilities, isVerificationFacility } from "../facility-presentation";
import type { Facility } from "../map-types";
import UruguayRegistry from "../UruguayRegistry";
import "./OrganizationFacilityRegistry.css";

/**
 * Registro del portal de organización: padrón público + capa privada de
 * candidatos. Ambas fuentes se consolidan acá y bajan ya resueltas al registro,
 * en lugar de que el hijo las empuje hacia arriba con callbacks.
 */
export function OrganizationFacilityRegistry({ initialFacilities = [] }: { initialFacilities?: Facility[] }) {
  const { facilities: publicFacilities, loading, error } = useResidenciales(initialFacilities);
  const {
    facilities: privateFacilities,
    summary: candidateSummary,
    available: privateAvailable,
    loading: privateLoading,
    error: privateError,
  } = usePrivateCandidateMapLayer();

  const consolidated = useMemo(
    () => consolidateFacilities([...publicFacilities, ...privateFacilities]),
    [publicFacilities, privateFacilities],
  );
  const verificationMapFacilities = useMemo(
    () => consolidated.filter(isVerificationFacility),
    [consolidated],
  );
  const legacyVerificationFacilities = useMemo(
    () => verificationMapFacilities.filter((facility) => !facility.privateCandidate),
    [verificationMapFacilities],
  );

  return (
    <section className="organizationRegistryWorkspace">
      <UruguayRegistry
        facilities={consolidated}
        loading={loading}
        error={error}
        notices={<>
          {privateAvailable && privateLoading && <div className="notice registryDataStatus" role="status">Actualizando residenciales a verificar…</div>}
          {privateAvailable && privateError && <div className="notice registryDataStatus registryDataError" role="alert">{privateError}</div>}
        </>}
      />
      {(candidateSummary.total > 0 || legacyVerificationFacilities.length > 0) && (
        <CandidateInventorySummary
          legacyFacilities={legacyVerificationFacilities}
          summary={candidateSummary}
          verificationMapFacilities={verificationMapFacilities}
        />
      )}
    </section>
  );
}

function CandidateInventorySummary({
  legacyFacilities,
  summary,
  verificationMapFacilities,
}: {
  legacyFacilities: Facility[];
  summary: PrivateCandidateSummary;
  verificationMapFacilities: Facility[];
}) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<PrivateQueueCandidate | null>(null);

  const inventoryCandidates = useMemo<PrivateQueueCandidate[]>(() => {
    const verificationMapIds = new Set(verificationMapFacilities.map((facility) => facility.id));
    const consolidatedQueueCandidates = summary.queueCandidates.filter((candidate) => {
      if (!candidate.hasCoordinates) return true;
      const databaseId = typeof candidate.details.id === "string" ? `candidate:${candidate.details.id}` : "";
      return (databaseId && verificationMapIds.has(databaseId))
        || verificationMapIds.has(`manual:${candidate.candidateKey}`);
    });

    const representedMapIds = new Set<string>();
    for (const candidate of consolidatedQueueCandidates) {
      const databaseId = typeof candidate.details.id === "string" ? `candidate:${candidate.details.id}` : "";
      if (databaseId && verificationMapIds.has(databaseId)) representedMapIds.add(databaseId);
      const manualId = `manual:${candidate.candidateKey}`;
      if (verificationMapIds.has(manualId)) representedMapIds.add(manualId);
    }
    for (const facility of legacyFacilities) representedMapIds.add(facility.id);

    const mapOnlyCandidates: PrivateQueueCandidate[] = verificationMapFacilities
      .filter((facility) => !representedMapIds.has(facility.id))
      .map((facility) => ({
        candidateKey: `map:${facility.id}`,
        name: facility.name,
        department: canonicalDepartment(facility.department),
        locality: facility.locality,
        address: facility.address,
        status: facility.privateCandidateStatus || "needs_review",
        evidenceTier: facility.privateCandidateEvidenceTier || "C",
        humanReviewed: false,
        hasCoordinates: true,
        sourceCategories: facility.sourceCategories || ["other_public"],
        pendingImport: true,
        details: { ...facility, recordType: "consolidated_map_facility" },
      }));

    return [
      ...consolidatedQueueCandidates.map((candidate) => ({
        ...candidate,
        department: canonicalDepartment(candidate.department),
      })),
      ...legacyFacilities.map((facility) => ({
      candidateKey: `legacy:${facility.id}`,
      name: facility.name,
      department: canonicalDepartment(facility.department),
      locality: facility.locality,
      address: facility.address,
      status: "needs_review",
      evidenceTier: "C" as const,
      humanReviewed: false,
      hasCoordinates: true,
      sourceCategories: facility.sourceCategories || ["other_public"],
      pendingImport: false,
      details: { ...facility, recordType: "legacy_verification_facility" },
      })),
      ...mapOnlyCandidates,
    ];
  }, [legacyFacilities, summary.queueCandidates, verificationMapFacilities]);

  const departments = useMemo(() => [...new Set(
    inventoryCandidates.map((candidate) => canonicalDepartment(candidate.department)).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "es")), [inventoryCandidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = foldText(query);
    return inventoryCandidates.filter((candidate) => {
      const haystack = foldText(`${candidate.name} ${candidate.address || ""} ${candidate.locality} ${candidate.department}`);
      const matchesCoordinates = !coordinates
        || (coordinates === "mapped" ? candidate.hasCoordinates : !candidate.hasCoordinates);
      return (!normalizedQuery || haystack.includes(normalizedQuery))
        && (!department || canonicalDepartment(candidate.department) === department)
        && matchesCoordinates;
    });
  }, [coordinates, department, inventoryCandidates, query]);

  const totalVerificationCount = inventoryCandidates.length;
  const visibleMapCount = inventoryCandidates.filter((candidate) => candidate.hasCoordinates).length;
  const unclearCoordinatesCount = Math.max(0, totalVerificationCount - visibleMapCount);

  return (
    <section className="candidateInventorySummary" aria-labelledby="candidate-inventory-title">
      <header className="candidateInventoryHeading">
        <h2 id="candidate-inventory-title">Todas las residencias con situación no confirmada</h2>
      </header>

      <div className="candidateInventoryPrimaryKpis" aria-label="Resumen de residenciales a verificar">
        <article className="candidateInventoryPrimaryKpi isTotal">
          <strong>{totalVerificationCount}</strong>
          <span>Total</span>
        </article>
        <article className="candidateInventoryPrimaryKpi isMapped">
          <strong>{visibleMapCount}</strong>
          <span>Visibles en el mapa</span>
        </article>
        <article className="candidateInventoryPrimaryKpi isUnmapped">
          <strong>{unclearCoordinatesCount}</strong>
          <span>Sin coordenadas claras</span>
        </article>
      </div>

      <section className="candidateInventoryListSection" aria-label="Buscador de residencias a verificar">
        <div className="candidateInventoryFilters" aria-label="Filtros de residenciales a verificar">
          <label className="candidateInventorySearch">
            <b>Buscar</b>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, dirección o localidad" />
          </label>
          <label>
            <b>Departamento</b>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">Todos</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <b>Coordenadas</b>
            <select value={coordinates} onChange={(event) => setCoordinates(event.target.value)}>
              <option value="">Todos</option>
              <option value="mapped">Con coordenadas</option>
              <option value="unmapped">Sin coordenadas</option>
            </select>
          </label>
        </div>

        <div className="candidateInventoryList">
          {filteredCandidates.map((candidate) => (
            <CandidateInventoryRow
              candidate={candidate}
              key={`${candidate.pendingImport ? "pending" : "queue"}:${candidate.candidateKey}`}
              onViewMore={setSelectedCandidate}
            />
          ))}
          {filteredCandidates.length === 0 && (
            <p className="candidateInventoryEmpty">No hay residenciales que coincidan con esos filtros.</p>
          )}
        </div>
      </section>

      {selectedCandidate && (
        <CandidateInventoryDialog candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
      )}
    </section>
  );
}

function CandidateInventoryRow({
  candidate,
  onViewMore,
}: {
  candidate: PrivateQueueCandidate;
  onViewMore: (candidate: PrivateQueueCandidate) => void;
}) {
  return (
    <article className="candidateInventoryRow">
      <div className="candidateInventoryRowCopy">
        <strong>{candidate.name}</strong>
        <span>{candidate.address || "Sin dirección informada"}</span>
        <small>{candidate.locality} · {candidate.department}</small>
      </div>
      <div className="candidateInventoryBadges">
        <span className={`candidateInventoryBadge ${candidate.hasCoordinates ? "candidateInventoryBadge-mapped" : "candidateInventoryBadge-unmapped"}`}>
          {candidate.hasCoordinates ? "Con coordenadas" : "Sin coordenadas"}
        </span>
      </div>
      <button className="candidateInventoryViewMore" type="button" onClick={() => onViewMore(candidate)}>
        Ver más
      </button>
    </article>
  );
}

function CandidateInventoryDialog({
  candidate,
  onClose,
}: {
  candidate: PrivateQueueCandidate;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const detailEntries = Object.entries(candidate.details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right, "es"));

  return (
    <div className="candidateDetailBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="candidate-detail-title"
        aria-modal="true"
        className="candidateDetailDialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <span>Información completa del registro</span>
            <h2 id="candidate-detail-title">{candidate.name}</h2>
            <p>{candidate.locality} · {candidate.department}</p>
          </div>
          <button aria-label="Cerrar detalle" className="candidateDetailClose" onClick={onClose} type="button">×</button>
        </header>

        <div className="candidateDetailOverview">
          <DetailItem label="Dirección" value={candidate.address || "Sin dirección informada"} />
          <DetailItem label="Coordenadas" value={candidate.hasCoordinates ? coordinateText(candidate.details) : "Sin coordenadas claras"} />
          <DetailItem label="Estado" value={candidateStatusLabel(candidate.status, "Sin estado")} />
          <DetailItem label="Evidencia" value={`Nivel ${candidate.evidenceTier}`} />
          <DetailItem label="Fuentes" value={candidate.sourceCategories.map((category) => SOURCE_CATEGORY_LABELS[category]).join(", ")} />
          <DetailItem label="Revisión humana" value={candidate.humanReviewed ? "Sí" : "No"} />
        </div>

        <section className="candidateDetailDatabase">
          <h3>Todos los datos disponibles en la base</h3>
          <dl>
            {detailEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{formatDetailLabel(key)}</dt>
                <dd><DetailValue value={value} /></dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function coordinateText(details: Record<string, unknown>) {
  const latitude = details.latitude ?? details.lat;
  const longitude = details.longitude ?? details.lng;
  return latitude !== undefined && longitude !== undefined
    ? `${String(latitude)}, ${String(longitude)}`
    : "Coordenadas disponibles";
}

function formatDetailLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toLocaleUpperCase("es-UY"));
}

function DetailValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") return <>{value ? "Sí" : "No"}</>;
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return <a href={value} rel="noreferrer" target="_blank">{value}</a>;
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }
  return <>{String(value)}</>;
}
