"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useResidenciales } from "../hooks/useResidenciales";
import { usePrivateCandidateMapLayer } from "../hooks/usePrivateCandidateMapLayer";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Info, Printer, RotateCcw, Search, X } from "lucide-react";

import { consolidateFacilities } from "./facility-presentation";
import { canonicalDepartment } from "../../lib/uruguay.mjs";

type ActorType = "self" | "supporter" | "joint" | null;

const FORM_DEPARTMENTS = [
  "Todos los departamentos",
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

const STEPS = [
  { id: 1, label: "Quién participa" },
  { id: 2, label: "Mis preferencias" },
  { id: 3, label: "Opciones" },
  { id: 4, label: "Visitas" },
  { id: 5, label: "Decisión e ingreso" },
];

const PREFERENCE_OPTIONS = [
  { id: "location", icon: "📍", label: "Seguir cerca de personas y lugares importantes", help: "Barrio, vínculos, servicios, transporte y actividades habituales." },
  { id: "relationships", icon: "🤝", label: "Recibir visitas y mantener vínculos", help: "Contacto familiar, afectivo y comunitario." },
  { id: "privacy", icon: "🔑", label: "Tener intimidad y espacios propios", help: "Higiene, dormitorio, comunicaciones y objetos personales." },
  { id: "routines", icon: "⏰", label: "Mantener rutinas, horarios y costumbres", help: "Continuidad con la historia de vida y las preferencias." },
  { id: "personalSpace", icon: "🖼️", label: "Llevar objetos y hacer propio el dormitorio", help: "Fotografías, muebles pequeños, ropa y recuerdos." },
  { id: "mobility", icon: "♿", label: "Moverme de forma segura y cómoda", help: "Circulación, baños, accesibilidad y apoyos personalizados." },
  { id: "activities", icon: "🎨", label: "Participar en actividades que me interesen", help: "Opciones con sentido, no actividades impuestas." },
  { id: "rest", icon: "🛋️", label: "Poder descansar o estar a solas", help: "El descanso y la tranquilidad también pueden dar bienestar." },
  { id: "autonomy", icon: "🙋‍♂️", label: "Tomar decisiones sobre mi vida cotidiana", help: "Elegir, opinar, cambiar de idea y acordar apoyos." },
  { id: "costs", icon: "📄", label: "Conocer costos y condiciones por escrito", help: "Servicios incluidos, pagos y cambios de precio." },
  { id: "documents", icon: "📁", label: "Mantener acceso a documentos y dinero", help: "Información personal, jubilación, pasividad y pertenencias." },
  { id: "food", icon: "🥗", label: "Alimentación acorde a gustos y necesidades", help: "Menú visible, preferencias y requerimientos personales." },
];

const CHOICE_CATEGORIES = [
  {
    id: "autonomy",
    title: "Trato, autonomía y participación",
    questions: [
      { id: "autonomy.name", essential: true, source: "Ambas fuentes", text: "¿Las personas son llamadas por su nombre o por el nombre que prefieren?", detail: "La guía pública incluye el trato por el nombre como buena señal; Movimiento ELEPEM vincula el nombre o apodo preferido con identidad y reconocimiento." },
      { id: "autonomy.decisions", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Se les pregunta qué quieren y pueden ratificar o cambiar decisiones cotidianas?", detail: "La autodeterminación incluye preguntar aun cuando creemos conocer la respuesta y permitir que la persona ratifique o modifique su elección." },
      { id: "autonomy.conversation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿El personal les habla directamente y las incluye en la conversación?", detail: "La comunicación centrada en la persona supone no ignorarla, permitir que se espere y ayudarla a sentirse escuchada y valorada." },
      { id: "autonomy.participation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Existen espacios para hacer sugerencias y participar en decisiones del establecimiento?", detail: "Movimiento ELEPEM propone espacios formales y cotidianos de participación, además de mecanismos para realizar planteos." },
      { id: "autonomy.supports", essential: true, source: "Criterio del proyecto", text: "¿Los apoyos se adaptan a cada persona sin hacer por ella lo que puede y quiere hacer?", detail: "Este criterio traduce la distinción entre apoyar, acompañar y sustituir decisiones, y la recomendación de evitar la sobreprotección." }
    ]
  },
  {
    id: "life",
    title: "Vida cotidiana, vínculos y actividades",
    questions: [
      { id: "life.location", essential: false, source: "Criterio del proyecto", text: "¿La ubicación permite mantener vínculos y acceder a lugares importantes para la persona?", detail: "Pregunta incorporada para conectar la elección con el proyecto de vida, los vínculos y la inclusión comunitaria." },
      { id: "life.visits", essential: true, source: "Ambas fuentes", text: "¿Los horarios de visita son amplios y se facilita el contacto con familiares y allegados?", detail: "La guía pública considera los horarios amplios una buena señal y las grandes restricciones una señal de atención." },
      { id: "life.communication", essential: false, source: "Ambas fuentes", text: "¿Hay medios y un espacio privado para comunicarse por teléfono o recibir visitas?", detail: "Las fuentes contemplan medios de comunicación elegidos por la persona y un espacio reservado para llamadas y visitas." },
      { id: "life.activities", essential: true, source: "Ambas fuentes", text: "¿Las actividades son variadas y se adaptan a los gustos, posibilidades e intereses de cada persona?", detail: "Las actividades deben relacionarse con los intereses, capacidades y preferencias." },
      { id: "life.rest", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿También se respeta la decisión de descansar, estar a solas o no participar en una actividad?", detail: "Movimiento ELEPEM aclara que descansar, mirar o estar a solas también pueden proporcionar bienestar." },
      { id: "life.menu", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El menú está visible y contempla necesidades y gustos de cada persona?", detail: "La guía pública recomienda que el menú semanal esté a la vista y se confeccione según necesidades y gustos." },
      { id: "life.exit", essential: false, source: "Sistema de Cuidados · 2019", text: "¿La persona puede entrar, salir y mantener comunicación con el exterior con los apoyos que necesite?", detail: "La guía pública incluye la posibilidad de entrar y salir y disponer de medios de comunicación." }
    ]
  },
  {
    id: "privacy",
    title: "Privacidad e intimidad",
    questions: [
      { id: "privacy.hygiene", essential: true, source: "Ambas fuentes", text: "¿Se protege la intimidad durante la higiene y el uso del baño?", detail: "Ambas fuentes destacan puertas cerradas, presencia solo de quienes realizan la atención y respeto del cuerpo y el pudor." },
      { id: "privacy.permission", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Se avisa y se pide permiso antes de entrar a las habitaciones?", detail: "Movimiento ELEPEM lo incluye expresamente como práctica de respeto de la intimidad espacial." },
      { id: "privacy.storage", essential: false, source: "Ambas fuentes", text: "¿Cada persona tiene un lugar propio para guardar objetos personales?", detail: "Las fuentes contemplan dormitorios personalizados y lugares propios para guardar pertenencias." },
      { id: "privacy.visits", essential: false, source: "Ambas fuentes", text: "¿Hay privacidad para recibir visitas y mantener conversaciones?", detail: "La intimidad con las visitas y la comunicación reservada aparecen en ambas fuentes." },
      { id: "privacy.cameras", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Los dormitorios y baños están libres de cámaras de videovigilancia?", detail: "La guía pública identifica cámaras en espacios privados, como dormitorios o baños, como una mala señal." },
      { id: "privacy.consent", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Se informa y se solicita consentimiento antes de usar imágenes o compartir información personal?", detail: "El documento de 2026 reconoce a la persona como titular de la información y recomienda no divulgar imágenes sin consentimiento." }
    ]
  },
  {
    id: "space",
    title: "Espacio y accesibilidad",
    questions: [
      { id: "space.light", essential: false, source: "Sistema de Cuidados · 2019", text: "¿Hay ventilación, luz natural y una temperatura adecuada?", detail: "La guía pública incluye ventilación, luz natural, calefacción y refrigeración adecuadas." },
      { id: "space.circulation", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Se puede circular de forma segura y hay espacio suficiente entre las camas?", detail: "La disposición debe permitir una circulación segura y cómoda; camas unidas sin espacio de paso son una señal de atención." },
      { id: "space.bathrooms", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Los baños son suficientes y accesibles para las personas que viven allí?", detail: "La suficiencia y accesibilidad de los baños forma parte de las buenas señales de la guía pública." },
      { id: "space.locks", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Las habitaciones pueden abrirse desde adentro y no tienen trancas o candados externos?", detail: "La guía pública identifica trancas externas o enganches para candados desde afuera como una mala señal." },
      { id: "space.decorate", essential: false, source: "Ambas fuentes", text: "¿La persona puede llevar elementos personales y hacer propio su dormitorio?", detail: "La guía pública menciona decorar el dormitorio; Movimiento ELEPEM propone que la persona participe en los preparativos." },
      { id: "space.signage", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento está identificado y la persona responsable permite conocer las instalaciones?", detail: "La guía pública incluye cartelería visible y la posibilidad de recorrer las instalaciones como señales favorables." }
    ]
  },
  {
    id: "care",
    title: "Equipo y cuidados",
    questions: [
      { id: "care.director", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Hay una dirección técnica médica y se informa claramente cómo y cuándo contactarla?", detail: "La ausencia de dirección técnica médica es una señal de atención en la guía pública." },
      { id: "care.training", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El personal está formado para cuidar y cuenta con capacitación en primeros auxilios?", detail: "La formación para el cuidado y los primeros auxilios figuran como buena señal." },
      { id: "care.medication", essential: true, source: "Sistema de Cuidados · 2019", text: "¿La medicación está almacenada de forma adecuada?", detail: "El almacenamiento incorrecto de medicación figura como una mala señal en la guía pública." },
      { id: "care.restraints", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento explica si usa medidas físicas de contención, en qué situaciones y con qué controles?", detail: "La guía pública identifica la presencia frecuente de contenciones físicas como señal de atención." },
      { id: "care.diapers", essential: true, source: "Ambas fuentes", text: "¿Los pañales se usan solo cuando existe una razón que lo justifica?", detail: "La guía pública cuestiona el uso 'por precaución' y Movimiento ELEPEM recomienda evitarlo si no existe incontinencia." },
      { id: "care.reference", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Hay una persona cuidadora referente con quien acordar la comunicación y el seguimiento?", detail: "El documento de 2026 recomienda coordinar con una cuidadora referente para facilitar la comunicación." },
      { id: "care.adaptation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Durante la adaptación se escucha a la persona y se ajustan prácticas cuando es necesario?", detail: "Movimiento ELEPEM propone acompañar la adaptación y ajustar apoyos." }
    ]
  },
  {
    id: "contract",
    title: "Contrato, costos y documentación",
    questions: [
      { id: "contract.clear", essential: true, source: "Ambas fuentes", text: "¿El contrato explica con claridad los servicios, costos, forma de pago, derechos y obligaciones?", detail: "La guía pública pide condiciones del servicio y pago explicitadas; el documento de 2026 recomienda revisar el contrato." },
      { id: "contract.consent", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿El contrato y el consentimiento se explican antes de solicitar una firma?", detail: "Movimiento ELEPEM recomienda informar bien su contenido y permitir todas las consultas necesarias antes de firmar." },
      { id: "contract.documents", essential: true, source: "Sistema de Cuidados · 2019", text: "¿La persona mantiene acceso a sus documentos personales y sabe cómo se administrará su dinero?", detail: "La guía pública incluye el acceso a documentos y el manejo de jubilación entre las buenas señales." },
      { id: "contract.proof", essential: true, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento muestra documentación vigente de habilitación o del trámite que corresponda?", detail: "La guía pública recomienda elegir lugares habilitados o en proceso y solicitar documentación probatoria." },
      { id: "contract.questions", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿La persona puede hacer preguntas, pedir una copia y tomarse tiempo para revisar la información?", detail: "El documento de 2026 propone permitir todas las consultas e informar de manera comprensible antes de la firma." }
    ]
  }
];

export function ResidencialesFormView() {
  const { facilities: publicFacilities } = useResidenciales();
  const { facilities: privateCandidateFacilities } = usePrivateCandidateMapLayer();

  const [currentStep, setCurrentStep] = useState(1);
  const [actor, setActor] = useState<ActorType>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("Todos los departamentos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [visitAnswers, setVisitAnswers] = useState<Record<string, "yes" | "no" | "unknown" | "ask">>({});

  // Cargar estado guardado en la sesión
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("alerta_mayor_form_draft");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.currentStep) setCurrentStep(data.currentStep);
        if (data.actor) setActor(data.actor);
        if (Array.isArray(data.selectedPreferences)) setSelectedPreferences(data.selectedPreferences);
        if (data.selectedDepartment) setSelectedDepartment(data.selectedDepartment);
        if (data.selectedFacilityId) setSelectedFacilityId(data.selectedFacilityId);
        else if (Array.isArray(data.selectedFacilities) && data.selectedFacilities.length > 0) {
          setSelectedFacilityId(data.selectedFacilities[0]);
        }
        if (data.visitAnswers && typeof data.visitAnswers === "object") setVisitAnswers(data.visitAnswers);
      }
    } catch {}
  }, []);

  // Persistir cambios en sessionStorage (caché de sesión)
  useEffect(() => {
    try {
      const draft = {
        currentStep,
        actor,
        selectedPreferences,
        selectedDepartment,
        selectedFacilityId,
        visitAnswers,
      };
      sessionStorage.setItem("alerta_mayor_form_draft", JSON.stringify(draft));
    } catch {}
  }, [currentStep, actor, selectedPreferences, selectedDepartment, selectedFacilityId, visitAnswers]);

  const consolidatedFacilities = useMemo(
    () => consolidateFacilities([...publicFacilities, ...privateCandidateFacilities]),
    [privateCandidateFacilities, publicFacilities],
  );

  const displayedFacilities = useMemo(() => {
    const query = searchQuery
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-UY")
      .trim();

    return consolidatedFacilities.filter((fac) => {
      // 1. Filtro estricto por departamento
      if (selectedDepartment !== "Todos los departamentos") {
        if (canonicalDepartment(fac.department) !== canonicalDepartment(selectedDepartment)) {
          return false;
        }
      }

      // 2. Coincidencia exacta de palabras en nombre, calle/dirección o localidad
      if (query) {
        const nameNorm = (fac.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const addressNorm = (fac.address || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const localityNorm = (fac.locality || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const deptNorm = (fac.department || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const matchName = nameNorm.includes(query);
        const matchAddress = addressNorm.includes(query);
        const matchLocality = localityNorm.includes(query);
        const matchDept = deptNorm.includes(query);

        if (!matchName && !matchAddress && !matchLocality && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [consolidatedFacilities, selectedDepartment, searchQuery]);

  const togglePref = (id: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectFacility = (id: string) => {
    setSelectedFacilityId((prev) => (prev === id ? null : id));
  };

  const setAnswer = (questionId: string, answer: "yes" | "no" | "unknown" | "ask") => {
    setVisitAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const resetAll = () => {
    try {
      sessionStorage.removeItem("alerta_mayor_form_draft");
    } catch {}
    setCurrentStep(1);
    setActor(null);
    setSelectedPreferences([]);
    setSelectedDepartment("Todos los departamentos");
    setSearchQuery("");
    setSelectedFacilityId(null);
    setVisitAnswers({});
  };

  return (
    <div className="formViewContainer">
      {/* Barra Superior de Retorno */}
      <div className="formViewTopBar">
        <Link href="/" className="formViewBackLink">
          <ArrowLeft size={18} /> Volver a la búsqueda de ELEPEM
        </Link>
      </div>

      <div className="formViewCard">
        {/* Header Principal */}
        <header className="choiceModalHeader">
          <div className="choiceModalTitleBox">
            <h2>Elegir un lugar para vivir</h2>
            <p>
              Ordená preferencias, prepará visitas, registrá lo que pudiste comprobar y revisá la decisión.
              No es un examen ni un ranking: podés dejar preguntas pendientes, volver atrás y cambiar tus respuestas.
            </p>

            <div className="choiceModalSubbar" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="choiceResetBtn" onClick={resetAll}>
                <RotateCcw size={14} /> Empezar de nuevo
              </button>
            </div>
          </div>
        </header>

        {/* Stepper de Progreso */}
        <nav className="choiceStepperNav">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDone = step.id < currentStep;
            return (
              <button
                key={step.id}
                type="button"
                className={`choiceStepBtn ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className="stepNum">{isDone ? <Check size={14} /> : step.id}</span>
                <span className="stepLabel">{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cuerpo del Paso Actual */}
        <div className="choiceStepBody">
          {/* PASO 1: QUIÉN PARTICIPA */}
          {currentStep === 1 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>¿Quién está completando esta guía?</h3>
                <p>
                  La respuesta cambia el modo de acompañar la decisión, pero no cambia un principio:
                  la voluntad y las preferencias de la persona que podría vivir allí deben estar presentes.
                </p>
              </div>

              <div className="actorCardsGrid">
                <button
                  type="button"
                  className={`actorCard ${actor === "self" ? "selected" : ""}`}
                  onClick={() => setActor("self")}
                >
                  <span className="actorNumber">1</span>
                  <strong>La persona que podría vivir allí</strong>
                  <small>Completo la guía desde mis propias preferencias y observaciones.</small>
                </button>

                <button
                  type="button"
                  className={`actorCard ${actor === "supporter" ? "selected" : ""}`}
                  onClick={() => setActor("supporter")}
                >
                  <span className="actorNumber">2</span>
                  <strong>Una persona que la acompaña</strong>
                  <small>Acompaño el proceso y registro la voluntad y las preferencias de la persona.</small>
                </button>

                <button
                  type="button"
                  className={`actorCard ${actor === "joint" ? "selected" : ""}`}
                  onClick={() => setActor("joint")}
                >
                  <span className="actorNumber">3</span>
                  <strong>La completamos en conjunto</strong>
                  <small>Conversamos y registramos las respuestas entre dos o más personas.</small>
                </button>
              </div>

              {actor === "supporter" && (
                <div className="choiceNoticeBox warning">
                  <Info size={18} />
                  <div>
                    <strong>Acompañar no es decidir por la otra persona.</strong>
                    <p>Mantené informada a la persona mayor y asegurate de escuchar sus inquietudes en cada etapa.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: MIS PREFERENCIAS */}
          {currentStep === 2 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>¿Qué es importante para vos?</h3>
                <p>
                  Marcá todo lo que quieras. Estas prioridades se usarán para ordenar preguntas y revisar opciones,
                  no para producir un puntaje automático.
                </p>
              </div>

              <div className="preferencesGrid">
                {PREFERENCE_OPTIONS.map((pref) => {
                  const isSelected = selectedPreferences.includes(pref.id);
                  return (
                    <button
                      key={pref.id}
                      type="button"
                      className={`prefCard ${isSelected ? "selected" : ""}`}
                      onClick={() => togglePref(pref.id)}
                    >
                      <span className="prefIcon">{pref.icon}</span>
                      <div className="prefCopy">
                        <strong>{pref.label}</strong>
                        <small>{pref.help}</small>
                      </div>
                      <span className="prefCheck">{isSelected ? <Check size={14} /> : null}</span>
                    </button>
                  );
                })}
              </div>

              <p className="selectedCounter">
                <strong>{selectedPreferences.length}</strong> preferencias marcadas.
              </p>
            </div>
          )}

          {/* PASO 3: OPCIONES */}
          {currentStep === 3 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Seleccionar residenciales para evaluar</h3>
                <p>Elegí de la lista consolidada los establecimientos que querés visitar o consultar.</p>
              </div>

              {/* Barra de Búsqueda y Filtro de Departamento */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
                {/* Barrita de búsqueda por tu dirección, dirección del residencial o nombre */}
                <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column" }}>
                  <label
                    htmlFor="formSearchInput"
                    style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#134e4a", fontSize: "0.88rem", height: 20, lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    Buscar por dirección o nombre:
                  </label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <Search
                      size={17}
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#0d9488", pointerEvents: "none" }}
                    />
                    <input
                      id="formSearchInput"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej.: Av. Italia, Las Piedras, Don Martín..."
                      style={{
                        width: "100%",
                        height: 42,
                        paddingLeft: 38,
                        paddingRight: searchQuery ? 36 : 12,
                        borderRadius: 10,
                        border: "1.5px solid #99f6e4",
                        background: "#fff",
                        color: "#0f766e",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          padding: 2,
                        }}
                        title="Limpiar búsqueda"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <small style={{ color: "#0d9488", fontWeight: 700, fontSize: "0.8rem", display: "block", marginTop: 5 }}>
                      {displayedFacilities.length} {displayedFacilities.length === 1 ? "coincidencia exacta encontrada" : "coincidencias exactas encontradas"}.
                    </small>
                  )}
                </div>

                {/* Filtro por departamento */}
                <div style={{ flex: "0 0 220px", minWidth: 180, display: "flex", flexDirection: "column" }}>
                  <label
                    htmlFor="formDeptSelect"
                    style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#134e4a", fontSize: "0.88rem", height: 20, lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    Filtrar por departamento:
                  </label>
                  <select
                    id="formDeptSelect"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1.5px solid #99f6e4",
                      background: "#fff",
                      color: "#0f766e",
                      fontWeight: 750,
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {FORM_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {displayedFacilities.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1", color: "#64748b" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>
                    No se encontraron residenciales con los criterios ingresados.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedDepartment("Todos los departamentos");
                    }}
                    style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "#0d9488", color: "#fff", border: "none", fontWeight: 750, cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    Limpiar filtros y ver todos
                  </button>
                </div>
              ) : (
                <div className="facilityPickerGrid">
                  {displayedFacilities.map((fac) => {
                    const isChecked = selectedFacilityId === fac.id;
                    const badges: { label: string; tone: string }[] = [];
                    if (fac.mspFinal) badges.push({ label: "Habilitados", tone: "green" });
                    if (fac.midesSocial) badges.push({ label: "Certificados", tone: "amber" });
                    if (!fac.mspFinal && !fac.midesSocial) {
                      badges.push({ label: "Situación no confirmada", tone: "gray" });
                    }

                    return (
                      <button
                        key={fac.id}
                        type="button"
                        className={`facilityPickCard ${isChecked ? "selected" : ""}`}
                        onClick={() => selectFacility(fac.id)}
                      >
                        <span className="pickCheck">{isChecked ? <Check size={14} /> : null}</span>
                        <div>
                          <strong>{fac.name}</strong>
                          <p>{fac.address ? `${fac.address} · ` : ""}{fac.locality || fac.department}</p>
                          <div className="facilityBadges" style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {badges.map((b) => (
                              <span key={b.label} className={`sourceBadge sourceBadge-${b.tone}`}>
                                {b.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASO 4: VISITAS */}
          {currentStep === 4 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Prepará y registrá la visita</h3>
                <p>
                  No hace falta responder todo. “No pude comprobarlo” y “Quiero preguntarlo” son respuestas válidas.
                  Podés volver en otro día u horario para completar la información.
                </p>
              </div>

              <div className="choiceCategoryList" style={{ display: "grid", gap: 14 }}>
                {CHOICE_CATEGORIES.map((cat, ci) => (
                  <details key={cat.id} className="choiceCategoryBlock" open={ci === 0} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
                    <summary style={{ padding: "14px 18px", fontWeight: 800, background: "#f8fafc", color: "#0f172a", cursor: "pointer", fontSize: "0.95rem" }}>
                      {cat.title}
                    </summary>
                    <div className="choiceCategoryQuestions" style={{ padding: 16, display: "grid", gap: 16 }}>
                      {cat.questions.map((q, qi) => {
                        const currentAnswer = visitAnswers[q.id];
                        return (
                          <div key={q.id} className="questionItem" style={{ borderBottom: qi < cat.questions.length - 1 ? "1px solid #e2e8f0" : "none", paddingBottom: 14 }}>
                            <div className="qHeader">
                              <h4 style={{ margin: "4px 0 6px", fontSize: "0.92rem", color: "#0f172a", fontWeight: 750, lineHeight: 1.4 }}>{q.text}</h4>
                            </div>
                            <div className="qActions" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                              <button
                                type="button"
                                className={`ansBtn ansYes ${currentAnswer === "yes" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "yes")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "yes" ? "#dcfce7" : "#fff", color: currentAnswer === "yes" ? "#15803d" : "#475569", borderColor: currentAnswer === "yes" ? "#86efac" : "#cbd5e1" }}
                              >
                                Sí, lo confirmé
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansNo ${currentAnswer === "no" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "no")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "no" ? "#fee2e2" : "#fff", color: currentAnswer === "no" ? "#b91c1c" : "#475569", borderColor: currentAnswer === "no" ? "#fca5a5" : "#cbd5e1" }}
                              >
                                No / me preocupó
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansUnknown ${currentAnswer === "unknown" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "unknown")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "unknown" ? "#fef3c7" : "#fff", color: currentAnswer === "unknown" ? "#b45309" : "#475569", borderColor: currentAnswer === "unknown" ? "#fcd34d" : "#cbd5e1" }}
                              >
                                No pude comprobarlo
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansAsk ${currentAnswer === "ask" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "ask")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "ask" ? "#e0f2fe" : "#fff", color: currentAnswer === "ask" ? "#0369a1" : "#475569", borderColor: currentAnswer === "ask" ? "#7dd3fc" : "#cbd5e1" }}
                              >
                                Quiero preguntarlo
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>

              {/* Bloque de Fuentes de Información y Trazabilidad */}
              <div className="choiceSourcesFooterBox" style={{ marginTop: 24, padding: "20px 24px", borderRadius: 14, background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem", color: "#0f172a", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  <ExternalLink size={17} /> Fuentes de información y trazabilidad normativa
                </h4>
                <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#475569", lineHeight: 1.45 }}>
                  Las preguntas y criterios de observación de esta guía fueron elaborados a partir de las publicaciones oficiales y documentos técnicos de referencia en Uruguay:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <a
                    href="https://itolluaivfoxnaohbsdk.supabase.co/storage/v1/object/public/pdf/BUENAS%20PRACTICAS%20DE%20CUIDADO%20DESDE%20EL%20ROL%20FAMILIAR-ALLEGADO.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.86rem", color: "#0369a1", fontWeight: 750, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    📄 Buenas Prácticas de Cuidado desde el Rol del Familiar/Allegado de la Persona Mayor Residente en ELEPEM (Junio 2026) ↗
                  </a>
                  <a
                    href="https://itolluaivfoxnaohbsdk.supabase.co/storage/v1/object/public/pdf/Recomendaciones.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.86rem", color: "#0369a1", fontWeight: 750, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    🤝 Movimiento de Familiares y Residentes de ELEPEM · Guía ELEPEM ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: DECISIÓN E INGRESO */}
          {currentStep === 5 && (
            <div className="stepContainer printableReportArea">
              <div className="stepHeader no-print">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Resumen para conversar en familia</h3>
                <p>Revisá lo completado y prepará la conversación final respetando la voluntad de la persona.</p>
              </div>

              {/* Cabezal exclusivo para impresión */}
              <div className="printOnlyHeader" style={{ display: "none", marginBottom: 20, borderBottom: "2px solid #0f766e", paddingBottom: 12 }}>
                <h2 style={{ margin: 0, color: "#0f766e", fontSize: "1.4rem" }}>Más Cerca · Guía de Elección de Residenciales</h2>
                <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "0.85rem" }}>
                  Informe de cotejo y observaciones completado el {new Date().toLocaleDateString("es-UY")}
                </p>
              </div>

              <div className="summaryResultsBox" style={{ display: "grid", gap: 20 }}>
                <div className="summarySection" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 6px", color: "#0f766e", fontSize: "0.95rem", fontWeight: 800 }}>1. Participación</h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>
                    {actor === "self" && "Completado por la persona que vivirá allí."}
                    {actor === "supporter" && "Completado por un acompañante con consulta a la persona."}
                    {actor === "joint" && "Completado en conjunto."}
                    {!actor && "Sin especificar."}
                  </p>
                </div>

                <div className="summarySection" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 8px", color: "#0f766e", fontSize: "0.95rem", fontWeight: 800 }}>
                    2. Preferencias destacadas ({selectedPreferences.length})
                  </h4>
                  <div className="summaryTagsRow" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedPreferences.length === 0 ? (
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Sin preferencias marcadas.</span>
                    ) : (
                      selectedPreferences.map((id) => {
                        const pref = PREFERENCE_OPTIONS.find((p) => p.id === id);
                        return pref ? (
                          <span key={id} style={{ padding: "6px 12px", borderRadius: 20, background: "#ccfbf1", color: "#0f766e", fontSize: "0.84rem", fontWeight: 750 }}>
                            {pref.icon} {pref.label}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </div>

                {/* 3. Residencial Seleccionado */}
                {(() => {
                  const chosenFacility = selectedFacilityId
                    ? consolidatedFacilities.find((f) => f.id === selectedFacilityId)
                    : null;

                  return (
                    <div className="summarySection" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                      <h4 style={{ margin: "0 0 8px", color: "#0f766e", fontSize: "0.95rem", fontWeight: 800 }}>
                        3. Residencial seleccionado para evaluar
                      </h4>
                      {!chosenFacility ? (
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Sin residencial seleccionado aún.</p>
                      ) : (
                        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fff", border: "1.5px solid #99f6e4" }}>
                          <strong style={{ color: "#0f172a", fontSize: "0.95rem", display: "block" }}>{chosenFacility.name}</strong>
                          <span style={{ color: "#475569", fontSize: "0.85rem", display: "block", marginTop: 2 }}>
                            {chosenFacility.address ? `${chosenFacility.address} · ` : ""}{chosenFacility.locality || chosenFacility.department}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Desglose completo de Preguntas y Respuestas registradas en la Visita */}
                <div className="summarySection" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <h4 style={{ margin: "0 0 12px", color: "#0f766e", fontSize: "0.95rem", fontWeight: 800 }}>
                    4. Registro de observaciones y preguntas de visita
                  </h4>
                  <div style={{ display: "grid", gap: 16 }}>
                    {CHOICE_CATEGORIES.map((cat) => (
                      <div key={cat.id} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14 }}>
                        <h5 style={{ margin: "0 0 10px", color: "#0f172a", fontSize: "0.88rem", fontWeight: 800 }}>{cat.title}</h5>
                        <div style={{ display: "grid", gap: 10 }}>
                          {cat.questions.map((q) => {
                            const ans = visitAnswers[q.id];
                            let badgeText = "Sin responder";
                            let bg = "#f1f5f9";
                            let fg = "#64748b";
                            let border = "#cbd5e1";

                            if (ans === "yes") {
                              badgeText = "✓ Sí, lo confirmé";
                              bg = "#dcfce7";
                              fg = "#15803d";
                              border = "#86efac";
                            } else if (ans === "no") {
                              badgeText = "✕ No / me preocupó";
                              bg = "#fee2e2";
                              fg = "#b91c1c";
                              border = "#fca5a5";
                            } else if (ans === "unknown") {
                              badgeText = "? No pude comprobarlo";
                              bg = "#fef3c7";
                              fg = "#b45309";
                              border = "#fcd34d";
                            } else if (ans === "ask") {
                              badgeText = "💬 Quiero preguntarlo";
                              bg = "#e0f2fe";
                              fg = "#0369a1";
                              border = "#7dd3fc";
                            }

                            return (
                              <div key={q.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, paddingBottom: 6, borderBottom: "1px dashed #e2e8f0" }}>
                                <span style={{ fontSize: "0.84rem", color: "#334155", fontWeight: 650, flex: "1 1 240px" }}>{q.text}</span>
                                <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 800, background: bg, color: fg, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
                                  {badgeText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Declaración Final al Pie del Formulario / Informe */}
                {(() => {
                  const chosenFacility = selectedFacilityId
                    ? consolidatedFacilities.find((f) => f.id === selectedFacilityId)
                    : null;

                  return (
                    <div
                      className="summarySection chosenFacilityFooterDeclaration"
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        color: "#166534",
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: 4, fontWeight: 800 }}>
                        📌 Declaración del informe
                      </strong>
                      <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.45 }}>
                        {chosenFacility
                          ? `Este formulario fue respondido para el residencial "${chosenFacility.name}"${
                              chosenFacility.address
                                ? ` (${chosenFacility.address}, ${chosenFacility.locality || chosenFacility.department})`
                                : ` (${chosenFacility.locality || chosenFacility.department})`
                            }.`
                          : "Este formulario fue respondido sin seleccionar un residencial específico."}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer de Navegación del Formulario */}
        <footer className="choiceModalFooter no-print">
          <button
            type="button"
            className="stepBackBtn"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <ArrowLeft size={16} /> Anterior
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              className="stepNextBtn"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
            >
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="stepNextBtn"
              onClick={() => window.print()}
              style={{
                background: "#0d9488",
                borderColor: "#0f766e",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Printer size={16} /> Imprimir / Descargar resumen
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
