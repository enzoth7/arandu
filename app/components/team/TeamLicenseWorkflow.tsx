"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Search } from "lucide-react";
import { useResidenciales } from "../../hooks/useResidenciales";
import "./TeamLicenseWorkflow.css";

const stages = [
  {
    number: 1,
    title: "Registro MSP",
    description: "Identidad del titular, director técnico, plano, oferta de servicios, plazas, personal y documentación inicial.",
    checks: [
      "Solicitud e identidad del operador",
      "Director técnico y propuesta asistencial",
      "Planta física y capacidad declarada",
    ],
  },
  {
    number: 2,
    title: "Certificado social MIDES",
    description: "Derechos, proyecto de centro, información a residentes, recursos humanos y aspectos sociales dentro de su competencia.",
    checks: [
      "Proyecto de centro",
      "Profesional social y participación",
      "Contratos, derechos y mecanismos de queja",
    ],
  },
  {
    number: 3,
    title: "Habilitación final MSP",
    description: "Incorpora evaluación sanitaria, certificación de Bomberos, correcciones, resolución, vigencia y renovación.",
    checks: [
      "Certificación de Bomberos",
      "Visita y correcciones cerradas",
      "Resolución y fecha de vencimiento",
    ],
  },
];

const connectedInformation = [
  ["Establecimiento", "Identificador permanente, nombres anteriores, dirección, operador y anexos."],
  ["Expediente", "Documentos, plazos, responsables y motivos de observación."],
  ["Visitas", "Hallazgos, evidencia, medidas y seguimiento."],
  ["Casos", "Solo la información necesaria y con acceso restringido; una alerta no equivale a una infracción confirmada."],
];

export function TeamLicenseWorkflow({ onSaved }: { onSaved: (message: string) => void }) {
  const { facilities, loading, error } = useResidenciales();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [activeStage, setActiveStage] = useState(1);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const results = useMemo(() => {
    if (!searched) return [];
    const normalized = query.trim().toLocaleLowerCase("es-UY");
    return facilities
      .filter((facility) => !normalized || `${facility.name} ${facility.address} ${facility.statusShort}`.toLocaleLowerCase("es-UY").includes(normalized))
      .slice(0, 15);
  }, [facilities, query, searched]);

  const selected = facilities.find((facility) => facility.id === selectedId);
  const stage = stages.find((item) => item.number === activeStage) ?? stages[0];
  const completed = Object.values(checks).filter(Boolean).length;

  const toggleCheck = (stageNumber: number, label: string) => {
    const key = `${stageNumber}-${label}`;
    setChecks((current) => ({ ...current, [key]: !current[key] }));
  };

  return <div className="teamWorkflow teamLicenseWorkflow">
    <section className="teamWorkflowBlock">
      <div className="teamSectionLabel"><span>01</span><div><strong>Buscar en los puntos integrados</strong><small>La búsqueda reúne registros, certificados y habilitaciones sin confundir sus etapas.</small></div></div>
      <div className="teamSearchBar">
        <label className="teamField"><span>Nombre o dirección</span><span className="teamSearchInput"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setSearched(true); }} placeholder="Buscar establecimiento"/></span></label>
        <button type="button" className="teamGhostButton" onClick={() => setSearched(true)}>Buscar</button>
      </div>

      {searched && <div className="teamFacilityResults" aria-live="polite">
        {loading ? <div className="teamEmptyState">Consultando residenciales en Supabase…</div> : error ? <div className="teamEmptyState">{error}</div> : results.length ? results.map((facility) => <button type="button" className={selectedId === facility.id ? "isSelected" : ""} onClick={() => setSelectedId(facility.id)} key={facility.id}>
          <span className="teamFacilityIcon"><Building2 size={19}/></span>
          <span><strong>{facility.name}</strong><small>{facility.address} · {facility.department}{facility.places != null ? ` · ${facility.places} plazas` : ""}</small><em>{facility.sourceLabel}</em></span>
          <span className="teamStagePill">{facility.statusStage}</span>
        </button>) : <div className="teamEmptyState">Sin coincidencias en las fuentes integradas.</div>}
      </div>}

      {selected && <div className="teamSelectedRecord"><CheckCircle2 size={19}/><span><strong>{selected.name}</strong>{selected.statusShort}<small>{selected.address} · {selected.locality} · {selected.department}</small></span></div>}
    </section>

    <section className="teamWorkflowBlock">
      <div className="teamSectionLabel"><span>02</span><div><strong>Recorrido por las tres etapas</strong><small>Los controles se conservan separados porque completar una etapa no equivale a tener la habilitación final.</small></div></div>
      <div className="teamSubTabs" role="tablist" aria-label="Etapas de habilitación">
        {stages.map((item) => <button type="button" role="tab" aria-selected={activeStage === item.number} className={activeStage === item.number ? "isActive" : ""} onClick={() => setActiveStage(item.number)} key={item.number}><span>{item.number}</span>{item.title}</button>)}
      </div>

      <div className="teamStagePanel" role="tabpanel" key={stage.number}>
        <span className="teamStageBadge">ETAPA {stage.number}</span>
        <h3>{stage.title}</h3>
        <p>{stage.description}</p>
        <div className="teamCheckList">
          {stage.checks.map((label) => {
            const checked = Boolean(checks[`${stage.number}-${label}`]);
            return <label className={checked ? "isChecked" : ""} key={label}><input type="checkbox" checked={checked} onChange={() => toggleCheck(stage.number, label)}/><span><CheckCircle2 size={18}/>{label}</span></label>;
          })}
        </div>
        <div className="teamInlineActions"><button type="button" className="teamGhostButton" onClick={() => onSaved(`Borrador ficticio de ${stage.title} guardado.`)}>Guardar esta etapa</button>{stage.number < 3 && <button type="button" className="teamSaveButton" onClick={() => setActiveStage(stage.number + 1)}>Continuar a etapa {stage.number + 1}<ArrowRight size={17}/></button>}</div>
      </div>
      <div className="teamProgressNote">{completed} de 9 controles marcados en este recorrido.</div>
    </section>

    <section className="teamWorkflowBlock">
      <div className="teamSectionLabel"><span>03</span><div><strong>Información que debería quedar conectada</strong><small>El expediente administrativo no vive aislado, pero cada vínculo respeta su finalidad y acceso.</small></div></div>
      <div className="teamConnectionGrid">{connectedInformation.map(([title, text]) => <article key={title}><strong>{title}</strong><p>{text}</p></article>)}</div>
      <div className="teamInlineActions teamAlignEnd"><button type="button" className="teamSaveButton" onClick={() => onSaved(`Avance ficticio guardado: ${completed} de 9 controles, sin efecto administrativo real.`)}>Guardar avance del expediente<ArrowRight size={17}/></button></div>
    </section>
  </div>;
}
