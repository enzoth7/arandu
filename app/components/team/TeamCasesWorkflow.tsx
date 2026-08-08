"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Plus,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import "./TeamCasesWorkflow.css";

type WorkflowTab = "inbox" | "cases" | "tasks" | "dashboard" | "roles";
type IntakeStatus =
  | "Sin revisar"
  | "En triage"
  | "Convertida a caso"
  | "Vinculada a caso"
  | "Cerrada en recepción";
type CaseStatus =
  | "Pendiente"
  | "En evaluación"
  | "En actuación"
  | "En seguimiento"
  | "Cerrado";
type TaskStatus = "Pendiente" | "En curso" | "Completada";

const ROLE_NAMES = [
  "Recepción / captación",
  "Coordinación del servicio",
  "Trabajo Social",
  "Psicología",
  "Jurídica",
  "Supervisión",
  "Organismo derivado",
] as const;

type WorkRole = (typeof ROLE_NAMES)[number];

type TimelineItem = {
  at: string;
  text: string;
};

type WorkTask = {
  id: string;
  title: string;
  owner: WorkRole;
  due: string;
  status: TaskStatus;
  type: string;
  completedAt?: string;
};

type Referral = {
  id: string;
  destination: string;
  purpose: string;
  sent: string;
  due: string;
  status: "Pendiente de aceptación" | "Aceptada" | "Respondida";
  response: string;
};

type IntakeEntry = {
  id: string;
  occurredAt: string;
  registeredAt: string;
  channel: string;
  source: string;
  externalRef: string;
  importMode: string;
  status: IntakeStatus;
  urgency: string;
  setting: string;
  place: string;
  summary: string;
  privacy: string;
  safe: string;
  attachments: string;
  duplicateChecked: boolean;
  emergencyReviewed: boolean;
  scope: string;
  risk: string;
  linkedCase: string;
  receivedBy: string;
  followUp?: string;
  closure?: string;
};

type CaseRecord = {
  code: string;
  setting: string;
  priority: "Alta" | "Media" | "Baja";
  status: CaseStatus;
  place: string;
  reporter: string;
  alertOrigin: string;
  channel: string;
  receivedBy: string;
  primaryReferral: string;
  assignedTo: string;
  referralStatus: string;
  nextAction: string;
  age: string;
  dependency: string;
  needs: string[];
  concerns: string[];
  alleged: string;
  summary: string;
  safe: string;
  stage: string;
  ownerRole: WorkRole;
  scope: string;
  firstContact: string;
  personWill: string;
  contactAttempts: { at: string; kind: string; note: string; actor: string }[];
  referrals: Referral[];
  tasks: WorkTask[];
  closureReason: string;
  closureNote: string;
  externalEntries: string[];
  timeline: TimelineItem[];
};

type ManualIntakeDraft = {
  loadMode: string;
  occurredAt: string;
  channel: string;
  source: string;
  externalRef: string;
  setting: string;
  place: string;
  safe: string;
  summary: string;
  urgency: string;
  privacy: string;
  attachments: string;
};

const WORK_ROLES: Record<
  WorkRole,
  { actions: readonly string[]; limit: string }
> = {
  "Recepción / captación": {
    actions: [
      "Registrar entradas de todos los canales y preservar su fecha original.",
      "Conservar fuente, referencia externa, identidad y contacto seguro.",
      "Revisar emergencia y posibles duplicados antes de abrir un expediente.",
      "Convertir, vincular, orientar o redirigir la entrada.",
    ],
    limit:
      "No confirma por sí sola que hubo violencia ni sustituye una evaluación técnica.",
  },
  "Coordinación del servicio": {
    actions: [
      "Validar prioridad y alcance.",
      "Aceptar, reasignar y conformar el equipo interdisciplinario.",
      "Aprobar el plan y monitorear plazos.",
      "Escalar derivaciones sin respuesta y revisar cierres.",
    ],
    limit:
      "Organiza la respuesta sin borrar ni reescribir el relato original.",
  },
  "Trabajo Social": {
    actions: [
      "Valorar redes, convivencia, necesidades básicas y cuidados.",
      "Planificar intervenciones territoriales.",
      "Registrar apoyos, barreras y resultados.",
      "Participar en informes y seguimiento.",
    ],
    limit:
      "La voluntad de la persona y la confidencialidad atraviesan toda la intervención.",
  },
  Psicología: {
    actions: [
      "Valorar impacto emocional, autonomía, temor y riesgo.",
      "Construir estrategias de contacto y seguridad.",
      "Brindar orientación y apoyo psicosocial.",
      "Participar en el plan y su seguimiento.",
    ],
    limit:
      "El prototipo no automatiza diagnósticos ni presume incapacidad por edad.",
  },
  Jurídica: {
    actions: [
      "Brindar asesoramiento jurídico y registrar plazos.",
      "Explicar opciones y acompañar denuncias cuando corresponda.",
      "Preparar comunicaciones e informes.",
      "Coordinar con Policía, Fiscalía y defensa.",
    ],
    limit:
      "La plataforma no presenta denuncias ni decide medidas jurídicas automáticamente.",
  },
  Supervisión: {
    actions: [
      "Monitorear casos críticos, vencimientos y carga de trabajo.",
      "Revisar derivaciones sin respuesta.",
      "Aprobar cierres sensibles o reaperturas.",
      "Auditar accesos y modificaciones.",
    ],
    limit:
      "La trazabilidad no habilita acceso indiscriminado a datos sensibles.",
  },
  "Organismo derivado": {
    actions: [
      "Aceptar, rechazar con fundamento o redirigir una derivación.",
      "Solicitar la información adicional mínima.",
      "Registrar actuación, resultado y fecha.",
      "Mantener corresponsabilidad o devolver al equipo coordinador.",
    ],
    limit:
      "Solo accede al paquete de información pertinente a su competencia.",
  },
};

const CHANNEL_OPTIONS = [
  "Teléfono",
  "WhatsApp",
  "Correo electrónico",
  "Atención presencial",
  "Formulario web / app",
  "UCAT / central telefónica",
  "Policlínica o prestador de salud",
  "Policía / 911",
  "Derivación institucional",
  "Otro",
];

const SETTING_OPTIONS = [
  "Domicilio o comunidad",
  "ELEPEM",
  "Otro servicio",
  "No se sabe",
];

const URGENCY_OPTIONS = [
  "No evaluada",
  "Posible emergencia actual",
  "Alta",
  "Media",
  "Baja",
];

const PRIVACY_OPTIONS = [
  "Confidencial",
  "Anónima",
  "Identificada",
  "No se registró",
];

const SCOPE_OPTIONS = [
  "Pendiente",
  "Dentro del alcance propuesto",
  "Requiere orientación a otro servicio",
  "No corresponde al servicio",
];

const CASE_SCOPE_OPTIONS = [
  "Pendiente de confirmar",
  "Dentro del alcance propuesto",
  "Requiere orientación a otro servicio",
  "No corresponde al servicio",
];

const ORGANIZATIONS = [
  "Inmayores / MIDES",
  "Secretaría de Personas Mayores IM",
  "MSP · Sector ELEPEM",
  "Policía / Fiscalía",
  "Sistema de Cuidados",
  "Prestador de salud",
  "Bomberos",
  "Dirección Departamental de Salud",
  "Servicios territoriales",
];

const TASK_OPTIONS = [
  "Primer contacto / entrevista",
  "Valoración de riesgo",
  "Orientación social y recursos",
  "Apoyo psicosocial",
  "Asesoramiento jurídico",
  "Intervención territorial",
  "Acompañamiento para denuncia",
  "Elaborar informe interdisciplinario",
  "Coordinar con otro organismo",
  "Solicitar valoración de dependencia y cuidados",
  "Preparar visita a domicilio",
  "Preparar inspección ELEPEM",
  "Seguimiento acordado",
];

const TABS: {
  id: WorkflowTab;
  label: string;
  Icon: typeof Inbox;
}[] = [
  { id: "inbox", label: "Entradas nuevas", Icon: Inbox },
  { id: "cases", label: "Casos y plan", Icon: FolderKanban },
  { id: "tasks", label: "Mis tareas", Icon: ListTodo },
  { id: "dashboard", label: "Tablero", Icon: LayoutDashboard },
  { id: "roles", label: "Roles", Icon: UsersRound },
];

const SEED_ENTRIES: IntakeEntry[] = [
  {
    id: "ENT-3101",
    occurredAt: "2026-07-26T09:15",
    registeredAt: "2026-07-26T09:18",
    channel: "Policía / 911",
    source: "Seccional policial · derivación ficticia",
    externalRef: "ACT-DEMO-7841",
    importMode: "Automática simulada",
    status: "Sin revisar",
    urgency: "Posible emergencia actual",
    setting: "Domicilio o comunidad",
    place: "Municipio F · ubicación protegida",
    summary:
      "Llamado institucional ficticio: se solicita contacto social por una persona mayor hallada sola, desorientada y sin alimentos suficientes.",
    privacy: "Identificada ante el organismo de origen",
    safe: "Coordinar primero con el equipo policial interviniente",
    attachments: "Parte de actuación ficticio",
    duplicateChecked: false,
    emergencyReviewed: false,
    scope: "Pendiente",
    risk: "No evaluado",
    linkedCase: "",
    receivedBy: "Bandeja interoperable DEMO",
  },
  {
    id: "ENT-3102",
    occurredAt: "2026-07-26T10:02",
    registeredAt: "2026-07-26T10:02",
    channel: "WhatsApp",
    source: "Familiar",
    externalRef: "WA-DEMO-552",
    importMode: "Automática simulada",
    status: "Sin revisar",
    urgency: "Media",
    setting: "ELEPEM",
    place: "Nombre comercial informado · dirección pendiente",
    summary:
      "Mensaje ficticio: una familiar refiere que no logra hablar en privado con su madre y que el establecimiento usa otra dirección para algunas visitas.",
    privacy: "Confidencial",
    safe: "Responder solo por WhatsApp; no llamar al establecimiento",
    attachments: "2 imágenes ficticias",
    duplicateChecked: false,
    emergencyReviewed: false,
    scope: "Pendiente",
    risk: "No evaluado",
    linkedCase: "",
    receivedBy: "Canal WhatsApp DEMO",
  },
  {
    id: "ENT-3103",
    occurredAt: "2026-07-25T16:40",
    registeredAt: "2026-07-26T08:55",
    channel: "Policlínica o prestador de salud",
    source: "Profesional de salud",
    externalRef: "CORREO-DEMO-91",
    importMode: "Carga posterior",
    status: "En triage",
    urgency: "Alta",
    setting: "Domicilio o comunidad",
    place: "Municipio C · ubicación protegida",
    summary:
      "Correo ficticio: el equipo de salud refiere omisiones reiteradas de medicación y posible sobrecarga de la persona cuidadora.",
    privacy: "Institucional",
    safe: "Contactar a la persona mayor en horario de policlínica",
    attachments: "Nota clínica resumida ficticia",
    duplicateChecked: true,
    emergencyReviewed: true,
    scope: "Dentro del alcance propuesto",
    risk: "Alto",
    linkedCase: "",
    receivedBy: "Recepción / captación",
  },
  {
    id: "ENT-3104",
    occurredAt: "2026-07-24T13:05",
    registeredAt: "2026-07-24T13:07",
    channel: "Formulario web / app",
    source: "Vecina",
    externalRef: "WEB-DEMO-301",
    importMode: "Automática simulada",
    status: "Convertida a caso",
    urgency: "Alta",
    setting: "Domicilio o comunidad",
    place: "Municipio D · ubicación protegida",
    summary:
      "Entrada ficticia ya convertida: falta de alimentos y posible uso indebido de la pensión.",
    privacy: "Confidencial",
    safe: "No llamar por la mañana",
    attachments: "Sin adjuntos",
    duplicateChecked: true,
    emergencyReviewed: true,
    scope: "Dentro del alcance propuesto",
    risk: "Alto",
    linkedCase: "DEM-2401",
    receivedBy: "Formulario web DEMO",
  },
];

const SEED_CASES: CaseRecord[] = [
  {
    code: "DEM-2401",
    setting: "Domicilio o comunidad",
    priority: "Alta",
    status: "Pendiente",
    place: "Municipio D · ubicación protegida",
    reporter: "Vecina · confidencial",
    alertOrigin: "Vecina",
    channel: "Formulario web / app",
    receivedBy: "Formulario web DEMO",
    primaryReferral: "Inmayores / MIDES",
    assignedTo: "Sin asignar",
    referralStatus: "Pendiente de aceptación",
    nextAction: "Revisar urgencia y contacto seguro",
    age: "80 a 84 años",
    dependency: "Dependencia severa referida",
    needs: ["Alimentación", "Movilidad", "Medicamentos", "Manejo de dinero"],
    concerns: ["Posible abuso patrimonial", "Negligencia o abandono"],
    alleged: "Hijo o hija",
    summary:
      "Una vecina refiere que una mujer de 83 años no recibe alimentos regularmente y que su hijo administra la pensión.",
    safe: "No llamar al domicilio por la mañana",
    stage: "Consulta / alerta",
    ownerRole: "Coordinación del servicio",
    scope: "Pendiente de confirmar",
    firstContact: "Pendiente",
    personWill: "Pendiente de registrar",
    contactAttempts: [],
    referrals: [],
    tasks: [
      {
        id: "TASK-2401-1",
        title: "Revisar ingreso, urgencia y contacto seguro",
        owner: "Recepción / captación",
        due: "2026-07-27",
        status: "Pendiente",
        type: "Triage",
      },
    ],
    closureReason: "",
    closureNote: "",
    externalEntries: ["ENT-3104"],
    timeline: [
      { at: "Hoy 10:12", text: "Consulta recibida" },
      { at: "Hoy 10:18", text: "Riesgo preliminar alto; pendiente de aceptación" },
    ],
  },
  {
    code: "DEM-2402",
    setting: "Domicilio o comunidad",
    priority: "Media",
    status: "En evaluación",
    place: "Municipio CH · ubicación protegida",
    reporter: "Persona afectada · identificada",
    alertOrigin: "La propia persona",
    channel: "Teléfono",
    receivedBy: "Recepción / captación",
    primaryReferral: "Inmayores / MIDES",
    assignedTo: "Inmayores / MIDES",
    referralStatus: "Aceptada",
    nextAction: "Confirmar primer contacto",
    age: "75 a 79 años",
    dependency: "Dependencia moderada",
    needs: ["Higiene", "Compras y trámites"],
    concerns: ["Maltrato psicológico", "Uso indebido de dinero o documentos"],
    alleged: "Cuidador/a remunerado/a",
    summary:
      "La persona refiere insultos y movimientos de dinero que no reconoce.",
    safe: "Contacto por persona de confianza",
    stage: "Consulta aceptada",
    ownerRole: "Trabajo Social",
    scope: "Dentro del alcance propuesto",
    firstContact: "Realizado o coordinado",
    personWill: "Desea continuar",
    contactAttempts: [],
    referrals: [],
    tasks: [
      {
        id: "TASK-2402-1",
        title: "Realizar entrevista de evaluación",
        owner: "Trabajo Social",
        due: "2026-07-28",
        status: "Pendiente",
        type: "Contacto",
      },
    ],
    closureReason: "",
    closureNote: "",
    externalEntries: [],
    timeline: [
      { at: "Ayer 15:40", text: "Consulta recibida" },
      { at: "Hoy 09:15", text: "Contacto seguro coordinado" },
    ],
  },
  {
    code: "DEM-2403",
    setting: "ELEPEM",
    priority: "Alta",
    status: "En actuación",
    place: "ELEPEM ficticio vinculado a un registro de demostración",
    reporter: "Trabajador/a · confidencial",
    alertOrigin: "Trabajador",
    channel: "WhatsApp",
    receivedBy: "Recepción / captación",
    primaryReferral: "MSP · Sector ELEPEM",
    assignedTo: "MSP · Sector ELEPEM",
    referralStatus: "Aceptada",
    nextAction: "Preparar visita sin aviso",
    age: "Múltiples residentes",
    dependency: "Múltiples residentes",
    needs: ["Supervisión", "Medicamentos"],
    concerns: ["Falta de personal", "Accidentes o lesiones"],
    alleged: "Personal o responsable del servicio",
    summary:
      "Durante la noche habría una sola persona cuidadora y varias caídas no registradas.",
    safe: "No contactar a la dirección antes de entrevistar al trabajador",
    stage: "Incidente en constatación",
    ownerRole: "Supervisión",
    scope: "Dentro del alcance propuesto",
    firstContact: "Realizado con quien consultó",
    personWill: "No fue posible conocerla",
    contactAttempts: [],
    referrals: [
      {
        id: "REF-2403-1",
        destination: "MSP · Sector ELEPEM",
        purpose: "Inspección dentro de su competencia",
        sent: "2026-07-25",
        due: "2026-07-28",
        status: "Aceptada",
        response: "Visita en coordinación",
      },
    ],
    tasks: [
      {
        id: "TASK-2403-1",
        title: "Preparar inspección ELEPEM",
        owner: "Supervisión",
        due: "2026-07-28",
        status: "En curso",
        type: "Visita",
      },
    ],
    closureReason: "",
    closureNote: "",
    externalEntries: [],
    timeline: [
      { at: "Hace 2 días", text: "Alerta recibida" },
      { at: "Ayer", text: "Visita sin aviso agendada" },
    ],
  },
  {
    code: "DEM-2404",
    setting: "Otro servicio",
    priority: "Baja",
    status: "Cerrado",
    place: "Centro de día ficticio · Montevideo",
    reporter: "Familiar · identificada",
    alertOrigin: "Familiar",
    channel: "Atención presencial",
    receivedBy: "Servicios territoriales",
    primaryReferral: "Sistema de Cuidados",
    assignedTo: "Servicios territoriales",
    referralStatus: "Respondida",
    nextAction: "Sin tarea activa",
    age: "65 a 69 años",
    dependency: "Dependencia leve",
    needs: ["Transporte"],
    concerns: ["Dificultad de acceso a servicios"],
    alleged: "No hay una persona identificada",
    summary:
      "Dificultad de traslado que inicialmente se presentó como abandono.",
    safe: "Llamada",
    stage: "Cerrado / archivado",
    ownerRole: "Trabajo Social",
    scope: "Requiere orientación a otro servicio",
    firstContact: "Realizado con quien consultó",
    personWill: "Desea orientación, no denuncia",
    contactAttempts: [],
    referrals: [],
    tasks: [
      {
        id: "TASK-2404-1",
        title: "Confirmar acceso al recurso territorial",
        owner: "Trabajo Social",
        due: "2026-07-22",
        status: "Completada",
        type: "Seguimiento",
        completedAt: "2026-07-22",
      },
    ],
    closureReason: "Resolución / derivación aceptada",
    closureNote: "Derivación territorial aceptada y explicada.",
    externalEntries: [],
    timeline: [
      { at: "Hace 12 días", text: "Consulta recibida" },
      { at: "Hace 5 días", text: "Caso cerrado con explicación" },
    ],
  },
  {
    code: "DEM-2405",
    setting: "ELEPEM",
    priority: "Alta",
    status: "Pendiente",
    place: "Lugar reportado A · Municipio D",
    reporter: "Vecina · confidencial",
    alertOrigin: "Vecina",
    channel: "Formulario web / app",
    receivedBy: "Equipo coordinador de protección",
    primaryReferral: "MSP · Sector ELEPEM",
    assignedTo: "Sin asignar",
    referralStatus: "Pendiente de aceptación",
    nextAction: "Buscar coincidencias por nombre, dirección y titular",
    age: "Múltiples residentes",
    dependency: "No sabe",
    needs: ["Supervisión para estar segura"],
    concerns: [
      "El establecimiento no figura o el dato no coincide",
      "Posible restricción de contacto",
    ],
    alleged: "Personal o responsable de un servicio",
    summary:
      "Una vecina refiere que varias personas mayores viven en una casa no identificada en los listados públicos y escucha pedidos de ayuda.",
    safe: "No contactar primero al lugar reportado",
    stage: "Lugar pendiente de verificación",
    ownerRole: "Coordinación del servicio",
    scope: "Pendiente de confirmar",
    firstContact: "Pendiente",
    personWill: "Pendiente de registrar",
    contactAttempts: [],
    referrals: [
      {
        id: "REF-2405-1",
        destination: "MSP · Sector ELEPEM",
        purpose: "Verificar identidad y situación administrativa",
        sent: "2026-07-26",
        due: "2026-07-29",
        status: "Pendiente de aceptación",
        response: "",
      },
    ],
    tasks: [
      {
        id: "TASK-2405-1",
        title: "Revisar lugar, urgencia y contacto seguro",
        owner: "Recepción / captación",
        due: "2026-07-27",
        status: "Pendiente",
        type: "Triage",
      },
    ],
    closureReason: "",
    closureNote: "",
    externalEntries: [],
    timeline: [
      { at: "Hoy 11:20", text: "Alerta ficticia recibida" },
      { at: "Hoy 11:25", text: "Derivación pendiente de aceptación" },
    ],
  },
];

function freshManualDraft(): ManualIntakeDraft {
  return {
    loadMode: "En el momento",
    occurredAt: "",
    channel: "Teléfono",
    source: "",
    externalRef: "",
    setting: "Domicilio o comunidad",
    place: "",
    safe: "",
    summary: "",
    urgency: "No evaluada",
    privacy: "Confidencial",
    attachments: "",
  };
}

function localDateTimeValue() {
  const date = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(
    date.getDate(),
  )}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

function datePlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function auditTime() {
  return new Date().toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function cloneSeedCases() {
  return SEED_CASES.map((record) => ({
    ...record,
    needs: [...record.needs],
    concerns: [...record.concerns],
    contactAttempts: record.contactAttempts.map((attempt) => ({ ...attempt })),
    referrals: record.referrals.map((referral) => ({ ...referral })),
    tasks: record.tasks.map((task) => ({ ...task })),
    externalEntries: [...record.externalEntries],
    timeline: record.timeline.map((item) => ({ ...item })),
  }));
}

function phaseFor(record: CaseRecord) {
  if (record.status === "Cerrado") return 6;
  if (record.status === "En seguimiento") return 5;
  if (record.status === "En actuación") return 4;
  if (record.status === "En evaluación") return 3;
  if (record.assignedTo !== "Sin asignar") return 2;
  return 1;
}

function suggestedDestination(entry: IntakeEntry) {
  if (entry.setting === "ELEPEM") return "MSP · Sector ELEPEM";
  if (
    /policía|911/i.test(entry.channel) ||
    /violencia|amenaza|agresión|abuso sexual|dinero/i.test(entry.summary)
  ) {
    return "Inmayores / MIDES";
  }
  if (/salud|medicaci|desorient|alimentos|cuidad/i.test(entry.summary)) {
    return "Inmayores / MIDES";
  }
  return "Secretaría de Personas Mayores IM";
}

function entryIcon(channel: string) {
  if (/whatsapp/i.test(channel)) return "💬";
  if (/policía|911/i.test(channel)) return "🚓";
  if (/salud|policlínica/i.test(channel)) return "🩺";
  if (/teléfono/i.test(channel)) return "☎️";
  if (/correo/i.test(channel)) return "✉️";
  if (/presencial/i.test(channel)) return "👥";
  return "📥";
}

export function TeamCasesWorkflow({
  onSaved,
}: {
  onSaved: (message: string) => void;
}) {
  const sequence = useRef(7000);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("inbox");
  const [role, setRole] = useState<WorkRole>("Recepción / captación");
  const [actor, setActor] = useState("Equipo de demostración");
  const [entries, setEntries] = useState<IntakeEntry[]>(() =>
    SEED_ENTRIES.map((entry) => ({ ...entry })),
  );
  const [cases, setCases] = useState<CaseRecord[]>(cloneSeedCases);
  const [standaloneTasks, setStandaloneTasks] = useState<
    (WorkTask & { recordId: string })[]
  >([]);
  const [selectedEntryId, setSelectedEntryId] = useState("ENT-3101");
  const [selectedCaseId, setSelectedCaseId] = useState("DEM-2401");
  const [entrySearch, setEntrySearch] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [caseSetting, setCaseSetting] = useState("");
  const [caseStatus, setCaseStatus] = useState("");
  const [caseSource, setCaseSource] = useState("");
  const [caseDestination, setCaseDestination] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] =
    useState<ManualIntakeDraft>(freshManualDraft);
  const [linkTarget, setLinkTarget] = useState("DEM-2401");
  const [entryClosure, setEntryClosure] = useState("");
  const [contactKind, setContactKind] = useState(
    "Llamada a la persona afectada",
  );
  const [contactNote, setContactNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState(TASK_OPTIONS[0]);
  const [newTaskOwner, setNewTaskOwner] =
    useState<WorkRole>("Trabajo Social");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [otherAction, setOtherAction] = useState("");
  const [referralDestination, setReferralDestination] = useState(
    ORGANIZATIONS[0],
  );
  const [referralPurpose, setReferralPurpose] = useState("");
  const [referralDue, setReferralDue] = useState("");
  const [taskOwnerFilter, setTaskOwnerFilter] = useState("");
  const [taskStateFilter, setTaskStateFilter] = useState("");
  const [taskTodayOnly, setTaskTodayOnly] = useState(false);
  const [localMessage, setLocalMessage] = useState("");

  const nextId = (prefix: string) => `${prefix}-${++sequence.current}`;
  const auditActor = `${role} · ${actor.trim() || "Equipo de demostración"}`;
  const announce = (message: string) => {
    setLocalMessage(message);
    onSaved(message);
  };

  const patchEntry = (id: string, patch: Partial<IntakeEntry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const patchCase = (code: string, patch: Partial<CaseRecord>) => {
    setCases((current) =>
      current.map((record) =>
        record.code === code ? { ...record, ...patch } : record,
      ),
    );
  };

  const mutateCase = (
    code: string,
    mutate: (record: CaseRecord) => CaseRecord,
  ) => {
    setCases((current) =>
      current.map((record) => (record.code === code ? mutate(record) : record)),
    );
  };

  const auditItem = (text: string): TimelineItem => ({
    at: auditTime(),
    text: `${auditActor}: ${text}`,
  });

  const currentEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const currentCase =
    cases.find((record) => record.code === selectedCaseId) ?? cases[0];

  const filteredEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase();
    return entries.filter((entry) => {
      const haystack = [
        entry.id,
        entry.channel,
        entry.source,
        entry.place,
        entry.summary,
        entry.externalRef,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!entryStatus || entry.status === entryStatus)
      );
    });
  }, [entries, entrySearch, entryStatus]);

  const filteredCases = useMemo(() => {
    const query = caseSearch.trim().toLowerCase();
    return cases.filter((record) => {
      const haystack = [
        record.code,
        record.place,
        record.summary,
        record.alertOrigin,
        record.primaryReferral,
        ...record.concerns,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!caseSetting || record.setting === caseSetting) &&
        (!caseStatus || record.status === caseStatus) &&
        (!caseSource || record.alertOrigin.includes(caseSource)) &&
        (!caseDestination ||
          record.primaryReferral.includes(caseDestination))
      );
    });
  }, [
    cases,
    caseDestination,
    caseSearch,
    caseSetting,
    caseSource,
    caseStatus,
  ]);

  const allTasks = useMemo(
    () => [
      ...cases.flatMap((record) =>
        record.tasks.map((task) => ({
          ...task,
          recordId: record.code,
          source: "case" as const,
          place: record.place,
        })),
      ),
      ...standaloneTasks.map((task) => ({
        ...task,
        source: "entry" as const,
        place:
          entries.find((entry) => entry.id === task.recordId)?.place ??
          "Ubicación pendiente",
      })),
    ],
    [cases, entries, standaloneTasks],
  );

  const visibleTasks = useMemo(() => {
    const today = datePlus(0);
    return allTasks
      .filter(
        (task) =>
          (!taskOwnerFilter || task.owner === taskOwnerFilter) &&
          (!taskStateFilter
            ? task.status !== "Completada"
            : task.status === taskStateFilter) &&
          (!taskTodayOnly || task.due <= today),
      )
      .sort((left, right) => left.due.localeCompare(right.due));
  }, [allTasks, taskOwnerFilter, taskStateFilter, taskTodayOnly]);

  const openManual = (prefill: Partial<ManualIntakeDraft> = {}) => {
    setManualDraft({
      ...freshManualDraft(),
      occurredAt: localDateTimeValue(),
      ...prefill,
    });
    setManualOpen(true);
  };

  const saveManualEntry = () => {
    const now = localDateTimeValue();
    const id = nextId("ENT");
    const entry: IntakeEntry = {
      id,
      occurredAt: manualDraft.occurredAt || now,
      registeredAt: now,
      channel: manualDraft.channel,
      source: manualDraft.source.trim() || "Fuente no identificada",
      externalRef:
        manualDraft.externalRef.trim() || "Sin referencia externa",
      importMode: manualDraft.loadMode,
      status: "Sin revisar",
      urgency: manualDraft.urgency,
      setting: manualDraft.setting,
      place: manualDraft.place.trim() || "Ubicación pendiente",
      summary: manualDraft.summary.trim() || "Entrada ficticia sin detalle",
      privacy: manualDraft.privacy,
      safe: manualDraft.safe.trim() || "Pendiente de registrar",
      attachments: manualDraft.attachments.trim() || "Sin adjuntos",
      duplicateChecked: false,
      emergencyReviewed: false,
      scope: "Pendiente",
      risk: "No evaluado",
      linkedCase: "",
      receivedBy: auditActor,
    };
    setEntries((current) => [entry, ...current]);
    setSelectedEntryId(id);
    setManualOpen(false);
    announce(`${id} quedó guardada en la bandeja para revisión humana.`);
  };

  const simulateEntry = (kind: "whatsapp" | "police" | "health") => {
    const templates = {
      whatsapp: {
        channel: "WhatsApp",
        source: "Vecino/a",
        urgency: "Media",
        setting: "Domicilio o comunidad",
        place: "Zona protegida · Montevideo",
        summary:
          "Mensaje ficticio importado: una vecina escucha pedidos de ayuda y refiere dificultades para comer y movilizarse.",
        privacy: "Confidencial",
        safe: "Responder solo por mensaje",
        attachments: "1 audio ficticio",
        receivedBy: "Conector WhatsApp DEMO",
      },
      police: {
        channel: "Policía / 911",
        source: "Unidad policial",
        urgency: "Posible emergencia actual",
        setting: "Domicilio o comunidad",
        place: "Ubicación protegida comunicada por la Policía",
        summary:
          "Derivación policial ficticia: se solicita seguimiento social luego de encontrar a una persona mayor sin red inmediata.",
        privacy: "Institucional",
        safe: "Coordinar con la unidad que intervino",
        attachments: "Parte ficticio",
        receivedBy: "Interoperabilidad policial DEMO",
      },
      health: {
        channel: "Policlínica o prestador de salud",
        source: "Equipo de salud",
        urgency: "Alta",
        setting: "Domicilio o comunidad",
        place: "Zona protegida · Canelones",
        summary:
          "Correo ficticio importado: se informan dificultades para la medicación y sobrecarga de la persona referente.",
        privacy: "Institucional",
        safe: "Contacto durante consulta programada",
        attachments: "Nota de derivación ficticia",
        receivedBy: "Buzón institucional DEMO",
      },
    } as const;
    const template = templates[kind];
    const now = localDateTimeValue();
    const id = nextId("ENT");
    setEntries((current) => [
      {
        id,
        occurredAt: now,
        registeredAt: now,
        externalRef: `${kind.toUpperCase()}-DEMO-${sequence.current}`,
        importMode: "Automática simulada",
        status: "Sin revisar",
        duplicateChecked: false,
        emergencyReviewed: false,
        scope: "Pendiente",
        risk: "No evaluado",
        linkedCase: "",
        ...template,
      },
      ...current,
    ]);
    setSelectedEntryId(id);
    announce(`${id} se importó como simulación de ${template.channel}.`);
  };

  const saveTriage = () => {
    if (!currentEntry) return;
    if (
      currentEntry.status === "Convertida a caso" ||
      currentEntry.status === "Vinculada a caso" ||
      currentEntry.status === "Cerrada en recepción"
    ) {
      announce(
        `${currentEntry.id} conserva su estado final; el triage no fue reabierto.`,
      );
      return;
    }
    patchEntry(currentEntry.id, { status: "En triage" });
    announce(`Triage de ${currentEntry.id} guardado con trazabilidad.`);
  };

  const convertEntry = () => {
    if (!currentEntry) return;
    if (
      currentEntry.status === "Convertida a caso" ||
      currentEntry.status === "Vinculada a caso"
    ) {
      announce(`${currentEntry.id} ya está vinculada a un expediente.`);
      return;
    }
    const code = `DEMO-${100000 + sequence.current++}`;
    const destination = suggestedDestination(currentEntry);
    const priority: CaseRecord["priority"] =
      currentEntry.risk === "Alto" ||
      /emergencia|alta/i.test(currentEntry.urgency)
        ? "Alta"
        : currentEntry.risk === "Medio" || currentEntry.urgency === "Media"
          ? "Media"
          : "Baja";
    const record: CaseRecord = {
      code,
      setting:
        currentEntry.setting === "No se sabe"
          ? "Domicilio o comunidad"
          : currentEntry.setting,
      priority,
      status: "Pendiente",
      place: currentEntry.place || "Ubicación protegida",
      reporter: `${currentEntry.source} · ${currentEntry.privacy.toLowerCase()}`,
      alertOrigin: currentEntry.source,
      channel: currentEntry.channel,
      receivedBy: currentEntry.receivedBy,
      primaryReferral: destination,
      assignedTo: "Sin asignar",
      referralStatus: "Pendiente de aceptación",
      nextAction: "Asignar responsable y realizar primer contacto seguro",
      age: "No sabe",
      dependency: "No sabe",
      needs: [],
      concerns: ["Preocupación comunicada por canal externo"],
      alleged: "No sabe",
      summary: currentEntry.summary,
      safe: currentEntry.safe || "Pendiente de registrar",
      stage: "Consulta / alerta",
      ownerRole: "Coordinación del servicio",
      scope:
        currentEntry.scope === "Pendiente"
          ? "Pendiente de confirmar"
          : currentEntry.scope,
      firstContact: "Pendiente",
      personWill: "Pendiente de registrar",
      contactAttempts: [],
      referrals: [],
      tasks: [
        {
          id: nextId("TASK"),
          title: `Confirmar urgencia y contacto seguro de ${currentEntry.id}`,
          owner: "Recepción / captación",
          due: datePlus(0),
          status: "Pendiente",
          type: "Triage",
        },
      ],
      closureReason: "",
      closureNote: "",
      externalEntries: [currentEntry.id],
      timeline: [
        auditItem(`Entrada ${currentEntry.id} convertida en expediente`),
      ],
    };
    setCases((current) => [record, ...current]);
    patchEntry(currentEntry.id, {
      status: "Convertida a caso",
      linkedCase: code,
    });
    setSelectedCaseId(code);
    setLinkTarget(code);
    setActiveTab("cases");
    announce(
      `${currentEntry.id} se convirtió en ${code}; el registro original se conserva.`,
    );
  };

  const linkEntry = () => {
    if (!currentEntry) return;
    const target = cases.find((record) => record.code === linkTarget);
    if (!target) {
      announce("Elegí un expediente válido antes de vincular.");
      return;
    }
    patchEntry(currentEntry.id, {
      status: "Vinculada a caso",
      linkedCase: target.code,
    });
    mutateCase(target.code, (record) => ({
      ...record,
      externalEntries: Array.from(
        new Set([...record.externalEntries, currentEntry.id]),
      ),
      timeline: [
        ...record.timeline,
        auditItem(
          `Se vinculó ${currentEntry.id} (${currentEntry.channel}, ${currentEntry.externalRef})`,
        ),
      ],
    }));
    setSelectedCaseId(target.code);
    setActiveTab("cases");
    announce(`${currentEntry.id} se vinculó a ${target.code} sin duplicar.`);
  };

  const requestMoreInformation = () => {
    if (!currentEntry) return;
    const task: WorkTask & { recordId: string } = {
      id: nextId("TASK"),
      recordId: currentEntry.id,
      title: "Solicitar información adicional y confirmar contacto seguro",
      owner: "Recepción / captación",
      due: datePlus(1),
      status: "Pendiente",
      type: "Contacto",
    };
    patchEntry(currentEntry.id, {
      status: "En triage",
      followUp: `Solicitud creada por ${auditActor} · ${auditTime()}`,
    });
    setStandaloneTasks((current) => [task, ...current]);
    announce(
      `Se creó una tarea de contacto para ampliar ${currentEntry.id}.`,
    );
  };

  const closeEntry = () => {
    if (!currentEntry) return;
    if (!entryClosure.trim()) {
      announce("Escribí el motivo y el recurso indicado antes de cerrar.");
      return;
    }
    patchEntry(currentEntry.id, {
      status: "Cerrada en recepción",
      closure: entryClosure.trim(),
    });
    setEntryClosure("");
    announce(`${currentEntry.id} se cerró en recepción con motivo registrado.`);
  };

  const saveAssessment = () => {
    if (!currentCase) return;
    mutateCase(currentCase.code, (record) => ({
      ...record,
      nextAction: "Ejecutar tareas del plan y registrar resultados",
      timeline: [
        ...record.timeline,
        auditItem("Se actualizó triage, alcance y asignación"),
      ],
    }));
    announce(`Evaluación y asignación de ${currentCase.code} guardadas.`);
  };

  const acceptCase = () => {
    if (!currentCase) return;
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status: "En evaluación",
      stage: "Consulta aceptada",
      assignedTo:
        record.assignedTo === "Sin asignar"
          ? record.primaryReferral
          : record.assignedTo,
      referralStatus: `Aceptada por ${
        record.assignedTo === "Sin asignar"
          ? record.primaryReferral
          : record.assignedTo
      }`,
      nextAction: "Realizar primer contacto y acordar plan",
      timeline: [
        ...record.timeline,
        auditItem("El equipo asumió el expediente"),
      ],
    }));
    announce(`${currentCase.code} fue asumido para evaluación.`);
  };

  const saveContact = () => {
    if (!currentCase) return;
    if (!contactNote.trim()) {
      announce("Registrá un resultado breve antes de guardar el contacto.");
      return;
    }
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status:
        record.status === "Pendiente" ? "En evaluación" : record.status,
      contactAttempts: [
        ...record.contactAttempts,
        {
          at: auditTime(),
          kind: contactKind,
          note: contactNote.trim(),
          actor: auditActor,
        },
      ],
      nextAction: "Revisar la información del contacto y actualizar el plan",
      timeline: [
        ...record.timeline,
        auditItem(`${contactKind}: ${contactNote.trim()}`),
      ],
    }));
    setContactNote("");
    announce(`Contacto de ${currentCase.code} registrado.`);
  };

  const addTask = () => {
    if (!currentCase) return;
    const task: WorkTask = {
      id: nextId("TASK"),
      title: newTaskTitle,
      owner: newTaskOwner,
      due: newTaskDue || datePlus(2),
      status: "Pendiente",
      type: newTaskTitle,
    };
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status:
        record.status === "Pendiente" ? "En evaluación" : record.status,
      tasks: [...record.tasks, task],
      nextAction: `${task.title} · vence ${task.due}`,
      timeline: [
        ...record.timeline,
        auditItem(`Tarea asignada a ${task.owner}: ${task.title}`),
      ],
    }));
    setNewTaskDue("");
    announce(`Tarea agregada al plan de ${currentCase.code}.`);
  };

  const registerOtherAction = () => {
    if (!currentCase) return;
    if (!otherAction.trim()) {
      announce("Describí la actuación antes de registrarla.");
      return;
    }
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status: "En actuación",
      stage: "Intervención",
      nextAction: "Evaluar resultado y definir seguimiento",
      timeline: [
        ...record.timeline,
        auditItem(`Actuación: ${otherAction.trim()}`),
      ],
    }));
    setOtherAction("");
    announce(`Actuación agregada a ${currentCase.code}.`);
  };

  const createVisitOrder = () => {
    if (!currentCase) return;
    const title =
      currentCase.setting === "ELEPEM"
        ? "Preparar inspección ELEPEM"
        : "Preparar visita a domicilio";
    const task: WorkTask = {
      id: nextId("TASK"),
      title,
      owner: currentCase.ownerRole,
      due: datePlus(2),
      status: "Pendiente",
      type: "Visita",
    };
    mutateCase(currentCase.code, (record) => ({
      ...record,
      tasks: [...record.tasks, task],
      nextAction: `${title} · vence ${task.due}`,
      timeline: [...record.timeline, auditItem(`Orden creada: ${title}`)],
    }));
    announce(`Orden de visita creada para ${currentCase.code}.`);
  };

  const createReferral = () => {
    if (!currentCase) return;
    if (!referralPurpose.trim()) {
      announce("Indicá qué se solicita antes de enviar la derivación.");
      return;
    }
    const due = referralDue || datePlus(3);
    const referral: Referral = {
      id: nextId("REF"),
      destination: referralDestination,
      purpose: referralPurpose.trim(),
      sent: datePlus(0),
      due,
      status: "Pendiente de aceptación",
      response: "",
    };
    const task: WorkTask = {
      id: nextId("TASK"),
      title: `Controlar respuesta de ${referralDestination}`,
      owner: "Coordinación del servicio",
      due,
      status: "Pendiente",
      type: "Derivación",
    };
    mutateCase(currentCase.code, (record) => ({
      ...record,
      referrals: [...record.referrals, referral],
      tasks: [...record.tasks, task],
      primaryReferral: referralDestination,
      referralStatus: "Derivada · aceptación pendiente",
      nextAction: `Controlar aceptación antes de ${due}`,
      timeline: [
        ...record.timeline,
        auditItem(
          `Derivación enviada a ${referralDestination}: ${referralPurpose.trim()}`,
        ),
      ],
    }));
    setReferralPurpose("");
    setReferralDue("");
    announce(`Derivación de ${currentCase.code} enviada para aceptación.`);
  };

  const updateReferral = (
    referralId: string,
    patch: Partial<Referral>,
    actionLabel?: string,
  ) => {
    if (!currentCase) return;
    mutateCase(currentCase.code, (record) => {
      const referral = record.referrals.find(
        (item) => item.id === referralId,
      );
      const next = record.referrals.map((item) =>
        item.id === referralId ? { ...item, ...patch } : item,
      );
      return {
        ...record,
        referrals: next,
        referralStatus:
          patch.status && referral
            ? `${patch.status} · ${referral.destination}`
            : record.referralStatus,
        timeline: actionLabel
          ? [...record.timeline, auditItem(actionLabel)]
          : record.timeline,
      };
    });
    if (actionLabel) announce(actionLabel);
  };

  const saveCaseResult = () => {
    if (!currentCase) return;
    const reason = currentCase.closureReason || "Continuar en proceso";
    if (!currentCase.closureNote.trim()) {
      announce("Explicá el resultado, los pendientes y cómo retomar el caso.");
      return;
    }
    const continuing = reason === "Continuar en proceso";
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status: continuing ? "En seguimiento" : "Cerrado",
      stage: continuing ? "Seguimiento" : "Cerrado / archivado",
      nextAction: continuing
        ? "Cumplir seguimiento acordado"
        : "Sin tarea activa; puede reabrirse con información nueva",
      timeline: [
        ...record.timeline,
        auditItem(
          continuing
            ? `Caso continúa en seguimiento: ${record.closureNote}`
            : `Caso cerrado: ${reason} · ${record.closureNote}`,
        ),
      ],
    }));
    announce(
      continuing
        ? `${currentCase.code} continúa en seguimiento.`
        : `${currentCase.code} quedó cerrado con explicación.`,
    );
  };

  const reopenCase = () => {
    if (!currentCase) return;
    const task: WorkTask = {
      id: nextId("TASK"),
      title: "Revisar nueva información y actualizar riesgo",
      owner: "Coordinación del servicio",
      due: datePlus(0),
      status: "Pendiente",
      type: "Reapertura",
    };
    mutateCase(currentCase.code, (record) => ({
      ...record,
      status: "En evaluación",
      stage: "Reabierto",
      closureReason: "",
      tasks: [...record.tasks, task],
      nextAction: task.title,
      timeline: [...record.timeline, auditItem("Caso reabierto")],
    }));
    announce(`${currentCase.code} fue reabierto con una tarea de revisión.`);
  };

  const completeTask = (
    task: (typeof allTasks)[number],
  ) => {
    if (task.source === "case") {
      mutateCase(task.recordId, (record) => {
        const tasks = record.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "Completada" as const,
                completedAt: auditTime(),
              }
            : item,
        );
        const next = tasks
          .filter((item) => item.status !== "Completada")
          .sort((left, right) => left.due.localeCompare(right.due))[0];
        return {
          ...record,
          tasks,
          nextAction: next
            ? `${next.title} · vence ${next.due}`
            : "Definir seguimiento o cierre",
          timeline: [
            ...record.timeline,
            auditItem(`Tarea completada: ${task.title}`),
          ],
        };
      });
    } else {
      setStandaloneTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "Completada",
                completedAt: auditTime(),
              }
            : item,
        ),
      );
    }
    announce(`Tarea completada: ${task.title}.`);
  };

  const goToRecord = (
    kind: "entry" | "case" | "tasks",
    id?: string,
  ) => {
    if (kind === "entry" && id) {
      setSelectedEntryId(id);
      setActiveTab("inbox");
    } else if (kind === "case" && id) {
      setSelectedCaseId(id);
      setActiveTab("cases");
    } else {
      setActiveTab("tasks");
    }
  };

  const renderInbox = () => {
    const unreviewed = entries.filter(
      (entry) => entry.status === "Sin revisar",
    ).length;
    const urgent = entries.filter(
      (entry) =>
        /emergencia|alta/i.test(entry.urgency) &&
        ![
          "Convertida a caso",
          "Vinculada a caso",
          "Cerrada en recepción",
        ].includes(entry.status),
    ).length;
    const external = entries.filter(
      (entry) => entry.channel !== "Formulario web / app",
    ).length;
    const loadedLater = entries.filter(
      (entry) => entry.importMode === "Carga posterior",
    ).length;
    const duplicateCandidate = currentEntry
      ? cases.find((record) => {
          const place = record.place.split("·")[0].trim();
          return place && currentEntry.place.includes(place);
        })
      : undefined;

    return (
      <div className="teamCasesInbox">
        <div className="teamCaseStats" aria-label="Resumen de entradas">
          {[
            ["Sin revisar", unreviewed],
            ["Urgentes o altas", urgent],
            ["Canales externos", external],
            ["Cargadas después", loadedLater],
          ].map(([label, value]) => (
            <div className="teamCaseStat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <section className="teamIntakeCapture" aria-labelledby="teamCaptureTitle">
          <div className="teamSectionLabel">
            <span>01</span>
            <div>
              <strong id="teamCaptureTitle">Captación multicanal</strong>
              <small>
                La integración crea una entrada; una persona revisa el riesgo y
                decide el siguiente paso.
              </small>
            </div>
          </div>
          <div className="teamCaptureRoutes">
            <div className="teamCaptureRoute">
              <h3>Entrada automática · simulación</h3>
              <p>
                Conserva canal y referencia, pero no abre un expediente ni
                decide el riesgo.
              </p>
              <div className="teamInlineActions">
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() => simulateEntry("whatsapp")}
                >
                  Simular WhatsApp
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() => simulateEntry("police")}
                >
                  Simular derivación policial
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() => simulateEntry("health")}
                >
                  Simular correo de salud
                </button>
              </div>
            </div>
            <div className="teamCaptureRoute">
              <h3>Carga manual o posterior</h3>
              <p>
                Registra cuándo llegó la comunicación y cuándo se incorporó a
                la bandeja.
              </p>
              <div className="teamInlineActions">
                <button
                  type="button"
                  className="teamSaveButton"
                  onClick={() => openManual()}
                >
                  <Plus size={16} /> Registrar entrada externa
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() =>
                    openManual({
                      channel: "Teléfono",
                      loadMode: "Carga posterior",
                    })
                  }
                >
                  Registrar llamada
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() =>
                    openManual({
                      channel: "WhatsApp",
                      loadMode: "Carga posterior",
                    })
                  }
                >
                  WhatsApp anterior
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={() =>
                    openManual({
                      channel: "Derivación institucional",
                      loadMode: "Carga posterior",
                    })
                  }
                >
                  Derivación institucional
                </button>
              </div>
            </div>
          </div>
        </section>

        {manualOpen && (
          <form
            className="teamManualIntake"
            onSubmit={(event) => {
              event.preventDefault();
              saveManualEntry();
            }}
          >
            <div className="teamCaseSectionHeader">
              <div>
                <span>Nueva entrada</span>
                <h3>Ficha rápida de recepción</h3>
              </div>
              <button
                type="button"
                className="teamGhostButton"
                onClick={() => setManualOpen(false)}
                aria-label="Cerrar ficha de recepción"
              >
                <X size={17} /> Cerrar
              </button>
            </div>
            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Forma de registro</span>
                <select
                  value={manualDraft.loadMode}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      loadMode: event.target.value,
                    }))
                  }
                >
                  <option>En el momento</option>
                  <option>Carga posterior</option>
                </select>
              </label>
              <label className="teamField">
                <span>Fecha y hora en que llegó</span>
                <input
                  type="datetime-local"
                  value={manualDraft.occurredAt}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      occurredAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="teamField">
                <span>Canal</span>
                <select
                  value={manualDraft.channel}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      channel: event.target.value,
                    }))
                  }
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="teamField">
                <span>Quién o qué institución comunica</span>
                <input
                  value={manualDraft.source}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  placeholder="Vecina, persona afectada, seccional, policlínica"
                />
              </label>
              <label className="teamField">
                <span>Referencia externa</span>
                <input
                  value={manualDraft.externalRef}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      externalRef: event.target.value,
                    }))
                  }
                  placeholder="N.º de actuación, correo, llamada o expediente"
                />
              </label>
              <label className="teamField">
                <span>Ámbito</span>
                <select
                  value={manualDraft.setting}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      setting: event.target.value,
                    }))
                  }
                >
                  {SETTING_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="teamField">
                <span>Lugar o zona</span>
                <input
                  value={manualDraft.place}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      place: event.target.value,
                    }))
                  }
                  placeholder="Usar ubicación protegida cuando corresponda"
                />
              </label>
              <label className="teamField">
                <span>Contacto seguro</span>
                <input
                  value={manualDraft.safe}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      safe: event.target.value,
                    }))
                  }
                  placeholder="Ej.: no llamar al domicilio"
                />
              </label>
              <label className="teamField">
                <span>Urgencia informada</span>
                <select
                  value={manualDraft.urgency}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      urgency: event.target.value,
                    }))
                  }
                >
                  {URGENCY_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="teamField">
                <span>Identidad</span>
                <select
                  value={manualDraft.privacy}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      privacy: event.target.value,
                    }))
                  }
                >
                  {PRIVACY_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="teamField">
                <span>Documentos recibidos</span>
                <input
                  value={manualDraft.attachments}
                  onChange={(event) =>
                    setManualDraft((current) => ({
                      ...current,
                      attachments: event.target.value,
                    }))
                  }
                  placeholder="Parte, audio, fotografías o sin adjuntos"
                />
              </label>
            </div>
            <label className="teamField teamNarrative">
              <span>Qué se comunicó</span>
              <textarea
                value={manualDraft.summary}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder="Separá lo observado de lo informado; no lo conviertas en un hecho confirmado."
              />
            </label>
            <div className="teamCaseNotice">
              <strong>Control mínimo antes de guardar</strong>
              <span>
                Revisá peligro actual, devolución segura, fuente, momento
                original y posibilidad de volver a contactar.
              </span>
            </div>
            <div className="teamInlineActions">
              <button type="submit" className="teamSaveButton">
                Guardar en bandeja <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        <section className="teamIntakeDesk" aria-labelledby="teamInboxDeskTitle">
          <div className="teamIntakeList">
            <div className="teamSectionLabel">
              <span>02</span>
              <div>
                <strong id="teamInboxDeskTitle">Bandeja de entradas</strong>
                <small>Buscá, filtrá y elegí una entrada para revisarla.</small>
              </div>
            </div>
            <div className="teamFieldGrid">
              <label className="teamField">
                <span>Buscar entradas</span>
                <input
                  value={entrySearch}
                  onChange={(event) => setEntrySearch(event.target.value)}
                  placeholder="Código, canal, fuente, lugar"
                />
              </label>
              <label className="teamField">
                <span>Estado</span>
                <select
                  value={entryStatus}
                  onChange={(event) => setEntryStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option>Sin revisar</option>
                  <option>En triage</option>
                  <option>Convertida a caso</option>
                  <option>Vinculada a caso</option>
                  <option>Cerrada en recepción</option>
                </select>
              </label>
            </div>
            <div className="teamRecordList">
              {filteredEntries.length ? (
                filteredEntries.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={`teamRecordItem ${
                      currentEntry?.id === entry.id ? "teamRecordItemActive" : ""
                    }`}
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setEntryClosure("");
                    }}
                    aria-pressed={currentEntry?.id === entry.id}
                  >
                    <span className="teamRecordIcon" aria-hidden="true">
                      {entryIcon(entry.channel)}
                    </span>
                    <span className="teamRecordText">
                      <strong>{entry.id}</strong>
                      <small>
                        {entry.status} · {entry.urgency}
                      </small>
                      <span>
                        {entry.source} · {entry.place}
                      </span>
                      <small>
                        Llegó {entry.occurredAt.replace("T", " ")} ·{" "}
                        {entry.importMode}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="teamEmptyState">
                  No hay entradas con estos filtros.
                </p>
              )}
            </div>
          </div>

          {currentEntry && (
            <article
              className="teamIntakeDetail"
              aria-labelledby="teamSelectedEntryTitle"
            >
              <div className="teamCaseSectionHeader">
                <div>
                  <span>
                    {currentEntry.status} · {currentEntry.urgency} ·{" "}
                    {currentEntry.importMode}
                  </span>
                  <h3 id="teamSelectedEntryTitle">{currentEntry.id}</h3>
                </div>
                <span className="teamRecordIcon" aria-hidden="true">
                  {entryIcon(currentEntry.channel)}
                </span>
              </div>
              <dl className="teamTraceGrid">
                <div>
                  <dt>Cuándo llegó</dt>
                  <dd>{currentEntry.occurredAt.replace("T", " ")}</dd>
                </div>
                <div>
                  <dt>Cuándo se registró</dt>
                  <dd>{currentEntry.registeredAt.replace("T", " ")}</dd>
                </div>
                <div>
                  <dt>Canal y fuente</dt>
                  <dd>
                    {currentEntry.channel} · {currentEntry.source}
                  </dd>
                </div>
                <div>
                  <dt>Referencia externa</dt>
                  <dd>{currentEntry.externalRef}</dd>
                </div>
                <div>
                  <dt>Recibida por</dt>
                  <dd>{currentEntry.receivedBy}</dd>
                </div>
                <div>
                  <dt>Ámbito y lugar</dt>
                  <dd>
                    {currentEntry.setting} · {currentEntry.place}
                  </dd>
                </div>
                <div>
                  <dt>Identidad y contacto</dt>
                  <dd>
                    {currentEntry.privacy} · {currentEntry.safe}
                  </dd>
                </div>
                <div>
                  <dt>Documentos</dt>
                  <dd>{currentEntry.attachments}</dd>
                </div>
              </dl>
              <div className="teamCaseNarrative">
                <strong>Relato original · no equivale a hallazgo</strong>
                <p>{currentEntry.summary}</p>
              </div>

              <section className="teamCaseSection">
                <div className="teamSectionLabel">
                  <span>03</span>
                  <div>
                    <strong>Triage de recepción</strong>
                    <small>
                      Registrá evaluación humana y controles mínimos.
                    </small>
                  </div>
                </div>
                <div className="teamFieldGrid">
                  <label className="teamField">
                    <span>Riesgo preliminar</span>
                    <select
                      value={currentEntry.risk}
                      onChange={(event) =>
                        patchEntry(currentEntry.id, {
                          risk: event.target.value,
                        })
                      }
                    >
                      <option>No evaluado</option>
                      <option>Alto</option>
                      <option>Medio</option>
                      <option>Bajo</option>
                    </select>
                  </label>
                  <label className="teamField">
                    <span>Alcance</span>
                    <select
                      value={currentEntry.scope}
                      onChange={(event) =>
                        patchEntry(currentEntry.id, {
                          scope: event.target.value,
                        })
                      }
                    >
                      {SCOPE_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <fieldset className="teamCheckGroup">
                  <legend>Controles realizados</legend>
                  <label className="teamCheckOption">
                    <input
                      type="checkbox"
                      checked={currentEntry.emergencyReviewed}
                      onChange={(event) =>
                        patchEntry(currentEntry.id, {
                          emergencyReviewed: event.target.checked,
                        })
                      }
                    />
                    <span>
                      Revisé peligro actual y registré la respuesta inmediata.
                    </span>
                  </label>
                  <label className="teamCheckOption">
                    <input
                      type="checkbox"
                      checked={currentEntry.duplicateChecked}
                      onChange={(event) =>
                        patchEntry(currentEntry.id, {
                          duplicateChecked: event.target.checked,
                        })
                      }
                    />
                    <span>
                      Busqué persona, lugar, teléfono y referencias para evitar
                      duplicados.
                    </span>
                  </label>
                </fieldset>
                {duplicateCandidate && (
                  <div className="teamCaseNotice">
                    <strong>Posible coincidencia para confirmar</strong>
                    <span>
                      {duplicateCandidate.code} · {duplicateCandidate.place}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={saveTriage}
                >
                  Guardar triage
                </button>
              </section>

              <section className="teamCaseSection">
                <div className="teamSectionLabel">
                  <span>04</span>
                  <div>
                    <strong>Decidir qué hacer</strong>
                    <small>
                      La entrada original nunca se elimina ni se reescribe.
                    </small>
                  </div>
                </div>
                <div className="teamDecisionGrid">
                  <div className="teamDecisionCard">
                    <h4>Abrir un caso nuevo</h4>
                    <p>Conserva el original y crea las tareas iniciales.</p>
                    <button
                      type="button"
                      className="teamSaveButton"
                      onClick={convertEntry}
                      disabled={
                        currentEntry.status === "Convertida a caso" ||
                        currentEntry.status === "Vinculada a caso"
                      }
                    >
                      Convertir en caso
                    </button>
                  </div>
                  <div className="teamDecisionCard">
                    <h4>Agregar a un expediente existente</h4>
                    <label className="teamField">
                      <span>Expediente</span>
                      <select
                        value={linkTarget}
                        onChange={(event) => setLinkTarget(event.target.value)}
                      >
                        {cases.map((record) => (
                          <option key={record.code} value={record.code}>
                            {record.code} · {record.place}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="teamGhostButton"
                      onClick={linkEntry}
                    >
                      Vincular sin duplicar
                    </button>
                  </div>
                  <div className="teamDecisionCard">
                    <h4>Pedir más información</h4>
                    <p>
                      Crea una tarea y mantiene la entrada en triage.
                    </p>
                    <button
                      type="button"
                      className="teamGhostButton"
                      onClick={requestMoreInformation}
                    >
                      Registrar solicitud
                    </button>
                  </div>
                  <div className="teamDecisionCard">
                    <h4>Orientar o cerrar en recepción</h4>
                    <label className="teamField">
                      <span>Motivo y recurso indicado</span>
                      <textarea
                        value={entryClosure}
                        onChange={(event) =>
                          setEntryClosure(event.target.value)
                        }
                        placeholder="Qué orientación se brindó y cómo retomar"
                      />
                    </label>
                    <button
                      type="button"
                      className="teamGhostButton"
                      onClick={closeEntry}
                    >
                      Orientar y cerrar
                    </button>
                  </div>
                </div>
                {currentEntry.linkedCase && (
                  <p className="teamAuditLine">
                    Expediente vinculado: {currentEntry.linkedCase}
                  </p>
                )}
                {currentEntry.followUp && (
                  <p className="teamAuditLine">{currentEntry.followUp}</p>
                )}
                {currentEntry.closure && (
                  <p className="teamAuditLine">
                    Motivo de cierre: {currentEntry.closure}
                  </p>
                )}
              </section>
            </article>
          )}
        </section>
      </div>
    );
  };

  const renderCases = () => (
    <div className="teamCasesDesk">
      <section className="teamCaseFilters" aria-labelledby="teamCaseFiltersTitle">
        <div className="teamSectionLabel">
          <span>01</span>
          <div>
            <strong id="teamCaseFiltersTitle">Casos y planes de trabajo</strong>
            <small>
              El relato, la evaluación, las tareas y el cierre permanecen
              separados.
            </small>
          </div>
        </div>
        <div className="teamFieldGrid">
          <label className="teamField">
            <span>Buscar</span>
            <input
              value={caseSearch}
              onChange={(event) => setCaseSearch(event.target.value)}
              placeholder="Código, lugar, situación u origen"
            />
          </label>
          <label className="teamField">
            <span>Ámbito</span>
            <select
              value={caseSetting}
              onChange={(event) => setCaseSetting(event.target.value)}
            >
              <option value="">Todos</option>
              <option>Domicilio o comunidad</option>
              <option>ELEPEM</option>
              <option>Otro servicio</option>
            </select>
          </label>
          <label className="teamField">
            <span>Estado</span>
            <select
              value={caseStatus}
              onChange={(event) => setCaseStatus(event.target.value)}
            >
              <option value="">Todos</option>
              <option>Pendiente</option>
              <option>En evaluación</option>
              <option>En actuación</option>
              <option>En seguimiento</option>
              <option>Cerrado</option>
            </select>
          </label>
          <label className="teamField">
            <span>Origen</span>
            <select
              value={caseSource}
              onChange={(event) => setCaseSource(event.target.value)}
            >
              <option value="">Todos</option>
              <option>La propia persona</option>
              <option>Familiar</option>
              <option>Vecina</option>
              <option>Trabajador</option>
              <option>Profesional</option>
              <option>Policía</option>
              <option>Autoridad</option>
            </select>
          </label>
          <label className="teamField">
            <span>Responsable principal</span>
            <select
              value={caseDestination}
              onChange={(event) => setCaseDestination(event.target.value)}
            >
              <option value="">Todos</option>
              {ORGANIZATIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="teamCaseWorkspace">
        <aside className="teamRecordList" aria-label="Expedientes">
          {filteredCases.length ? (
            filteredCases.map((record) => {
              const nextTask = record.tasks
                .filter((task) => task.status !== "Completada")
                .sort((left, right) => left.due.localeCompare(right.due))[0];
              return (
                <button
                  type="button"
                  key={record.code}
                  className={`teamRecordItem ${
                    currentCase?.code === record.code
                      ? "teamRecordItemActive"
                      : ""
                  }`}
                  onClick={() => setSelectedCaseId(record.code)}
                  aria-pressed={currentCase?.code === record.code}
                >
                  <span className="teamRecordText">
                    <strong>{record.code}</strong>
                    <small>
                      Riesgo {record.priority} · {record.status}
                    </small>
                    <span>{record.place}</span>
                    <small>
                      {record.ownerRole} · {record.assignedTo}
                    </small>
                    <small>
                      Siguiente: {nextTask?.title ?? record.nextAction}
                    </small>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="teamEmptyState">No hay casos con estos filtros.</p>
          )}
        </aside>

        {currentCase && (
          <article
            className="teamCaseDetail"
            aria-labelledby="teamSelectedCaseTitle"
          >
            <div className="teamCaseSectionHeader">
              <div>
                <span>
                  Riesgo {currentCase.priority} · {currentCase.status} ·{" "}
                  {currentCase.stage}
                </span>
                <h2 id="teamSelectedCaseTitle">{currentCase.code}</h2>
                <p>{currentCase.place}</p>
              </div>
              <div className="teamOwnership">
                <span>{currentCase.ownerRole}</span>
                <span>{currentCase.assignedTo}</span>
              </div>
            </div>

            <ol className="teamCasePhases" aria-label="Etapas del expediente">
              {[
                "Ingreso",
                "Triage y asignación",
                "Contacto y evaluación",
                "Intervención",
                "Seguimiento",
                "Cierre",
              ].map((label, index) => {
                const phase = phaseFor(currentCase);
                return (
                  <li
                    key={label}
                    className={
                      index + 1 < phase
                        ? "teamPhaseDone"
                        : index + 1 === phase
                          ? "teamPhaseCurrent"
                          : "teamPhasePending"
                    }
                    aria-current={
                      index + 1 === phase ? "step" : undefined
                    }
                  >
                    <i>{index + 1}</i>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>

            <dl className="teamTraceGrid">
              <div>
                <dt>Origen</dt>
                <dd>
                  {currentCase.alertOrigin} · {currentCase.channel} ·{" "}
                  {currentCase.reporter}
                </dd>
              </div>
              <div>
                <dt>Entradas vinculadas</dt>
                <dd>{currentCase.externalEntries.join(", ") || "Ninguna"}</dd>
              </div>
              <div>
                <dt>Puerta receptora</dt>
                <dd>{currentCase.receivedBy}</dd>
              </div>
              <div>
                <dt>Estado de derivación</dt>
                <dd>{currentCase.referralStatus}</dd>
              </div>
              <div>
                <dt>Edad y dependencia</dt>
                <dd>
                  {currentCase.age} · {currentCase.dependency}
                </dd>
              </div>
              <div>
                <dt>Próximo paso</dt>
                <dd>{currentCase.nextAction}</dd>
              </div>
            </dl>
            <div className="teamCaseNarrative">
              <strong>Relato inicial · no equivale a hallazgo</strong>
              <p>{currentCase.summary}</p>
              <div className="teamTagList">
                {currentCase.concerns.map((concern) => (
                  <span key={concern}>{concern}</span>
                ))}
              </div>
            </div>

            <section className="teamCaseSection">
              <div className="teamSectionLabel">
                <span>01</span>
                <div>
                  <strong>Triage, alcance y asignación</strong>
                  <small>Definí quién asume y con qué alcance.</small>
                </div>
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Riesgo actual</span>
                  <select
                    value={currentCase.priority}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        priority: event.target
                          .value as CaseRecord["priority"],
                      })
                    }
                  >
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </label>
                <label className="teamField">
                  <span>Resultado de alcance</span>
                  <select
                    value={currentCase.scope}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        scope: event.target.value,
                      })
                    }
                  >
                    {CASE_SCOPE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="teamField">
                  <span>Responsable operativo</span>
                  <select
                    value={currentCase.ownerRole}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        ownerRole: event.target.value as WorkRole,
                      })
                    }
                  >
                    {ROLE_NAMES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="teamField">
                  <span>Organismo o unidad principal</span>
                  <select
                    value={currentCase.primaryReferral}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        primaryReferral: event.target.value,
                      })
                    }
                  >
                    {ORGANIZATIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="teamInlineActions">
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={saveAssessment}
                >
                  Guardar evaluación
                </button>
                <button
                  type="button"
                  className="teamSaveButton"
                  onClick={acceptCase}
                >
                  Aceptar y asumir
                </button>
              </div>
            </section>

            <section className="teamCaseSection">
              <div className="teamSectionLabel">
                <span>02</span>
                <div>
                  <strong>Contacto, voluntad y evaluación</strong>
                  <small>
                    El contacto seguro y la voluntad orientan el plan.
                  </small>
                </div>
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Primer contacto</span>
                  <select
                    value={currentCase.firstContact}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        firstContact: event.target.value,
                      })
                    }
                  >
                    <option>Pendiente</option>
                    <option>Intentado sin respuesta</option>
                    <option>Realizado con quien consultó</option>
                    <option>Realizado con la persona afectada</option>
                    <option>Realizado o coordinado</option>
                  </select>
                </label>
                <label className="teamField">
                  <span>Voluntad de la persona</span>
                  <select
                    value={currentCase.personWill}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        personWill: event.target.value,
                      })
                    }
                  >
                    <option>Pendiente de registrar</option>
                    <option>Desea continuar</option>
                    <option>Desea orientación, no denuncia</option>
                    <option>No desea continuar</option>
                    <option>No fue posible conocerla</option>
                  </select>
                </label>
                <label className="teamField">
                  <span>Tipo de contacto</span>
                  <select
                    value={contactKind}
                    onChange={(event) => setContactKind(event.target.value)}
                  >
                    <option>Llamada a la persona afectada</option>
                    <option>Llamada a quien consultó</option>
                    <option>WhatsApp / mensaje seguro</option>
                    <option>Entrevista presencial</option>
                    <option>Intento sin respuesta</option>
                    <option>Contacto con profesional o institución</option>
                  </select>
                </label>
              </div>
              <label className="teamField teamNarrative">
                <span>Resultado breve</span>
                <textarea
                  value={contactNote}
                  onChange={(event) => setContactNote(event.target.value)}
                  placeholder="Qué se logró, qué pidió la persona, riesgos nuevos y próximo acuerdo"
                />
              </label>
              <div className="teamCaseNotice">
                <strong>Contacto seguro registrado</strong>
                <span>{currentCase.safe}</span>
              </div>
              <button
                type="button"
                className="teamGhostButton"
                onClick={saveContact}
              >
                Guardar contacto o intento
              </button>
            </section>

            <section className="teamCaseSection">
              <div className="teamSectionLabel">
                <span>03</span>
                <div>
                  <strong>Plan de intervención y tareas</strong>
                  <small>Asigná responsable, plazo y próximo paso.</small>
                </div>
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Nueva tarea</span>
                  <select
                    value={newTaskTitle}
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                  >
                    {TASK_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="teamField">
                  <span>Responsable</span>
                  <select
                    value={newTaskOwner}
                    onChange={(event) =>
                      setNewTaskOwner(event.target.value as WorkRole)
                    }
                  >
                    {ROLE_NAMES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="teamField">
                  <span>Vence</span>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(event) => setNewTaskDue(event.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="teamGhostButton"
                onClick={addTask}
              >
                <Plus size={16} /> Agregar tarea
              </button>
              <div className="teamTaskList">
                {currentCase.tasks.map((task) => (
                  <div className="teamTaskRow" key={task.id}>
                    <span>{task.due}</span>
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        {task.type} · {task.owner}
                      </small>
                    </div>
                    <span>{task.status}</span>
                    <button
                      type="button"
                      className="teamGhostButton"
                      disabled={task.status === "Completada"}
                      onClick={() =>
                        completeTask({
                          ...task,
                          recordId: currentCase.code,
                          source: "case",
                          place: currentCase.place,
                        })
                      }
                    >
                      Completar
                    </button>
                  </div>
                ))}
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Otra actuación</span>
                  <input
                    value={otherAction}
                    onChange={(event) => setOtherAction(event.target.value)}
                    placeholder="Ej.: orientación psicosocial realizada"
                  />
                </label>
              </div>
              <div className="teamInlineActions">
                <button
                  type="button"
                  className="teamSaveButton"
                  onClick={createVisitOrder}
                >
                  Crear orden de visita
                </button>
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={registerOtherAction}
                >
                  Registrar otra actuación
                </button>
              </div>
            </section>

            <section className="teamCaseSection">
              <div className="teamSectionLabel">
                <span>04</span>
                <div>
                  <strong>Derivaciones y respuestas</strong>
                  <small>
                    La aceptación y la respuesta también quedan registradas.
                  </small>
                </div>
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Destino</span>
                  <select
                    value={referralDestination}
                    onChange={(event) =>
                      setReferralDestination(event.target.value)
                    }
                  >
                    {ORGANIZATIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="teamField">
                  <span>Qué se solicita</span>
                  <input
                    value={referralPurpose}
                    onChange={(event) =>
                      setReferralPurpose(event.target.value)
                    }
                    placeholder="Inspección, salud, actuación penal o cuidados"
                  />
                </label>
                <label className="teamField">
                  <span>Fecha esperada</span>
                  <input
                    type="date"
                    value={referralDue}
                    onChange={(event) => setReferralDue(event.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="teamGhostButton"
                onClick={createReferral}
              >
                Enviar y pedir aceptación
              </button>
              <div className="teamReferralList">
                {currentCase.referrals.length ? (
                  currentCase.referrals.map((referral) => (
                    <div className="teamReferralRow" key={referral.id}>
                      <div>
                        <strong>{referral.destination}</strong>
                        <small>{referral.purpose}</small>
                        <span>
                          {referral.status} · esperada {referral.due}
                        </span>
                      </div>
                      <label className="teamField">
                        <span>Respuesta o resultado</span>
                        <input
                          value={referral.response}
                          onChange={(event) =>
                            updateReferral(referral.id, {
                              response: event.target.value,
                            })
                          }
                          placeholder="Respuesta institucional ficticia"
                        />
                      </label>
                      <div className="teamInlineActions">
                        <button
                          type="button"
                          className="teamGhostButton"
                          onClick={() =>
                            updateReferral(
                              referral.id,
                              {
                                status: "Aceptada",
                                response:
                                  referral.response ||
                                  `Aceptada por ${referral.destination}`,
                              },
                              `Derivación a ${referral.destination} aceptada.`,
                            )
                          }
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          className="teamGhostButton"
                          disabled={!referral.response.trim()}
                          onClick={() =>
                            updateReferral(
                              referral.id,
                              { status: "Respondida" },
                              `Respuesta de ${referral.destination} registrada.`,
                            )
                          }
                        >
                          Registrar respuesta
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="teamEmptyState">
                    Sin derivaciones registradas.
                  </p>
                )}
              </div>
            </section>

            <section className="teamCaseSection">
              <div className="teamSectionLabel">
                <span>05</span>
                <div>
                  <strong>Seguimiento, cierre o reapertura</strong>
                  <small>
                    Explicá el resultado y dejá visible cómo retomar.
                  </small>
                </div>
              </div>
              <div className="teamFieldGrid">
                <label className="teamField">
                  <span>Resultado o motivo</span>
                  <select
                    value={
                      currentCase.closureReason || "Continuar en proceso"
                    }
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        closureReason: event.target.value,
                      })
                    }
                  >
                    <option>Continuar en proceso</option>
                    <option>Resolución / derivación aceptada</option>
                    <option>No corresponde al servicio</option>
                    <option>Desistencia de la persona</option>
                    <option>Imposible establecer contacto</option>
                    <option>Cierre por cambio de situación</option>
                  </select>
                </label>
                <label className="teamField">
                  <span>Explicación y recurso indicado</span>
                  <textarea
                    value={currentCase.closureNote}
                    onChange={(event) =>
                      patchCase(currentCase.code, {
                        closureNote: event.target.value,
                      })
                    }
                    placeholder="Qué se hizo, qué queda pendiente y cómo reabrir"
                  />
                </label>
              </div>
              <div className="teamInlineActions">
                <button
                  type="button"
                  className="teamGhostButton"
                  onClick={saveCaseResult}
                >
                  Guardar resultado
                </button>
                {currentCase.status === "Cerrado" && (
                  <button
                    type="button"
                    className="teamSaveButton"
                    onClick={reopenCase}
                  >
                    Reabrir expediente
                  </button>
                )}
              </div>
            </section>

            <section
              className="teamCaseTimeline"
              aria-labelledby="teamTimelineTitle"
            >
              <h3 id="teamTimelineTitle">Historial auditable</h3>
              <ol>
                {currentCase.timeline.map((item, index) => (
                  <li key={`${item.at}-${index}`}>
                    <strong>{item.at}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <section className="teamTaskBoard" aria-labelledby="teamTaskBoardTitle">
      <div className="teamSectionLabel">
        <span>01</span>
        <div>
          <strong id="teamTaskBoardTitle">Mis tareas y vencimientos</strong>
          <small>
            Contactos, informes, visitas, derivaciones y seguimientos comparten
            el mismo tablero.
          </small>
        </div>
      </div>
      <div className="teamFieldGrid">
        <label className="teamField">
          <span>Responsable</span>
          <select
            value={taskOwnerFilter}
            onChange={(event) => setTaskOwnerFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {ROLE_NAMES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="teamField">
          <span>Estado</span>
          <select
            value={taskStateFilter}
            onChange={(event) => setTaskStateFilter(event.target.value)}
          >
            <option value="">Pendientes y en curso</option>
            <option>Pendiente</option>
            <option>En curso</option>
            <option>Completada</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className={
          taskTodayOnly
            ? "teamSaveButton teamTaskTodayActive"
            : "teamGhostButton"
        }
        aria-pressed={taskTodayOnly}
        onClick={() => setTaskTodayOnly((current) => !current)}
      >
        Solo hoy o vencidas
      </button>
      <div className="teamTaskList">
        {visibleTasks.length ? (
          visibleTasks.map((task) => (
            <div
              className={`teamTaskRow ${
                task.status !== "Completada" && task.due < datePlus(0)
                  ? "teamTaskOverdue"
                  : ""
              }`}
              key={`${task.source}-${task.id}`}
            >
              <span>{task.due}</span>
              <div>
                <strong>{task.title}</strong>
                <button
                  type="button"
                  className="teamRecordLink"
                  onClick={() =>
                    goToRecord(task.source, task.recordId)
                  }
                >
                  {task.recordId} · {task.place}
                </button>
                <small>
                  {task.type} · {task.owner}
                </small>
              </div>
              <span>{task.status}</span>
              <button
                type="button"
                className="teamGhostButton"
                disabled={task.status === "Completada"}
                onClick={() => completeTask(task)}
              >
                Completar
              </button>
            </div>
          ))
        ) : (
          <p className="teamEmptyState">No hay tareas con estos filtros.</p>
        )}
      </div>
    </section>
  );

  const renderDashboard = () => {
    const pendingReferrals = cases.flatMap((record) =>
      record.referrals
        .filter((referral) => referral.status === "Pendiente de aceptación")
        .map((referral) => ({ record, referral })),
    );
    const overdue = allTasks.filter(
      (task) => task.status !== "Completada" && task.due < datePlus(0),
    );
    const priorities = [
      ...entries
        .filter(
          (entry) =>
            entry.status === "Sin revisar" &&
            /emergencia|alta/i.test(entry.urgency),
        )
        .map((entry) => ({
          kind: "entry" as const,
          id: entry.id,
          label: `${entry.id} · revisar entrada prioritaria`,
          meta: `${entry.channel} · ${entry.source}`,
        })),
      ...cases
        .filter(
          (record) =>
            record.priority === "Alta" && record.status !== "Cerrado",
        )
        .map((record) => ({
          kind: "case" as const,
          id: record.code,
          label: `${record.code} · ${record.nextAction}`,
          meta: record.place,
        })),
      ...overdue.map((task) => ({
        kind: "tasks" as const,
        id: task.recordId,
        label: `${task.recordId} · tarea vencida: ${task.title}`,
        meta: `${task.owner} · ${task.due}`,
      })),
    ];
    const quality = [
      ...entries
        .filter(
          (entry) =>
            !entry.externalRef ||
            entry.externalRef === "Sin referencia externa",
        )
        .map((entry) => `${entry.id} sin referencia externa`),
      ...entries
        .filter(
          (entry) => !entry.safe || /pendiente/i.test(entry.safe),
        )
        .map((entry) => `${entry.id} sin contacto seguro claro`),
      ...cases
        .filter(
          (record) =>
            record.personWill === "Pendiente de registrar" &&
            record.status !== "Cerrado",
        )
        .map((record) => `${record.code} sin voluntad registrada`),
      ...cases
        .filter((record) => record.assignedTo === "Sin asignar")
        .map((record) => `${record.code} sin responsable asignado`),
    ];

    return (
      <div className="teamOperationsDashboard">
        <div className="teamCaseStats" aria-label="Indicadores operativos">
          {[
            [
              "Entradas sin revisar",
              entries.filter((entry) => entry.status === "Sin revisar").length,
            ],
            [
              "Altos sin asumir",
              cases.filter(
                (record) =>
                  record.priority === "Alta" &&
                  (record.assignedTo === "Sin asignar" ||
                    record.status === "Pendiente"),
              ).length,
            ],
            [
              "Contactos pendientes",
              cases.filter(
                (record) =>
                  record.status !== "Cerrado" &&
                  /Pendiente|Intentado/.test(record.firstContact),
              ).length,
            ],
            ["Derivaciones esperando", pendingReferrals.length],
            ["Tareas vencidas", overdue.length],
            [
              "Casos activos",
              cases.filter((record) => record.status !== "Cerrado").length,
            ],
          ].map(([label, value]) => (
            <div className="teamCaseStat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="teamDashboardColumns">
          <section className="teamDashboardPanel">
            <h3>Prioridades operativas</h3>
            {priorities.length ? (
              priorities.map((priority, index) => (
                <button
                  type="button"
                  className="teamDashboardItem"
                  key={`${priority.kind}-${priority.id}-${index}`}
                  onClick={() =>
                    goToRecord(priority.kind, priority.id)
                  }
                >
                  <strong>{priority.label}</strong>
                  <span>{priority.meta}</span>
                </button>
              ))
            ) : (
              <p className="teamEmptyState">Sin prioridades pendientes.</p>
            )}
          </section>
          <section className="teamDashboardPanel">
            <h3>Derivaciones sin respuesta</h3>
            {pendingReferrals.length ? (
              pendingReferrals.map(({ record, referral }) => (
                <button
                  type="button"
                  className="teamDashboardItem"
                  key={referral.id}
                  onClick={() => goToRecord("case", record.code)}
                >
                  <strong>
                    {record.code} → {referral.destination}
                  </strong>
                  <span>
                    {referral.purpose} · esperada {referral.due}
                  </span>
                </button>
              ))
            ) : (
              <p className="teamEmptyState">
                Sin derivaciones pendientes.
              </p>
            )}
          </section>
          <section className="teamDashboardPanel">
            <h3>Calidad del registro</h3>
            {quality.length ? (
              quality.map((item) => (
                <p className="teamQualityItem" key={item}>
                  <span aria-hidden="true">⚠️</span> {item}
                </p>
              ))
            ) : (
              <p className="teamEmptyState">Sin faltantes detectados.</p>
            )}
          </section>
        </div>
        <section className="teamAuditFlow" aria-labelledby="teamAuditFlowTitle">
          <h3 id="teamAuditFlowTitle">Flujo que debe poder auditarse</h3>
          <ol>
            {[
              ["Captación", "Canal, fuente, fecha original y documentos."],
              ["Triage", "Urgencia, contacto seguro, duplicados y alcance."],
              ["Asignación", "Responsable y equipo interdisciplinario."],
              ["Intervención", "Entrevistas, orientación, visitas e informes."],
              ["Articulación", "Aceptación, respuesta y corresponsabilidad."],
              ["Seguimiento o cierre", "Resultado, voluntad y reapertura."],
            ].map(([title, description], index) => (
              <li key={title}>
                <i>{index + 1}</i>
                <strong>{title}</strong>
                <span>{description}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  };

  const renderRoles = () => (
    <section className="teamRoleMatrix" aria-labelledby="teamRolesTitle">
      <div className="teamSectionLabel">
        <span>01</span>
        <div>
          <strong id="teamRolesTitle">Qué puede hacer cada perfil</strong>
          <small>
            Distribución funcional para la práctica; los accesos reales deben
            validarse institucionalmente.
          </small>
        </div>
      </div>
      <div className="teamSelectedRoleGuide">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>{role}</strong>
          <ul>
            {WORK_ROLES[role].actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <p>
            <strong>Límite:</strong> {WORK_ROLES[role].limit}
          </p>
        </div>
      </div>
      <div className="teamTableScroll">
        <table>
          <caption>Acciones y límites por perfil</caption>
          <thead>
            <tr>
              <th scope="col">Perfil</th>
              <th scope="col">Acciones principales</th>
              <th scope="col">Límites y controles</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_NAMES.map((name) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>
                  <ul>
                    {WORK_ROLES[name].actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </td>
                <td>{WORK_ROLES[name].limit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="teamCasesWorkflow">
      <section className="teamCaseIdentity" aria-labelledby="teamCaseIdentityTitle">
        <div className="teamSectionLabel">
          <span>00</span>
          <div>
            <strong id="teamCaseIdentityTitle">Contexto de trabajo</strong>
            <small>
              El perfil y el actor quedan asociados al historial de práctica.
            </small>
          </div>
        </div>
        <div className="teamFieldGrid">
          <label className="teamField">
            <span>Estoy trabajando como</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as WorkRole)}
            >
              {ROLE_NAMES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="teamField">
            <span>Nombre o equipo ficticio</span>
            <input
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder="Queda en el historial auditable"
            />
          </label>
        </div>
        <div className="teamRoleGuide">
          <strong>Guía para {role}</strong>
          <span>{WORK_ROLES[role].actions[0]}</span>
          <small>{WORK_ROLES[role].limit}</small>
        </div>
      </section>

      <nav className="teamCaseTabs" role="tablist" aria-label="Mesa de gestión">
        {TABS.map(({ id, label, Icon }, index) => (
          <button
            type="button"
            role="tab"
            id={`team-case-tab-${id}`}
            aria-controls={`team-case-panel-${id}`}
            aria-selected={activeTab === id}
            tabIndex={activeTab === id ? 0 : -1}
            className={activeTab === id ? "teamCaseTabActive" : "teamCaseTab"}
            onClick={() => setActiveTab(id)}
            key={id}
          >
            <Icon size={17} aria-hidden="true" />
            <span>
              {index < 4 ? `${index + 1}. ` : ""}
              {label}
            </span>
          </button>
        ))}
      </nav>

      <section
        className="teamCasePanel"
        role="tabpanel"
        id={`team-case-panel-${activeTab}`}
        aria-labelledby={`team-case-tab-${activeTab}`}
      >
        {activeTab === "inbox" && renderInbox()}
        {activeTab === "cases" && renderCases()}
        {activeTab === "tasks" && renderTasks()}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "roles" && renderRoles()}
      </section>

      {localMessage && (
        <div className="teamSaved" role="status" aria-live="polite">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>
            <strong>Listo.</strong> {localMessage}
          </span>
          <button
            type="button"
            onClick={() => setLocalMessage("")}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      <footer className="teamActionDock">
        <span>
          <ClipboardList size={17} aria-hidden="true" /> La entrada original,
          cada decisión y el resultado permanecen diferenciados.
        </span>
        <button
          type="button"
          className="teamGhostButton"
          onClick={() =>
            announce(
              "Borrador de la mesa guardado. Podés retomar cualquiera de sus pestañas.",
            )
          }
        >
          Guardar borrador
        </button>
      </footer>
    </div>
  );
}

export default TeamCasesWorkflow;
