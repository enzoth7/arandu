"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Filter,
  Landmark,
  Plus,
  Search,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import "./TeamMeasuresWorkflow.css";

type MeasureTab = "panorama" | "records" | "register" | "relocation";
type AntecedentType = "administrative" | "unregistered" | "fire" | "judicial";
type SourceGroup =
  | "official-admin"
  | "official-judicial"
  | "press-authority"
  | "press-ongoing";

export type TeamMeasuresWorkflowProps = {
  onSaved: (message: string) => void;
};

type HistoricalAntecedent = {
  id: string;
  title: string;
  department: string;
  location: string;
  date: string;
  year: string;
  types: AntecedentType[];
  sourceGroup: SourceGroup;
  sourceLevel: string;
  sourceLabel: string;
  sourceUrl: string;
  status: string;
  facts: string[];
  caution: string;
  route: string[];
};

type VerificationPlace = {
  id: string;
  name: string;
  statusStage: string;
  statusShort: string;
  currentNote: string;
};

type OperationalMeasure = {
  id: string;
  linked: string;
  linkedLabel: string;
  type: string;
  authority: string;
  date: string;
  reference: string;
  residents: string;
  admissions: string;
  next: string;
  source: string;
};

type RelocationStatus =
  | "Destino por confirmar"
  | "Permanece provisoriamente"
  | "Traslado coordinado"
  | "Trasladada";

type RelocationPerson = {
  closure: string;
  code: string;
  dependency: string;
  network: string;
  destination: string;
  status: RelocationStatus;
  follow: string;
};

const TABS: { id: MeasureTab; label: string; icon: typeof Landmark }[] = [
  { id: "panorama", label: "Panorama y mapa", icon: Landmark },
  { id: "records", label: "Antecedentes verificables", icon: BookOpenCheck },
  { id: "register", label: "Registrar resultado o medida", icon: FileCheck2 },
  { id: "relocation", label: "Cierre y realojo", icon: UsersRound },
];

const METRICS = [
  {
    value: "20",
    label: "ELEPEM clausurados, acumulado informado a 2024.",
    note: "Fuente oficial: Memoria Anual 2024.",
  },
  {
    value: "148",
    label: "personas residentes realojadas por esos cierres.",
    note: "Dato acumulado, no padrón nominal actual.",
  },
  {
    value: "73",
    label: "realojos mediante el Programa de Apoyo al Cuidado Permanente.",
    note: "Fuente oficial: Inmayores/MIDES.",
  },
  {
    value: "133",
    label: "denuncias a ELEPEM recepcionadas en el universo auditado.",
    note: "Datos a marzo de 2024.",
  },
  {
    value: "1.481",
    label: "ELEPEM en el universo informado por la auditoría.",
    note: "No significa 1.481 clandestinos.",
  },
];

const CLASSIFICATIONS = [
  {
    title: "Alerta pendiente de verificación",
    text: "Una persona o institución reporta un lugar que no figura o cuyos datos no coinciden. Todavía no hay constatación.",
  },
  {
    title: "No registrado constatado",
    text: "Una autoridad verificó que allí funciona un ELEPEM sin registro. Debe quedar la actuación que sustenta esa conclusión.",
  },
  {
    title: "“Clandestino” confirmado",
    text: "La expresión se reserva para una resolución, comunicación oficial o causa judicial que la utilice expresamente.",
  },
];

const TYPE_LABELS: Record<AntecedentType, string> = {
  administrative: "Clausura administrativa",
  unregistered: "No registrado / clandestino",
  fire: "Incendio o incidente grave",
  judicial: "Actuación judicial",
};

const HISTORICAL_ANTECEDENTS: HistoricalAntecedent[] = [
  {
    id: "ANT-MSP-2022-4CIERRES",
    title: "Cuatro ELEPEM clausurados informados por MSP",
    department: "Montevideo",
    location: "Montevideo · punto departamental",
    date: "2022-08-11",
    year: "2022",
    types: ["administrative"],
    sourceGroup: "official-admin",
    sourceLevel: "Oficial administrativa",
    sourceLabel:
      "MSP · respuesta de acceso a la información, Resolución 585/2022",
    sourceUrl:
      "https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2022-08/Res%20585%202022_removed%20%281%29.pdf",
    status: "Antecedente histórico",
    facts: [
      "Hogar Dulce Hogar, La Casa de Fátima, Míriam y Las Flores fueron identificados como clausurados en la respuesta.",
      "Se informó el realojo de 32 residentes.",
      "24 realojos se realizaron mediante el Programa de Apoyo al Cuidado Permanente.",
    ],
    caution:
      "No describe necesariamente el uso actual de las direcciones ni la situación de eventuales operadores posteriores.",
    route: ["MSP", "MIDES / Inmayores", "PACP / Sistema de Cuidados"],
  },
  {
    id: "ANT-TAC-2025-RINCON",
    title: "Rincón de Tranqueras · caso judicial concluido",
    department: "Tacuarembó",
    location: "Rincón de Tranqueras · punto referencial",
    date: "2025-06-09",
    year: "2025",
    types: ["unregistered", "judicial"],
    sourceGroup: "official-judicial",
    sourceLevel: "Oficial judicial",
    sourceLabel: "Fiscalía General de la Nación",
    sourceUrl:
      "https://www.gub.uy/fiscalia-general-nacion/comunicacion/noticias/ocho-condenados-caso-residencial-clandestino-tacuarembo",
    status: "Ocho condenas mediante proceso abreviado",
    facts: [
      "La Fiscalía informó ocho condenas.",
      "La publicación identifica el lugar como residencial clandestino.",
      "Allí vivían más de treinta personas en condiciones de maltrato.",
    ],
    caution:
      "Es un antecedente judicial histórico; no debe convertirse en una etiqueta para toda la localidad.",
    route: ["Policía", "Fiscalía", "MIDES / Inmayores", "MSP"],
  },
  {
    id: "ANT-TYT-2024-FUEGO",
    title: "Treinta y Tres · incendio con diez fallecidos",
    department: "Treinta y Tres",
    location: "Ciudad de Treinta y Tres · punto referencial",
    date: "2025-11-26",
    year: "2024–2025",
    types: ["fire", "judicial"],
    sourceGroup: "official-judicial",
    sourceLevel: "Oficial judicial",
    sourceLabel: "Ministerio del Interior · publicación de condenas",
    sourceUrl:
      "https://www.gub.uy/ministerio-interior/comunicacion/noticias/condenadas-dos-personas-incendio-geriatrico-dejo-diez-fallecidos",
    status: "Dos personas condenadas",
    facts: [
      "El incendio ocurrió el 7 de julio de 2024.",
      "Provocó la muerte de diez personas.",
      "En noviembre de 2025 se informó la condena de dos personas.",
    ],
    caution:
      "El punto identifica la ciudad, no una evaluación actual de un inmueble.",
    route: ["Bomberos", "Policía", "Fiscalía", "MSP", "MIDES / Inmayores"],
  },
  {
    id: "ANT-SAL-2024-FUEGO",
    title: "Salinas · incendio con cuatro fallecidos",
    department: "Canelones",
    location: "Salinas · punto referencial",
    date: "2024-08-19",
    year: "2024",
    types: ["fire", "judicial"],
    sourceGroup: "official-judicial",
    sourceLevel: "Oficial judicial",
    sourceLabel: "Fiscalía General de la Nación · formalización",
    sourceUrl:
      "https://www.gub.uy/fiscalia-general-nacion/comunicacion/noticias/formalizacion-incendio-residencial-salinas",
    status: "Investigación formalizada en la fuente consultada",
    facts: [
      "El incendio ocurrió el 18 de julio de 2024.",
      "Fallecieron cuatro personas.",
      "Fiscalía informó la formalización de la investigación del propietario.",
    ],
    caution:
      "Formalización no equivale a sentencia definitiva. La ficha conserva el estado procesal de la fuente.",
    route: ["Bomberos", "Policía", "Fiscalía", "MSP", "MIDES / Inmayores"],
  },
  {
    id: "ANT-MVD-2026-UNION",
    title: "La Unión · establecimiento reportado como clandestino",
    department: "Montevideo",
    location: "La Unión · ubicación barrial",
    date: "2026-07-13",
    year: "2026",
    types: ["unregistered", "judicial"],
    sourceGroup: "press-ongoing",
    sourceLevel: "Prensa · proceso en curso",
    sourceLabel: "la diaria y otros medios, con información de la audiencia",
    sourceUrl:
      "https://ladiaria.com.uy/justicia/articulo/2026/7/fiscalia-advirtio-que-trabajadores-buscaron-evitar-ingreso-de-la-policia-al-residencial-clandestino/",
    status: "Dos personas formalizadas; sin sentencia definitiva",
    facts: [
      "La cobertura periodística informó 22 personas mayores encontradas.",
      "La situación se detectó luego de pedidos de auxilio y actuación policial.",
      "Dos responsables fueron formalizadas con prisión preventiva, según la información publicada.",
    ],
    caution:
      "Proceso reciente y en curso. No se publica la dirección exacta en el prototipo ni se presenta la formalización como condena.",
    route: [
      "Policía",
      "Fiscalía",
      "MIDES / Inmayores",
      "MSP",
      "Sistema de Cuidados / realojo",
    ],
  },
  {
    id: "ANT-COL-2026-BRIT",
    title: "Britópolis · cierre definitivo tras incendio fatal",
    department: "Colonia",
    location: "Playa Britópolis · punto referencial",
    date: "2026-05-22",
    year: "2026",
    types: ["administrative", "fire"],
    sourceGroup: "press-authority",
    sourceLevel: "Prensa con declaración de autoridad",
    sourceLabel:
      "Diario Helvecia · declaraciones de la directora departamental de Salud",
    sourceUrl:
      "https://helvecia.com.uy/2026/05/22/britopolis-tras-fallecimiento-de-residente-el-msp-clausuro-en-forma-definitiva-el-residencial-que-funcionaba-con-61-irregularidades-y-sin-habilitacion-de-bomberos/",
    status:
      "Cierre definitivo informado; resolución no integrada al prototipo",
    facts: [
      "Un hombre de 66 años murió durante un incendio en un contenedor anexo.",
      "La fuente informó cierre cautelar previo, 61 irregularidades y falta de habilitación de Bomberos.",
      "El centro tenía 36 residentes; los 35 restantes fueron realojados provisoriamente.",
    ],
    caution:
      "La ficha se apoya en prensa que cita a una autoridad sanitaria. Para un registro oficial permanente habría que incorporar la resolución y el expediente.",
    route: [
      "Bomberos",
      "MSP",
      "MIDES / Inmayores",
      "Sistema de Cuidados / PACP",
      "Familias",
    ],
  },
];

const CLOSURE_2022_NAMES = [
  "Hogar Dulce Hogar",
  "La Casa de Fátima",
  "Míriam",
  "Las Flores",
];

const EVIDENCE_RULES = [
  {
    title: "Alerta",
    text: "Dice que alguien comunicó una preocupación. No confirma el hecho.",
  },
  {
    title: "Incidente",
    text: "Registra que ocurrió un evento, como incendio, muerte inesperada o evacuación. Puede requerir investigar negligencia o delito.",
  },
  {
    title: "Hallazgo",
    text: "Una visita, documento o autoridad constató un incumplimiento.",
  },
  {
    title: "Medida",
    text: "Existe una resolución, actuación administrativa o decisión judicial con fecha y responsable.",
  },
  {
    title: "Antecedente histórico",
    text: "Se conserva para trazabilidad, pero no se presenta automáticamente como estado vigente.",
  },
];

const INITIAL_VERIFICATION_PLACES: VerificationPlace[] = [
  {
    id: "VER-DEMO-001",
    name: "Lugar reportado A (ficticio)",
    statusStage: "Pendiente de verificación",
    statusShort: "No figura en fuentes públicas consultadas · DEMO",
    currentNote:
      "Pendiente de búsqueda por nombre, dirección, titular y posible visita.",
  },
  {
    id: "VER-DEMO-002",
    name: "Posible anexo no declarado (ficticio)",
    statusStage: "Visita por coordinar",
    statusShort: "Dirección o anexo no coincide · DEMO",
    currentNote:
      "No se contactaría primero al establecimiento sin evaluar el riesgo de represalias.",
  },
  {
    id: "VER-DEMO-003",
    name: "Dirección no conciliada con el registro (ficticio)",
    statusStage: "En contraste documental",
    statusShort: "Puede usar otro nombre · DEMO",
    currentNote:
      "Pendiente de conciliación de nombre, dirección, titular y expediente.",
  },
];

const VERIFICATION_OUTCOMES = [
  "No funciona un ELEPEM en esa dirección",
  "Establecimiento identificado con otro nombre",
  "Anexo de un ELEPEM registrado",
  "Establecimiento conocido por la autoridad · trámite pendiente",
  "Establecimiento no registrado constatado por la autoridad",
  "Riesgo inmediato · requiere medida urgente",
  "Información insuficiente · nueva visita",
];

const MEASURE_TYPES = [
  "Observación",
  "Apercibimiento / correcciones",
  "Prohibición de nuevos ingresos",
  "Suspensión / cierre cautelar",
  "Clausura definitiva dispuesta",
  "Clausura ejecutada",
  "Realojo en curso",
  "Realojo completado",
  "Actuación judicial",
];

const MEASURE_AUTHORITIES = [
  "MSP",
  "MIDES / Inmayores",
  "MSP + MIDES",
  "Policía / Fiscalía",
  "Bomberos",
  "Coordinación interinstitucional",
];

const ADMISSION_OPTIONS = ["No consta", "Permitidos", "Prohibidos"];

const SOURCE_LEVELS = [
  "DEMO · sin efecto real",
  "Resolución administrativa oficial",
  "Comunicación judicial oficial",
  "Prensa con declaración de autoridad",
];

const INITIAL_MEASURES: OperationalMeasure[] = [
  {
    id: "MED-DEMO-001",
    linked: "VER-DEMO-002",
    linkedLabel: "Posible anexo no declarado (ficticio)",
    type: "Solicitud de visita",
    authority: "MSP · Sector ELEPEM (DEMO)",
    date: "2026-07-26",
    reference: "ACT-DEMO-001",
    residents: "Por verificar",
    admissions: "No consta",
    next: "Constatar posible anexo y proteger a la persona denunciante",
    source: "DEMO · sin efecto real",
  },
  {
    id: "MED-HIST-BRIT",
    linked: "ANT-COL-2026-BRIT",
    linkedLabel: "Britópolis · cierre definitivo tras incendio fatal",
    type: "Clausura definitiva informada",
    authority: "MSP",
    date: "2026-05-22",
    reference: "Resolución no integrada",
    residents: "35 tras el fallecimiento informado",
    admissions: "No corresponde",
    next: "Soluciones definitivas y seguimiento de realojos",
    source: "Prensa con declaración de autoridad",
  },
];

const RELOCATION_STATUSES: RelocationStatus[] = [
  "Destino por confirmar",
  "Permanece provisoriamente",
  "Traslado coordinado",
  "Trasladada",
];

const INITIAL_RELOCATION_PEOPLE: RelocationPerson[] = [
  {
    closure: "ESC-CIERRE-DEMO",
    code: "P-DEMO-01",
    dependency: "Severa",
    network: "Sin red disponible",
    destination: "PACP · ELEPEM proveedor ficticio",
    status: "Traslado coordinado",
    follow: "Pendiente 48 h",
  },
  {
    closure: "ESC-CIERRE-DEMO",
    code: "P-DEMO-02",
    dependency: "Moderada",
    network: "Hija disponible",
    destination: "Domicilio familiar",
    status: "Trasladada",
    follow: "Realizado",
  },
  {
    closure: "ESC-CIERRE-DEMO",
    code: "P-DEMO-03",
    dependency: "Leve",
    network: "Red parcial",
    destination: "ELEPEM ficticio",
    status: "Destino por confirmar",
    follow: "Pendiente",
  },
  {
    closure: "ESC-CIERRE-DEMO",
    code: "P-DEMO-04",
    dependency: "Severa",
    network: "Sin red",
    destination: "Sin solución definitiva",
    status: "Permanece provisoriamente",
    follow: "Urgente",
  },
];

const BEFORE_TRANSFER = [
  {
    id: "before-will",
    text: "Voluntad, apoyos para decidir y persona de confianza registrados.",
  },
  {
    id: "before-health",
    text: "Medicación, historia clínica y necesidades de cuidado conciliadas.",
  },
  {
    id: "before-belongings",
    text: "Documentación, dinero y pertenencias inventariados.",
  },
  {
    id: "before-destination",
    text: "Destino verificado y transporte coordinado.",
  },
];

const AFTER_TRANSFER = [
  {
    id: "after-contact",
    text: "Contacto dentro de las primeras 48 horas.",
  },
  {
    id: "after-health",
    text: "Revisión de continuidad de salud y cuidados.",
  },
  {
    id: "after-belongings",
    text: "Confirmación de pertenencias y recursos.",
  },
  {
    id: "after-follow",
    text: "Seguimiento posterior y cierre explicado.",
  },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function sourceTone(source: SourceGroup) {
  if (source === "official-admin") return "isOfficial";
  if (source === "official-judicial") return "isJudicial";
  return "isPress";
}

export function TeamMeasuresWorkflow({
  onSaved,
}: TeamMeasuresWorkflowProps) {
  const generatedId = useId().replaceAll(":", "");
  const [activeTab, setActiveTab] = useState<MeasureTab>("panorama");

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyType, setHistoryType] = useState<"" | AntecedentType>("");
  const [historySource, setHistorySource] = useState<"" | SourceGroup>("");
  const [selectedAntecedent, setSelectedAntecedent] = useState(
    HISTORICAL_ANTECEDENTS[0].id,
  );

  const [verificationPlaces, setVerificationPlaces] = useState(
    INITIAL_VERIFICATION_PLACES,
  );
  const [verificationPlaceId, setVerificationPlaceId] = useState(
    INITIAL_VERIFICATION_PLACES[0].id,
  );
  const [verificationOutcome, setVerificationOutcome] = useState(
    VERIFICATION_OUTCOMES[0],
  );
  const [verificationAuthority, setVerificationAuthority] = useState(
    "MSP · Sector ELEPEM (DEMO)",
  );
  const [verificationDate, setVerificationDate] = useState(getToday);
  const [verificationReference, setVerificationReference] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const [verificationResult, setVerificationResult] = useState("");

  const [measureLinkedRecord, setMeasureLinkedRecord] = useState(
    INITIAL_VERIFICATION_PLACES[0].id,
  );
  const [measureType, setMeasureType] = useState(MEASURE_TYPES[0]);
  const [measureAuthority, setMeasureAuthority] = useState(
    MEASURE_AUTHORITIES[0],
  );
  const [measureDate, setMeasureDate] = useState(getToday);
  const [measureReference, setMeasureReference] = useState("");
  const [measureResidents, setMeasureResidents] = useState("0");
  const [measureAdmissions, setMeasureAdmissions] = useState(
    ADMISSION_OPTIONS[0],
  );
  const [measureNext, setMeasureNext] = useState("");
  const [measureSource, setMeasureSource] = useState(SOURCE_LEVELS[0]);
  const [measures, setMeasures] = useState(INITIAL_MEASURES);
  const measureSequence = useRef(1000);

  const [relocationClosure, setRelocationClosure] =
    useState("ESC-CIERRE-DEMO");
  const [relocationPeople, setRelocationPeople] = useState(
    INITIAL_RELOCATION_PEOPLE,
  );
  const [relocationChecks, setRelocationChecks] = useState<
    Record<string, boolean>
  >({});
  const relocationSequence = useRef(10);

  const filteredAntecedents = useMemo(() => {
    const query = historyQuery.trim().toLocaleLowerCase("es");
    return HISTORICAL_ANTECEDENTS.filter((record) => {
      const searchable = [
        record.title,
        record.department,
        record.location,
        record.year,
        record.sourceLabel,
        ...record.facts,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        (!query || searchable.includes(query)) &&
        (!historyType || record.types.includes(historyType)) &&
        (!historySource || record.sourceGroup === historySource)
      );
    });
  }, [historyQuery, historySource, historyType]);

  const activeAntecedent =
    filteredAntecedents.find((record) => record.id === selectedAntecedent) ??
    filteredAntecedents[0] ??
    null;

  const measureLinkedOptions = useMemo(
    () => [
      ...verificationPlaces.map((place) => ({
        id: place.id,
        label: `${place.name} · capa DEMO`,
      })),
      ...HISTORICAL_ANTECEDENTS.map((record) => ({
        id: record.id,
        label: `${record.title} · histórico`,
      })),
    ],
    [verificationPlaces],
  );

  const relocationClosureOptions = useMemo(
    () => [
      { id: "ESC-CIERRE-DEMO", label: "Escenario de cierre ficticio" },
      ...HISTORICAL_ANTECEDENTS.filter((record) =>
        record.types.includes("administrative"),
      ).map((record) => ({
        id: record.id,
        label: `${record.title} · antecedente histórico`,
      })),
    ],
    [],
  );

  const visibleRelocationPeople = useMemo(
    () =>
      relocationPeople.filter(
        (person) => person.closure === relocationClosure,
      ),
    [relocationClosure, relocationPeople],
  );

  const relocationMetrics = useMemo(() => {
    const transferred = visibleRelocationPeople.filter(
      (person) =>
        person.status === "Trasladada" ||
        person.status === "Traslado coordinado",
    ).length;
    const pendingDestination = visibleRelocationPeople.filter(
      (person) =>
        /pendiente|provisoriamente|confirmar/i.test(
          `${person.status} ${person.destination}`,
        ),
    ).length;
    const pendingFollow = visibleRelocationPeople.filter((person) =>
      /pendiente|urgente/i.test(person.follow),
    ).length;
    return [
      ["Personas en plan", visibleRelocationPeople.length],
      ["Traslados realizados/coordinados", transferred],
      ["Solución definitiva pendiente", pendingDestination],
      ["Seguimientos pendientes", pendingFollow],
      ["Datos reales almacenados", 0],
    ] as const;
  }, [visibleRelocationPeople]);

  function changeTab(tab: MeasureTab) {
    setActiveTab(tab);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let targetIndex = index;
    if (event.key === "ArrowRight") targetIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      targetIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    const target = TABS[targetIndex];
    setActiveTab(target.id);
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    tabButtons?.[targetIndex]?.focus();
  }

  function resetHistoryFilters() {
    setHistoryQuery("");
    setHistoryType("");
    setHistorySource("");
    setSelectedAntecedent(HISTORICAL_ANTECEDENTS[0].id);
  }

  function openAntecedent(id: string) {
    setSelectedAntecedent(id);
    setActiveTab("panorama");
  }

  function saveVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = verificationOutcome;
    const reference = verificationReference.trim() || "Sin referencia";
    const note = verificationNote.trim() || "Sin nota adicional";
    const nextStage = outcome
      .toLocaleLowerCase("es")
      .includes("no registrado constatado")
      ? "No registrado constatado · DEMO"
      : outcome.includes("Riesgo inmediato")
        ? "Medida urgente · DEMO"
        : "Verificación actualizada · DEMO";

    setVerificationPlaces((current) =>
      current.map((place) =>
        place.id === verificationPlaceId
          ? {
              ...place,
              statusStage: nextStage,
              statusShort: `${outcome} · DEMO`,
              currentNote: `${verificationAuthority} · ${verificationDate} · ${reference} · ${note}`,
            }
          : place,
      ),
    );
    setVerificationResult(outcome);
    onSaved(
      "Resultado ficticio de verificación guardado con su actuación y sus límites.",
    );
  }

  function saveMeasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    measureSequence.current += 1;
    const selectedOption = measureLinkedOptions.find(
      (option) => option.id === measureLinkedRecord,
    );
    const nextMeasure: OperationalMeasure = {
      id: `MED-${measureSequence.current}`,
      linked: measureLinkedRecord,
      linkedLabel: selectedOption?.label ?? measureLinkedRecord,
      type: measureType,
      authority: measureAuthority,
      date: measureDate || getToday(),
      reference: measureReference.trim() || "Sin referencia",
      residents: measureResidents || "0",
      admissions: measureAdmissions,
      next: measureNext.trim() || "Pendiente de definir",
      source: measureSource,
    };
    setMeasures((current) => [nextMeasure, ...current]);
    onSaved("Medida ficticia registrada. No tiene efecto administrativo.");
  }

  function addRelocationPerson() {
    relocationSequence.current += 1;
    const code = `P-DEMO-${relocationSequence.current}`;
    setRelocationPeople((current) => [
      ...current,
      {
        closure: relocationClosure,
        code,
        dependency: "Pendiente de valorar",
        network: "Pendiente",
        destination: "Sin solución definitiva",
        status: "Destino por confirmar",
        follow: "Pendiente",
      },
    ]);
    onSaved("Persona ficticia agregada al plan de protección y realojo.");
  }

  function updateRelocationText(
    code: string,
    field: "dependency" | "network" | "destination" | "follow",
    value: string,
  ) {
    setRelocationPeople((current) =>
      current.map((person) =>
        person.code === code ? { ...person, [field]: value } : person,
      ),
    );
  }

  function updateRelocationStatus(code: string, status: RelocationStatus) {
    setRelocationPeople((current) =>
      current.map((person) =>
        person.code === code
          ? {
              ...person,
              status,
              follow:
                status === "Trasladada" && person.follow === "Urgente"
                  ? "Pendiente 48 h"
                  : person.follow,
            }
          : person,
      ),
    );
  }

  function toggleRelocationCheck(id: string) {
    setRelocationChecks((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  return (
    <section
      className="teamMeasuresWorkflow"
      aria-labelledby={`${generatedId}-title`}
    >
      <header className="teamMeasuresIntro">
        <div className="teamSectionLabel">
          <span aria-hidden="true">
            <Landmark size={19} />
          </span>
          <div>
            <strong id={`${generatedId}-title`}>
              Medidas, antecedentes y realojos
            </strong>
            <small>
              Separá lo comunicado, lo constatado y las decisiones para
              conservar su alcance.
            </small>
          </div>
        </div>
        <div className="teamMeasuresGuardrail">
          <ShieldAlert size={20} aria-hidden="true" />
          <p>
            Esta sección no es una lista negra ni describe automáticamente la
            situación actual de una dirección. Cada dato conserva fuente,
            fecha y límites.
          </p>
        </div>
      </header>

      <div
        className="teamMeasuresTabs"
        role="tablist"
        aria-label="Secciones de medidas y antecedentes"
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${generatedId}-tab-${tab.id}`}
              aria-controls={`${generatedId}-panel-${tab.id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`teamMeasuresTab ${active ? "isActive" : ""}`}
              onClick={() => changeTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`${generatedId}-panel-panorama`}
        aria-labelledby={`${generatedId}-tab-panorama`}
        className="teamMeasuresPanel teamMeasuresPanorama"
        hidden={activeTab !== "panorama"}
      >
        <div className="teamMeasuresPanelHeading">
          <div>
            <span className="teamComposerKicker">Panorama responsable</span>
            <h3>Clausuras, incidentes y situaciones no registradas</h3>
          </div>
          <p>
            Los totales describen fuentes con fechas distintas; no forman un
            padrón nominal vigente.
          </p>
        </div>

        <dl className="teamMeasuresMetrics" aria-label="Datos de contexto">
          {METRICS.map((metric) => (
            <div className="teamMeasuresMetric" key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
              <small>{metric.note}</small>
            </div>
          ))}
        </dl>

        <div className="teamMeasuresContextNotice">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>
            <strong>Cómo interpretar los números:</strong> la Memoria Anual
            2024 también informa 785 intervenciones de la División de
            Regulación. No puede restarse el número de habilitados al universo
            de 1.481 y llamar “clandestinos” a todos los demás.
          </p>
        </div>

        <div
          className="teamMeasuresClassification"
          aria-label="Niveles de clasificación"
        >
          {CLASSIFICATIONS.map((classification, index) => (
            <article
              className="teamMeasuresClassificationCard"
              key={classification.title}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h4>{classification.title}</h4>
              <p>{classification.text}</p>
            </article>
          ))}
        </div>

        <div className="teamMeasuresFilters" role="search">
          <div className="teamMeasuresFilterHeading">
            <Filter size={18} aria-hidden="true" />
            <strong>Filtrar antecedentes</strong>
          </div>
          <div className="teamFieldGrid">
            <label className="teamField">
              <span>Buscar antecedente</span>
              <span className="teamMeasuresInputWithIcon">
                <Search size={17} aria-hidden="true" />
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Lugar, año, tipo o fuente"
                />
              </span>
            </label>
            <label className="teamField">
              <span>Tipo</span>
              <select
                value={historyType}
                onChange={(event) =>
                  setHistoryType(event.target.value as "" | AntecedentType)
                }
              >
                <option value="">Todos</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="teamField">
              <span>Nivel de fuente</span>
              <select
                value={historySource}
                onChange={(event) =>
                  setHistorySource(event.target.value as "" | SourceGroup)
                }
              >
                <option value="">Todos</option>
                <option value="official-admin">Oficial administrativa</option>
                <option value="official-judicial">Oficial judicial</option>
                <option value="press-authority">
                  Prensa con declaración de autoridad
                </option>
                <option value="press-ongoing">
                  Prensa · proceso en curso
                </option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="teamGhostButton teamMeasuresReset"
            onClick={resetHistoryFilters}
          >
            Ver todo
          </button>
        </div>

        <p className="teamMeasuresResultCount" aria-live="polite">
          {filteredAntecedents.length} antecedentes visibles · ubicaciones
          referenciales
        </p>

        <div className="teamMeasuresHistoryLayout">
          <div className="teamMeasuresHistoryList">
            {filteredAntecedents.length ? (
              filteredAntecedents.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className={`teamMeasuresHistoryItem ${
                    activeAntecedent?.id === record.id ? "isSelected" : ""
                  }`}
                  aria-pressed={activeAntecedent?.id === record.id}
                  onClick={() => setSelectedAntecedent(record.id)}
                >
                  <span
                    className={`teamMeasuresSource ${sourceTone(record.sourceGroup)}`}
                  >
                    {record.sourceLevel}
                  </span>
                  <strong>{record.title}</strong>
                  <small>
                    {record.status}
                    <br />
                    {record.location} · {record.date}
                  </small>
                </button>
              ))
            ) : (
              <div className="teamMeasuresEmpty" role="status">
                No hay antecedentes con esos filtros.
              </div>
            )}
          </div>

          {activeAntecedent ? (
            <article className="teamMeasuresHistoryDetail">
              <header>
                <div>
                  <span
                    className={`teamMeasuresSource ${sourceTone(activeAntecedent.sourceGroup)}`}
                  >
                    {activeAntecedent.sourceLevel}
                  </span>
                  <h3>{activeAntecedent.title}</h3>
                  <p>{activeAntecedent.status}</p>
                </div>
                <time dateTime={activeAntecedent.date}>
                  {activeAntecedent.date}
                </time>
              </header>
              <dl className="teamMeasuresDetailFacts">
                <div>
                  <dt>Ubicación</dt>
                  <dd>{activeAntecedent.location} · precisión referencial</dd>
                </div>
                <div>
                  <dt>Fuente</dt>
                  <dd>{activeAntecedent.sourceLabel}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>
                    {activeAntecedent.types
                      .map((type) => TYPE_LABELS[type])
                      .join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt>Ruta institucional</dt>
                  <dd>{activeAntecedent.route.join(" → ")}</dd>
                </div>
              </dl>
              <div className="teamMeasuresSupportedFacts">
                <strong>Hechos respaldados por la fuente</strong>
                <ul>
                  {activeAntecedent.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
              <div className="teamMeasuresCaution">
                <strong>Límite de la ficha:</strong>{" "}
                {activeAntecedent.caution}
              </div>
              <div className="teamMeasuresActions">
                <a
                  className="teamGhostButton"
                  href={activeAntecedent.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir fuente
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className="teamSaveButton"
                  onClick={() =>
                    onSaved(
                      `Escenario de capacitación preparado desde “${activeAntecedent.title}”.`,
                    )
                  }
                >
                  Usar como escenario de capacitación
                </button>
              </div>
            </article>
          ) : null}
        </div>

        <div className="teamMeasuresLocationCaution">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            <strong>Ubicación responsable:</strong> se muestra localidad o
            barrio, no una acusación sobre el ocupante actual de un inmueble.
            Una dirección histórica puede haber cambiado de operador o de uso.
          </p>
        </div>
      </section>

      <section
        role="tabpanel"
        id={`${generatedId}-panel-records`}
        aria-labelledby={`${generatedId}-tab-records`}
        className="teamMeasuresPanel teamMeasuresRecords"
        hidden={activeTab !== "records"}
      >
        <div className="teamMeasuresPanelHeading">
          <div>
            <span className="teamComposerKicker">Trazabilidad</span>
            <h3>Antecedentes administrativos nominales informados por MSP</h3>
          </div>
          <p>
            La respuesta oficial de 2022 identificó cuatro ELEPEM clausurados y
            32 residentes realojados, 24 mediante PACP. No describe
            necesariamente la actividad actual de esas direcciones.
          </p>
        </div>

        <div className="teamMeasuresTableWrap">
          <table className="teamMeasuresEvidenceTable">
            <caption>Clausuras administrativas históricas informadas en 2022</caption>
            <thead>
              <tr>
                <th scope="col">Nombre informado</th>
                <th scope="col">Tipo de dato</th>
                <th scope="col">Qué puede afirmarse</th>
                <th scope="col">Qué falta verificar hoy</th>
              </tr>
            </thead>
            <tbody>
              {CLOSURE_2022_NAMES.map((name) => (
                <tr key={name}>
                  <th scope="row">
                    {name}
                    <small>Nombre publicado en la respuesta de 2022</small>
                  </th>
                  <td>Clausura administrativa histórica</td>
                  <td>
                    El MSP lo incluyó entre los cuatro ELEPEM clausurados de la
                    respuesta.
                  </td>
                  <td>Operador, uso de la dirección y estado actual.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="teamMeasuresRules">
          <div className="teamMeasuresPanelHeading">
            <div>
              <span className="teamComposerKicker">Regla de evidencia</span>
              <h3>Cada registro dice algo distinto</h3>
            </div>
          </div>
          <dl>
            {EVIDENCE_RULES.map((rule) => (
              <div key={rule.title}>
                <dt>{rule.title}</dt>
                <dd>{rule.text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="teamMeasuresRecordCards">
          {HISTORICAL_ANTECEDENTS.slice(1).map((record) => (
            <article className="teamMeasuresRecordCard" key={record.id}>
              <span
                className={`teamMeasuresSource ${sourceTone(record.sourceGroup)}`}
              >
                {record.sourceLevel}
              </span>
              <h4>{record.title}</h4>
              <p>
                <strong>{record.status}</strong>
              </p>
              <ul>
                {record.facts.slice(0, 2).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <div className="teamMeasuresCaution">{record.caution}</div>
              <div className="teamMeasuresActions">
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() => openAntecedent(record.id)}
                >
                  Ver ficha
                </button>
                <a
                  href={record.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fuente
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        role="tabpanel"
        id={`${generatedId}-panel-register`}
        aria-labelledby={`${generatedId}-tab-register`}
        className="teamMeasuresPanel teamMeasuresRegister"
        hidden={activeTab !== "register"}
      >
        <div className="teamMeasuresPanelHeading">
          <div>
            <span className="teamComposerKicker">Resultado y decisión</span>
            <h3>Registrar sin confundir constatación y medida</h3>
          </div>
          <p>
            El primer formulario actualiza una verificación ficticia. El
            segundo registra un acto administrativo o judicial por separado.
          </p>
        </div>

        <div className="teamMeasuresRegisterGrid">
          <form
            className="teamMeasuresRegisterForm teamFlowGroup"
            onSubmit={saveVerification}
          >
            <div className="teamSectionLabel">
              <span>01</span>
              <div>
                <strong>Resultado de una verificación</strong>
                <small>
                  Solo modifica lugares ficticios de la capa institucional.
                </small>
              </div>
            </div>

            <label className="teamField">
              <span>Lugar pendiente</span>
              <select
                value={verificationPlaceId}
                onChange={(event) =>
                  setVerificationPlaceId(event.target.value)
                }
              >
                {verificationPlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name} · {place.statusStage}
                  </option>
                ))}
              </select>
            </label>

            <label className="teamField">
              <span>Resultado de la constatación</span>
              <select
                value={verificationOutcome}
                onChange={(event) =>
                  setVerificationOutcome(event.target.value)
                }
              >
                {VERIFICATION_OUTCOMES.map((outcome) => (
                  <option key={outcome}>{outcome}</option>
                ))}
              </select>
            </label>

            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Autoridad / equipo</span>
                <input
                  value={verificationAuthority}
                  onChange={(event) =>
                    setVerificationAuthority(event.target.value)
                  }
                />
              </label>
              <label className="teamField">
                <span>Fecha</span>
                <input
                  type="date"
                  value={verificationDate}
                  onChange={(event) =>
                    setVerificationDate(event.target.value)
                  }
                />
              </label>
            </div>

            <label className="teamField">
              <span>Actuación, expediente o referencia</span>
              <input
                value={verificationReference}
                onChange={(event) =>
                  setVerificationReference(event.target.value)
                }
                placeholder="Ej.: ACT-DEMO-2026-001"
              />
            </label>

            <label className="teamField teamNarrative">
              <span>Hechos constatados y límites</span>
              <textarea
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Distinguir observación directa, documentos, entrevistas y aspectos no verificados."
              />
            </label>

            <button className="teamSaveButton" type="submit">
              Guardar resultado ficticio
            </button>

            {verificationResult ? (
              <div className="teamSaved teamMeasuresInlineStatus" role="status">
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>
                  <strong>Resultado ficticio guardado.</strong>{" "}
                  {verificationResult}. La ficha mantiene el origen de la
                  alerta y la actuación que sustenta el cambio.
                </span>
              </div>
            ) : null}
          </form>

          <form
            className="teamMeasuresRegisterForm teamFlowGroup"
            onSubmit={saveMeasure}
          >
            <div className="teamSectionLabel">
              <span>02</span>
              <div>
                <strong>Registrar una medida</strong>
                <small>Acto administrativo o judicial, fuente y plazo.</small>
              </div>
            </div>

            <label className="teamField">
              <span>Establecimiento o antecedente</span>
              <select
                value={measureLinkedRecord}
                onChange={(event) =>
                  setMeasureLinkedRecord(event.target.value)
                }
              >
                {measureLinkedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Medida</span>
                <select
                  value={measureType}
                  onChange={(event) => setMeasureType(event.target.value)}
                >
                  {MEASURE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="teamField">
                <span>Organismo</span>
                <select
                  value={measureAuthority}
                  onChange={(event) => setMeasureAuthority(event.target.value)}
                >
                  {MEASURE_AUTHORITIES.map((authority) => (
                    <option key={authority}>{authority}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Fecha efectiva</span>
                <input
                  type="date"
                  value={measureDate}
                  onChange={(event) => setMeasureDate(event.target.value)}
                />
              </label>
              <label className="teamField">
                <span>Resolución / expediente</span>
                <input
                  value={measureReference}
                  onChange={(event) => setMeasureReference(event.target.value)}
                  placeholder="Número o enlace verificable"
                />
              </label>
            </div>

            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Residentes en el lugar</span>
                <input
                  type="number"
                  min="0"
                  value={measureResidents}
                  onChange={(event) => setMeasureResidents(event.target.value)}
                />
              </label>
              <label className="teamField">
                <span>Nuevos ingresos</span>
                <select
                  value={measureAdmissions}
                  onChange={(event) => setMeasureAdmissions(event.target.value)}
                >
                  {ADMISSION_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="teamField">
              <span>Próximo paso y plazo</span>
              <input
                value={measureNext}
                onChange={(event) => setMeasureNext(event.target.value)}
                placeholder="Ej.: realojo, corrección, nueva visita, informe a Fiscalía"
              />
            </label>

            <label className="teamField">
              <span>Nivel de fuente</span>
              <select
                value={measureSource}
                onChange={(event) => setMeasureSource(event.target.value)}
              >
                {SOURCE_LEVELS.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>

            <button className="teamSaveButton" type="submit">
              Agregar al expediente ficticio
            </button>
          </form>
        </div>

        <section
          className="teamMeasuresLoadedRecords"
          aria-labelledby={`${generatedId}-loaded-measures`}
        >
          <div className="teamMeasuresPanelHeading">
            <div>
              <span className="teamComposerKicker">Trazabilidad</span>
              <h3 id={`${generatedId}-loaded-measures`}>
                Medidas cargadas en esta demostración
              </h3>
            </div>
          </div>
          <div className="teamMeasuresLoadedList" aria-live="polite">
            {measures.map((measure) => (
              <article className="teamMeasuresLoadedItem" key={measure.id}>
                <header>
                  <div>
                    <span className="teamMeasuresMeasureType">
                      {measure.type}
                    </span>
                    <strong>{measure.linkedLabel}</strong>
                    <small>{measure.linked}</small>
                  </div>
                  <span
                    className={`teamMeasuresSource ${
                      measure.source.includes("DEMO")
                        ? "isPress"
                        : "isOfficial"
                    }`}
                  >
                    {measure.source}
                  </span>
                </header>
                <dl className="teamMeasuresDetailFacts">
                  <div>
                    <dt>Organismo y fecha</dt>
                    <dd>
                      {measure.authority} · {measure.date}
                    </dd>
                  </div>
                  <div>
                    <dt>Referencia</dt>
                    <dd>{measure.reference}</dd>
                  </div>
                  <div>
                    <dt>Residentes / ingresos</dt>
                    <dd>
                      {measure.residents} · {measure.admissions}
                    </dd>
                  </div>
                  <div>
                    <dt>Próximo paso</dt>
                    <dd>{measure.next}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section
        role="tabpanel"
        id={`${generatedId}-panel-relocation`}
        aria-labelledby={`${generatedId}-tab-relocation`}
        className="teamMeasuresPanel teamMeasuresRelocation"
        hidden={activeTab !== "relocation"}
      >
        <div className="teamMeasuresPanelHeading">
          <div>
            <span className="teamComposerKicker">
              El cierre no termina con la resolución
            </span>
            <h3>Plan de protección y realojo</h3>
          </div>
          <p>
            El seguimiento debe indicar cuántas personas continúan en el lugar,
            quién asumió cada cuidado, qué solución se obtuvo y si hubo contacto
            posterior.
          </p>
        </div>

        <dl
          className="teamMeasuresMetrics teamMeasuresRelocationMetrics"
          aria-label="Resumen del plan de realojo"
        >
          {relocationMetrics.map(([label, value]) => (
            <div className="teamMeasuresMetric" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="teamMeasuresRelocationToolbar">
          <label className="teamField">
            <span>Cierre o escenario</span>
            <select
              value={relocationClosure}
              onChange={(event) => setRelocationClosure(event.target.value)}
            >
              {relocationClosureOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="teamGhostButton"
            onClick={addRelocationPerson}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar persona ficticia
          </button>
        </div>

        {visibleRelocationPeople.length ? (
          <div className="teamMeasuresTableWrap">
            <table className="teamMeasuresRelocationTable">
              <caption>Personas incluidas en el plan ficticio seleccionado</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Dependencia y red</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {visibleRelocationPeople.map((person) => (
                  <tr key={person.code}>
                    <th scope="row">{person.code}</th>
                    <td>
                      <label className="teamMeasuresCellField">
                        <input
                          aria-label={`Dependencia de ${person.code}`}
                          value={person.dependency}
                          onChange={(event) =>
                            updateRelocationText(
                              person.code,
                              "dependency",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="teamMeasuresCellField">
                        <input
                          aria-label={`Red de apoyo de ${person.code}`}
                          value={person.network}
                          onChange={(event) =>
                            updateRelocationText(
                              person.code,
                              "network",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <label className="teamMeasuresCellField">
                        <input
                          aria-label={`Destino de ${person.code}`}
                          value={person.destination}
                          onChange={(event) =>
                            updateRelocationText(
                              person.code,
                              "destination",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <label className="teamMeasuresCellField">
                        <select
                          aria-label={`Estado de ${person.code}`}
                          value={person.status}
                          onChange={(event) =>
                            updateRelocationStatus(
                              person.code,
                              event.target.value as RelocationStatus,
                            )
                          }
                        >
                          {RELOCATION_STATUSES.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td>
                      <label className="teamMeasuresCellField">
                        <input
                          aria-label={`Seguimiento de ${person.code}`}
                          value={person.follow}
                          onChange={(event) =>
                            updateRelocationText(
                              person.code,
                              "follow",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teamMeasuresEmpty" role="status">
            Este antecedente no contiene personas reales. Agregá un registro
            ficticio para probar el módulo.
          </div>
        )}

        <div className="teamMeasuresTransferChecks">
          <fieldset>
            <legend>Antes del traslado</legend>
            {BEFORE_TRANSFER.map((item) => (
              <label className="teamMeasuresCheck" key={item.id}>
                <input
                  type="checkbox"
                  checked={Boolean(relocationChecks[item.id])}
                  onChange={() => toggleRelocationCheck(item.id)}
                />
                <span>{item.text}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Después del traslado</legend>
            {AFTER_TRANSFER.map((item) => (
              <label className="teamMeasuresCheck" key={item.id}>
                <input
                  type="checkbox"
                  checked={Boolean(relocationChecks[item.id])}
                  onChange={() => toggleRelocationCheck(item.id)}
                />
                <span>{item.text}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="teamMeasuresActions teamMeasuresRelocationActions">
          <button
            type="button"
            className="teamSaveButton"
            onClick={() =>
              onSaved(
                "Seguimiento ficticio de cierre y realojo guardado con sus verificaciones.",
              )
            }
          >
            Guardar seguimiento ficticio
          </button>
        </div>
      </section>
    </section>
  );
}
