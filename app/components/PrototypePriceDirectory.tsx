"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Search } from "lucide-react";
import { canonicalDepartment, foldText } from "../../lib/uruguay.mjs";
import {
  formatPrototypePriceRange,
  PROTOTYPE_PRICE_CONFIDENCE_LABELS,
  PROTOTYPE_PRICE_TYPE_LABELS,
  PROTOTYPE_PRICE_WARNING,
  type PrototypePriceGuidance,
  type PrototypePriceGuidanceType,
} from "../../lib/prototype-price-guidance";
import styles from "./PrototypePriceDirectory.module.css";

type EvidenceFilter = "" | "public_recent" | "public_context" | "estimated";
type ConfidenceFilter = "" | PrototypePriceGuidance["confidence"];
type PriceBand = "" | "up_to_60000" | "60000_100000" | "100000_140000" | "over_140000";

const PAGE_SIZE = 60;

function evidenceBucket(type: PrototypePriceGuidanceType): Exclude<EvidenceFilter, ""> {
  if (type === "public_recent") return "public_recent";
  if (type === "public_undated_context" || type === "historical_context") return "public_context";
  return "estimated";
}

function matchesPriceBand(item: PrototypePriceGuidance, band: PriceBand) {
  if (!band) return true;
  if (band === "up_to_60000") return item.priceMinUyu <= 60_000;
  if (band === "60000_100000") return item.priceMaxUyu >= 60_000 && item.priceMinUyu <= 100_000;
  if (band === "100000_140000") return item.priceMaxUyu >= 100_000 && item.priceMinUyu <= 140_000;
  return item.priceMaxUyu >= 140_000;
}

function sourcePeriod(item: PrototypePriceGuidance) {
  if (item.sourceDate) {
    const date = new Date(`${item.sourceDate}T12:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    }
  }
  return item.sourceYear ? String(item.sourceYear) : "sin fecha visible";
}

function institutionalBadges(item: PrototypePriceGuidance) {
  const badges: string[] = [];
  if (item.mspFinal) badges.push("Habilitado MSP");
  if (item.midesSocial) badges.push("Certificado MIDES");
  if (!badges.length) badges.push("Situación no confirmada");
  return badges;
}

export function PrototypePriceDirectory({
  initialGuidance,
}: {
  initialGuidance: PrototypePriceGuidance[];
}) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFilter>("");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("");
  const [priceBand, setPriceBand] = useState<PriceBand>("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of initialGuidance) {
      const label = canonicalDepartment(item.department);
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right, "es-UY"));
  }, [initialGuidance]);

  const foldedQuery = useMemo(() => foldText(query), [query]);
  const filtered = useMemo(() => initialGuidance.filter((item) => {
    const searchable = foldText(`${item.name} ${item.address} ${item.locality} ${item.department}`);
    if (foldedQuery && !searchable.includes(foldedQuery)) return false;
    if (department && canonicalDepartment(item.department) !== department) return false;
    if (evidence && evidenceBucket(item.guidanceType) !== evidence) return false;
    if (confidence && item.confidence !== confidence) return false;
    return matchesPriceBand(item, priceBand);
  }), [confidence, department, evidence, foldedQuery, initialGuidance, priceBand]);

  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [confidence, department, evidence, foldedQuery, priceBand]);

  const summary = useMemo(() => ({
    total: initialGuidance.length,
    publicRecent: initialGuidance.filter((item) => item.guidanceType === "public_recent").length,
    publicContext: initialGuidance.filter((item) => evidenceBucket(item.guidanceType) === "public_context").length,
    estimated: initialGuidance.filter((item) => evidenceBucket(item.guidanceType) === "estimated").length,
  }), [initialGuidance]);

  const visible = filtered.slice(0, shown);
  const hasActiveFilters = Boolean(query || department || evidence || confidence || priceBand);

  function resetFilters() {
    setQuery("");
    setDepartment("");
    setEvidence("");
    setConfidence("");
    setPriceBand("");
  }

  return <div className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.prototypeBadge}>PROTOTIPO ACADÉMICO</span>
      <h1>Precios orientativos de ELEPEM</h1>
      <p className={styles.lead}>
        Una referencia económica para las {summary.total.toLocaleString("es-UY")} fichas del padrón, separando precios públicos de estimaciones territoriales.
      </p>
      <div className={styles.warning} role="note">
        <strong>No son cotizaciones.</strong>
        <span>{PROTOTYPE_PRICE_WARNING}</span>
      </div>
    </section>

    <section className={styles.stats} aria-label="Cobertura de precios orientativos">
      <article className={styles.stat}><strong>{summary.total}</strong><span>fichas con orientación</span></article>
      <article className={styles.stat}><strong>{summary.publicRecent}</strong><span>con precio público fechado</span></article>
      <article className={styles.stat}><strong>{summary.publicContext}</strong><span>con referencia pública o histórica</span></article>
      <article className={styles.stat}><strong>{summary.estimated}</strong><span>con estimación territorial</span></article>
    </section>

    <section className={styles.explanation}>
      <h2>Cómo leer los rangos</h2>
      <p>
        Cuando existe un precio público reciente, el rango reproduce esa evidencia. En los demás casos se muestra una banda amplia según territorio y, cuando está disponible, capacidad informada. La habilitación MSP o el certificado MIDES no aumentan ni reducen automáticamente el precio.
      </p>
    </section>

    <section className={styles.filters} aria-label="Filtros de precios orientativos">
      <label className={styles.searchField}>
        <span>Buscar</span>
        <div className={styles.searchBox}>
          <Search size={20} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, localidad, departamento o dirección"
          />
        </div>
      </label>

      <label>
        <span>Departamento</span>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">Todos</option>
          {departments.map(([name, count]) => <option value={name} key={name}>{name} ({count})</option>)}
        </select>
      </label>

      <label>
        <span>Tipo de evidencia</span>
        <select value={evidence} onChange={(event) => setEvidence(event.target.value as EvidenceFilter)}>
          <option value="">Todos</option>
          <option value="public_recent">Precio público fechado</option>
          <option value="public_context">Referencia pública o histórica</option>
          <option value="estimated">Estimación territorial</option>
        </select>
      </label>

      <label>
        <span>Confianza</span>
        <select value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}>
          <option value="">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
          <option value="very_low">Muy baja</option>
        </select>
      </label>

      <label>
        <span>Banda mensual</span>
        <select value={priceBand} onChange={(event) => setPriceBand(event.target.value as PriceBand)}>
          <option value="">Todas</option>
          <option value="up_to_60000">Incluye valores de hasta UYU 60.000</option>
          <option value="60000_100000">Se superpone con UYU 60.000–100.000</option>
          <option value="100000_140000">Se superpone con UYU 100.000–140.000</option>
          <option value="over_140000">Incluye valores desde UYU 140.000</option>
        </select>
      </label>

      <button type="button" onClick={resetFilters} disabled={!hasActiveFilters}>Restablecer</button>
    </section>

    <div className={styles.resultsHeader}>
      <div>
        <h2>Resultados</h2>
        <p>{filtered.length.toLocaleString("es-UY")} fichas coinciden con los filtros.</p>
      </div>
      <small>Los rangos están redondeados a UYU 5.000.</small>
    </div>

    {visible.length > 0 ? <section className={styles.grid}>
      {visible.map((item) => (
        <article className={styles.card} key={item.id}>
          <header className={styles.cardHeader}>
            <div>
              <h3>{item.name}</h3>
              <p><MapPin size={16} aria-hidden="true" /> {item.locality} · {canonicalDepartment(item.department)}</p>
            </div>
            <span className={`${styles.confidence} ${styles[`confidence_${item.confidence}`]}`}>
              Confianza {PROTOTYPE_PRICE_CONFIDENCE_LABELS[item.confidence].toLocaleLowerCase("es-UY")}
            </span>
          </header>

          <div className={styles.badges} aria-label="Situación institucional">
            {institutionalBadges(item).map((badge) => <span key={badge}>{badge}</span>)}
          </div>

          <div className={styles.priceBlock}>
            <small>{PROTOTYPE_PRICE_TYPE_LABELS[item.guidanceType]}</small>
            <strong>{formatPrototypePriceRange(item.priceMinUyu, item.priceMaxUyu)}</strong>
            <span>por mes · rango orientativo</span>
          </div>

          <dl className={styles.facts}>
            {item.address && <><dt>Dirección</dt><dd>{item.address}</dd></>}
            {typeof item.places === "number" && <><dt>Capacidad informada</dt><dd>{item.places} plazas</dd></>}
            <dt>Método</dt><dd>{item.methodologyNote}</dd>
          </dl>

          {item.observedReferenceText && <blockquote className={styles.reference}>
            <strong>Referencia localizada</strong>
            <span>{item.observedReferenceText}</span>
            <small>{item.sourceLabel || "Fuente pública"} · {sourcePeriod(item)}</small>
          </blockquote>}

          <p className={styles.cardWarning}>{PROTOTYPE_PRICE_WARNING}</p>

          <div className={styles.actions}>
            <Link href={`/?elepem=${encodeURIComponent(item.id)}#registro`}>Ver en el mapa</Link>
            {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
              Abrir referencia <ExternalLink size={15} aria-hidden="true" />
            </a>}
          </div>
        </article>
      ))}
    </section> : <section className={styles.empty}>
      <h2>No hay coincidencias</h2>
      <p>Probá con menos filtros o con otra forma de escribir el nombre.</p>
      <button type="button" onClick={resetFilters}>Quitar filtros</button>
    </section>}

    {shown < filtered.length && <button
      type="button"
      className={styles.loadMore}
      onClick={() => setShown((current) => current + PAGE_SIZE)}
    >
      Mostrar más ({Math.min(PAGE_SIZE, filtered.length - shown)})
    </button>}
  </div>;
}
