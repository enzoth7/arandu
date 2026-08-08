"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./TeamVisitsWorkflow.css";

type VisitMode = "home" | "elepem";

const reviewStatuses = [
  "No revisado",
  "Conforme",
  "Observado",
  "Urgente",
  "No aplica",
] as const;

const evidenceSources = [
  "Sin evidencia",
  "Observación directa",
  "Documento",
  "Entrevista",
  "Dato del sistema",
] as const;

type ReviewStatus = (typeof reviewStatuses)[number];
type EvidenceSource = (typeof evidenceSources)[number];

type VisitAnswer = {
  status: ReviewStatus;
  evidence: EvidenceSource;
  note: string;
};

type VisitPoint = {
  id: string;
  label: string;
};

type VisitSection = {
  id: string;
  number: string;
  label: string;
  description: string;
  points: readonly VisitPoint[];
  kind?: "checklist" | "findings";
};

type VisitDefinition = {
  title: string;
  shortTitle: string;
  note: string;
  sections: readonly VisitSection[];
  rulesTitle: string;
  rules: readonly string[];
};

type VisitAnswers = Record<VisitMode, Record<string, VisitAnswer>>;

export type TeamVisitsWorkflowProps = {
  onSaved: (message: string) => void;
};

const point = (id: string, label: string): VisitPoint => ({ id, label });

const homeBefore = [
  point("home-authority", "Confirmar autoridad, consentimiento o fundamento de la visita"),
  point("home-cohabitation", "Revisar si la persona vive con quien podría agredirla"),
  point("home-safe-arrival", "Definir forma segura de llegada y contacto"),
  point("home-team-safety", "Componer el equipo y evaluar seguridad del personal"),
  point("home-prior-records", "Revisar servicios, alertas y contactos previos"),
] as const;

const homeDuring = [
  point("home-private-interview", "Entrevistar a la persona en privado"),
  point("home-person-will", "Registrar su voluntad, prioridades y temores"),
  point("home-basic-needs", "Verificar comida, agua, higiene y temperatura"),
  point("home-medication", "Revisar acceso y administración de medicamentos"),
  point("home-mobility", "Observar movilidad, lesiones, dolor y riesgo de caída"),
  point("home-finances", "Preguntar por dinero, documentos, tarjetas y firmas"),
  point("home-connections", "Comprobar acceso a teléfono, visitas y redes"),
  point("home-caregiver", "Explorar carga y necesidades de quien cuida"),
  point("home-property-safety", "Observar seguridad de la vivienda"),
  point("home-supports", "Identificar apoyos, prestador de salud y servicios"),
] as const;

const homeAfter = [
  point("home-safety-plan", "Plan de seguridad y contacto posterior"),
  point("home-health-referral", "Derivación urgente de salud, si corresponde"),
  point("home-police-referral", "Comunicación a Policía/Fiscalía, si corresponde"),
  point("home-dependency-assessment", "Solicitud de valoración de dependencia y cuidados"),
  point(
    "home-caregiver-support",
    "Apoyo a la persona cuidadora sin desplazar la voluntad de la persona",
  ),
  point("home-follow-up", "Fecha, responsable y objetivo del seguimiento"),
] as const;

const elepemBefore = [
  point(
    "elepem-identity",
    "Verificar identidad, dirección y estado administrativo",
  ),
  point(
    "elepem-prior-alerts",
    "Revisar alertas anteriores y motivo de la visita",
  ),
  point(
    "elepem-visit-kind",
    "Definir visita programada, sin aviso, conjunta o de seguimiento",
  ),
  point(
    "elepem-reporter-privacy",
    "Proteger identidad de la persona que comunicó",
  ),
  point(
    "elepem-capacity",
    "Revisar capacidad, anexos y responsables registrados",
  ),
] as const;

const elepemDuring = [
  point(
    "elepem-utilities",
    "Salidas, evacuación, agua, electricidad y gas",
  ),
  point("elepem-staff", "Dotación de personal por turno"),
  point(
    "elepem-management",
    "Director técnico y profesional social",
  ),
  point(
    "elepem-clinical-records",
    "Historias clínicas y administración de medicación",
  ),
  point(
    "elepem-restraints",
    "Psicofármacos, contenciones y restricciones",
  ),
  point(
    "elepem-care",
    "Alimentación, hidratación, higiene y úlceras",
  ),
  point(
    "elepem-incidents",
    "Caídas, errores, hospitalizaciones e incidentes",
  ),
  point(
    "elepem-privacy",
    "Privacidad, teléfono, visitas y pertenencias",
  ),
  point(
    "elepem-private-interviews",
    "Entrevistas privadas a residentes",
  ),
  point(
    "elepem-documents",
    "Documentos, contratos, nómina y registros",
  ),
] as const;

const visitDefinitions: Record<VisitMode, VisitDefinition> = {
  home: {
    title: "Visita de protección en domicilio",
    shortTitle: "Protección en domicilio",
    note:
      "La entrevista privada y la voluntad de la persona son centrales. No se presume incapacidad por edad o dependencia.",
    sections: [
      {
        id: "home-before",
        number: "01",
        label: "Antes de ir",
        description:
          "Prepará el fundamento, una llegada segura y el equipo necesario.",
        points: homeBefore,
      },
      {
        id: "home-during",
        number: "02",
        label: "Durante la visita",
        description:
          "Escuchá en privado y distinguí la voluntad de la persona de cada observación.",
        points: homeDuring,
      },
      {
        id: "home-after",
        number: "03",
        label: "Después",
        description:
          "Acordá acciones, responsables y una forma segura de seguimiento.",
        points: homeAfter,
      },
    ],
    rulesTitle: "Reglas de salvaguarda",
    rules: [
      "No revelar quién consultó.",
      "No entrevistar a la persona delante del presunto agresor.",
      "Confirmar si es seguro volver a contactar.",
      "Distinguir voluntad, necesidad de apoyo y riesgo.",
      "No usar el grado de dependencia como prueba de incapacidad.",
      "Registrar fuente de cada observación.",
    ],
  },
  elepem: {
    title: "Visita regulatoria a ELEPEM",
    shortTitle: "Visita regulatoria a ELEPEM",
    note:
      "La constatación debe distinguir observación directa, documentos, entrevistas y datos del sistema.",
    sections: [
      {
        id: "elepem-before",
        number: "01",
        label: "Preparación",
        description:
          "Revisá la identidad, los antecedentes y el alcance de la visita.",
        points: elepemBefore,
      },
      {
        id: "elepem-during",
        number: "02",
        label: "Constatación",
        description:
          "Registrá cada condición junto con su estado y fuente de evidencia.",
        points: elepemDuring,
      },
      {
        id: "elepem-result",
        number: "03",
        label: "Resultado",
        description:
          "Sintetizá los hechos observados y los documentos que efectivamente se revisaron.",
        points: [],
        kind: "findings",
      },
    ],
    rulesTitle: "Antes de concluir",
    rules: [
      "Separar observación directa, documento, entrevista y dato del sistema.",
      "Entrevistar residentes en privado.",
      "Revisar salidas, medicación, contenciones, dotación y registros.",
      "Una denuncia previa orienta la visita, pero no sustituye la constatación.",
      "Registrar medidas urgentes y plazos de corrección.",
    ],
  },
};

const caseOptions = [
  {
    value: "DEM-2401",
    label: "DEM-2401 · Municipio D · ubicación protegida",
  },
  {
    value: "DEM-2402",
    label: "DEM-2402 · Municipio CH · ubicación protegida",
  },
  {
    value: "DEM-2403",
    label: "DEM-2403 · ELEPEM ficticio vinculado",
  },
  {
    value: "DEM-2404",
    label: "DEM-2404 · Centro de día ficticio · Montevideo",
  },
  {
    value: "DEM-2405",
    label: "DEM-2405 · Lugar reportado A · Municipio D",
  },
] as const;

function initialModeAnswers(mode: VisitMode): Record<string, VisitAnswer> {
  return Object.fromEntries(
    visitDefinitions[mode].sections
      .flatMap((section) => section.points)
      .map((item) => [
        item.id,
        {
          status: "No revisado" as ReviewStatus,
          evidence: "Sin evidencia" as EvidenceSource,
          note: "",
        },
      ]),
  );
}

function initialAnswers(): VisitAnswers {
  return {
    home: initialModeAnswers("home"),
    elepem: initialModeAnswers("elepem"),
  };
}

export function TeamVisitsWorkflow({
  onSaved,
}: TeamVisitsWorkflowProps) {
  const controlPrefix = useId().replaceAll(":", "");
  const [mode, setMode] = useState<VisitMode>("home");
  const [caseId, setCaseId] = useState<string>(caseOptions[0].value);
  const [answers, setAnswers] = useState<VisitAnswers>(initialAnswers);
  const [activeSections, setActiveSections] = useState<
    Record<VisitMode, string>
  >({
    home: visitDefinitions.home.sections[0].id,
    elepem: visitDefinitions.elepem.sections[0].id,
  });
  const [elepemFindings, setElepemFindings] = useState("");
  const [drafts, setDrafts] = useState<Record<VisitMode, string>>({
    home: "",
    elepem: "",
  });

  const definition = visitDefinitions[mode];
  const activeSection =
    definition.sections.find(
      (section) => section.id === activeSections[mode],
    ) ?? definition.sections[0];

  const summary = useMemo(() => {
    const modeAnswers = Object.values(answers[mode]);

    return {
      total: modeAnswers.length,
      reviewed: modeAnswers.filter(
        (answer) => answer.status !== "No revisado",
      ).length,
      urgent: modeAnswers.filter((answer) => answer.status === "Urgente")
        .length,
      observed: modeAnswers.filter(
        (answer) => answer.status === "Observado",
      ).length,
    };
  }, [answers, mode]);

  const sectionProgress = (section: VisitSection) => {
    const reviewed = section.points.filter(
      (item) => answers[mode][item.id]?.status !== "No revisado",
    ).length;

    return {
      reviewed,
      total: section.points.length,
    };
  };

  const updateAnswer = <Key extends keyof VisitAnswer>(
    pointId: string,
    key: Key,
    value: VisitAnswer[Key],
  ) => {
    setAnswers((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [pointId]: {
          ...current[mode][pointId],
          [key]: value,
        },
      },
    }));
  };

  const activateSection = (sectionId: string, focusTab = false) => {
    setActiveSections((current) => ({
      ...current,
      [mode]: sectionId,
    }));

    if (focusTab) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`${controlPrefix}-${sectionId}-tab`)
          ?.focus();
      });
    }
  };

  const generateDraft = () => {
    const message =
      mode === "home"
        ? `Borrador: ${summary.reviewed} de ${summary.total} puntos revisados; ${summary.urgent} urgentes; ${summary.observed} observados. Falta revisión humana y registrar la voluntad de la persona.`
        : `Borrador: ${summary.reviewed} de ${summary.total} puntos revisados; ${summary.urgent} urgentes; ${summary.observed} observados. Separá la evidencia de las conclusiones.`;

    setDrafts((current) => ({ ...current, [mode]: message }));
    onSaved(
      mode === "home"
        ? "Borrador de la visita domiciliaria generado."
        : "Borrador de la visita regulatoria generado.",
    );
  };

  const linkVisit = () => {
    onSaved(
      mode === "home"
        ? `Visita de protección ficticia agregada al expediente ${caseId}.`
        : `Visita regulatoria ficticia vinculada al expediente ${caseId}.`,
    );
  };

  return (
    <div className="teamFormBody teamVisitWorkflow">
      <div className="teamVisitControls">
        <div
          className="teamSegmented teamVisitModeSelector"
          role="group"
          aria-label="Tipo de visita"
        >
          <button
            type="button"
            className={mode === "home" ? "isSelected" : ""}
            aria-pressed={mode === "home"}
            onClick={() => setMode("home")}
          >
            <Home aria-hidden="true" size={17} />
            Protección en domicilio
          </button>
          <button
            type="button"
            className={mode === "elepem" ? "isSelected" : ""}
            aria-pressed={mode === "elepem"}
            onClick={() => setMode("elepem")}
          >
            <ClipboardCheck aria-hidden="true" size={17} />
            Visita regulatoria a ELEPEM
          </button>
        </div>

        <label className="teamField teamVisitCase">
          <span>Caso ficticio asociado</span>
          <select
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
          >
            {caseOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="teamModeNote teamVisitModeNote" aria-live="polite">
        <ShieldCheck aria-hidden="true" size={17} />
        {definition.note}
      </p>

      <nav
        className="teamVisitMoments"
        aria-label={`Momentos de ${definition.shortTitle}`}
      >
        <div role="tablist" aria-label="Etapas de la visita">
          {definition.sections.map((section, sectionIndex) => {
            const selected = activeSection.id === section.id;
            const progress = sectionProgress(section);

            return (
              <button
                key={section.id}
                id={`${controlPrefix}-${section.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${controlPrefix}-${section.id}-panel`}
                tabIndex={selected ? 0 : -1}
                className={`teamVisitMoment ${selected ? "isSelected" : ""}`}
                onClick={() => activateSection(section.id)}
                onKeyDown={(event) => {
                  const lastIndex = definition.sections.length - 1;
                  let nextIndex: number | null = null;

                  if (
                    event.key === "ArrowRight" ||
                    event.key === "ArrowDown"
                  ) {
                    nextIndex = (sectionIndex + 1) % definition.sections.length;
                  } else if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowUp"
                  ) {
                    nextIndex =
                      (sectionIndex - 1 + definition.sections.length) %
                      definition.sections.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex = lastIndex;
                  }

                  if (nextIndex !== null) {
                    event.preventDefault();
                    activateSection(
                      definition.sections[nextIndex].id,
                      true,
                    );
                  }
                }}
              >
                <span className="teamVisitMomentNumber">{section.number}</span>
                <span className="teamVisitMomentCopy">
                  <strong>{section.label}</strong>
                  <small>
                    {section.kind === "findings"
                      ? elepemFindings.trim()
                        ? "Relato iniciado"
                        : "Pendiente"
                      : `${progress.reviewed} de ${progress.total} revisados`}
                  </small>
                </span>
                {section.kind !== "findings" &&
                  progress.total > 0 &&
                  progress.reviewed === progress.total && (
                    <CheckCircle2
                      className="teamVisitMomentDone"
                      aria-label="Etapa completa"
                      size={18}
                    />
                  )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="teamVisitWorkspace">
        <section
          id={`${controlPrefix}-${activeSection.id}-panel`}
          className="teamFlowGroup teamVisitPanel"
          role="tabpanel"
          aria-labelledby={`${controlPrefix}-${activeSection.id}-tab`}
        >
          <div className="teamSectionLabel teamVisitSectionLabel">
            <span>{activeSection.number}</span>
            <div>
              <strong>{activeSection.label}</strong>
              <small>{activeSection.description}</small>
            </div>
          </div>

          {activeSection.kind === "findings" ? (
            <label className="teamField teamNarrative teamVisitFindings">
              <span>Hechos observados y documentos revisados</span>
              <textarea
                value={elepemFindings}
                onChange={(event) => setElepemFindings(event.target.value)}
                placeholder="Datos ficticios únicamente."
              />
            </label>
          ) : (
            <div className="teamVisitChecklist">
              {activeSection.points.map((item, index) => {
                const answer = answers[mode][item.id];
                const statusId = `${controlPrefix}-${item.id}-status`;
                const evidenceId = `${controlPrefix}-${item.id}-evidence`;
                const noteId = `${controlPrefix}-${item.id}-note`;

                return (
                  <fieldset
                    className="teamVisitCheckitem"
                    data-status={answer.status}
                    key={item.id}
                  >
                    <legend className="teamVisitPointTitle">
                      <span aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{item.label}</strong>
                    </legend>
                    <div className="teamVisitPointFields">
                      <label
                        className="teamField teamVisitPointField"
                        htmlFor={statusId}
                      >
                        <span>Estado</span>
                        <select
                          id={statusId}
                          value={answer.status}
                          onChange={(event) =>
                            updateAnswer(
                              item.id,
                              "status",
                              event.target.value as ReviewStatus,
                            )
                          }
                        >
                          {reviewStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label
                        className="teamField teamVisitPointField"
                        htmlFor={evidenceId}
                      >
                        <span>Fuente de evidencia</span>
                        <select
                          id={evidenceId}
                          value={answer.evidence}
                          onChange={(event) =>
                            updateAnswer(
                              item.id,
                              "evidence",
                              event.target.value as EvidenceSource,
                            )
                          }
                        >
                          {evidenceSources.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label
                        className="teamField teamVisitPointField teamVisitNote"
                        htmlFor={noteId}
                      >
                        <span>
                          Nota <em>opcional</em>
                        </span>
                        <input
                          id={noteId}
                          type="text"
                          value={answer.note}
                          onChange={(event) =>
                            updateAnswer(item.id, "note", event.target.value)
                          }
                          placeholder="Detalle breve, límite o próximo paso"
                        />
                      </label>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </section>

        <aside
          className="teamVisitRules"
          aria-labelledby={`${controlPrefix}-${mode}-rules-title`}
        >
          <div className="teamVisitRulesIcon" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 id={`${controlPrefix}-${mode}-rules-title`}>
              {definition.rulesTitle}
            </h3>
            <ul>
              {definition.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section
        className="teamVisitSummary"
        aria-label={`Resumen de ${definition.shortTitle}`}
      >
        <div className="teamVisitSummaryIntro">
          <Sparkles aria-hidden="true" size={18} />
          <div>
            <strong>Resumen de la visita</strong>
            <small>
              Los datos se conservan al cambiar de etapa o modalidad.
            </small>
          </div>
        </div>
        <dl className="teamVisitStats">
          <div>
            <dt>Revisados</dt>
            <dd>
              {summary.reviewed}/{summary.total}
            </dd>
          </div>
          <div>
            <dt>Urgentes</dt>
            <dd>{summary.urgent}</dd>
          </div>
          <div>
            <dt>Observados</dt>
            <dd>{summary.observed}</dd>
          </div>
        </dl>
      </section>

      {drafts[mode] && (
        <div className="notice teamVisitDraft" role="status">
          <FileText aria-hidden="true" size={19} />
          <p>
            <strong>Borrador generado.</strong> {drafts[mode]}
          </p>
        </div>
      )}

      <footer className="teamActionDock teamVisitActions">
        <span>
          <ShieldCheck aria-hidden="true" size={17} />
          El registro es ficticio y requiere revisión humana.
        </span>
        <div>
          <button
            className="teamGhostButton"
            type="button"
            onClick={generateDraft}
          >
            <FileText aria-hidden="true" size={17} />
            Generar borrador
          </button>
          <button
            className="teamSaveButton"
            type="button"
            onClick={linkVisit}
          >
            {mode === "home"
              ? "Enviar al expediente ficticio"
              : "Vincular al expediente"}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default TeamVisitsWorkflow;
