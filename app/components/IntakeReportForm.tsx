"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Mail, MapPin, Mic, Paperclip, Phone, ShieldAlert, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Facility } from "./map-types";

type IntakeDraft = {
  setting: string;
  concerns: string[];
  narrative: string;
  department: string;
  city: string;
  locality: string;
  streetAddress: string;
  doorNumber: string;
  facilityName: string;
  unknownAddress: boolean;
  reporter: string;
  reporterName: string;
  urgency: "Alta" | "Media" | "Baja" | "";
  privacy: string;
  contactEmail: string;
  contactPhone: string;
  contactMethod: string;
  safeContact: string;
  noEarlyContact: boolean;
};

const initialDraft: IntakeDraft = {
  setting: "",
  concerns: [],
  narrative: "",
  department: "",
  city: "",
  locality: "",
  streetAddress: "",
  doorNumber: "",
  facilityName: "",
  unknownAddress: false,
  reporter: "",
  reporterName: "",
  urgency: "",
  privacy: "",
  contactEmail: "",
  contactPhone: "",
  contactMethod: "Sin contacto",
  safeContact: "",
  noEarlyContact: false,
};

const places = ["En su casa o comunidad", "En un residencial / ELEPEM", "En otro servicio", "No se conoce"];
const concerns = [
  "Violencia, amenazas o humillación",
  "Negligencia, abandono o falta de cuidados",
  "Dinero, préstamos, documentos o bienes",
  "Control, aislamiento, encierro o represalias",
  "Medicación, salud, caída o accidente",
  "Necesidad de cuidados o apoyos",
  "Riesgo o irregularidad en un residencial",
  "No sé cómo clasificarlo",
];

const URGENCY_OPTIONS = [
  { label: "Hay peligro inmediato o necesita atención médica urgente", value: "Alta" as const },
  { label: "Necesita atención pronto, aunque no parece una emergencia", value: "Media" as const },
  { label: "No parece haber urgencia inmediata", value: "Baja" as const },
  { label: "No lo sé", value: "Baja" as const },
];
const departments = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres", "No se conoce"];

const deptCoords: Record<string, [number, number]> = {
  "Artigas": [-30.4, -56.5],
  "Canelones": [-34.52, -56.0],
  "Cerro Largo": [-32.36, -54.15],
  "Colonia": [-33.87, -57.84],
  "Durazno": [-33.38, -56.52],
  "Flores": [-33.52, -56.89],
  "Florida": [-34.09, -56.21],
  "Lavalleja": [-33.91, -55.24],
  "Maldonado": [-34.9, -55.0],
  "Montevideo": [-34.9, -56.19],
  "Paysandú": [-32.32, -58.08],
  "Río Negro": [-33.09, -58.02],
  "Rivera": [-30.9, -55.55],
  "Rocha": [-34.49, -54.34],
  "Salto": [-31.39, -57.96],
  "San José": [-34.34, -56.71],
  "Soriano": [-33.47, -57.8],
  "Tacuarembó": [-31.73, -55.98],
  "Treinta y Tres": [-33.23, -54.37],
};

type ErrorTarget = "concerns" | "location" | "identity" | "consent";
type FieldError = { target: ErrorTarget; text: string };

function RequiredMark() {
  return <span className="requiredMark">(obligatorio)</span>;
}

function FieldGroup({
  target,
  error,
  register,
  children,
}: {
  target: ErrorTarget;
  error: FieldError | null;
  register: (target: ErrorTarget, node: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const invalid = error?.target === target;
  return (
    <div
      className={invalid ? "reportFieldGroup hasError" : "reportFieldGroup"}
      ref={(node) => register(target, node)}
      tabIndex={-1}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `error-${target}` : undefined}
    >
      {children}
      {invalid && (
        <p className="reportFieldError" id={`error-${target}`}>
          <AlertTriangle size={17} aria-hidden="true"/>
          <span>{error.text}</span>
        </p>
      )}
    </div>
  );
}

function OptionGrid({ options, selected, onSelect, multiple = false }: { options: string[]; selected: string | string[]; onSelect: (value: string) => void; multiple?: boolean }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return <div className="reportOptionGrid isCompact">{options.map((option) => {
    const isSelected = selectedValues.includes(option);
    return <button key={option} type="button" className={`reportOption ${isSelected ? "isSelected" : ""}`} aria-pressed={isSelected} onClick={() => onSelect(option)}>
      <span className="reportOptionCopy"><strong>{option}</strong></span>
      {multiple && <span className="reportOptionCheck">{isSelected ? <CheckCircle2 size={16}/> : "+"}</span>}
    </button>;
  })}</div>;
}

type LocationSnapshot = { department: string; city: string; locality: string; streetAddress: string; doorNumber: string };

function LocationMap({ location }: { location: LocationSnapshot }) {
  const { department, city, locality, streetAddress, doorNumber } = location;
  const [exactCoords, setExactCoords] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    const fullQuery = [streetAddress, doorNumber, locality, city, department, "Uruguay"].filter(Boolean).join(", ");
    if (!streetAddress.trim() && !locality.trim() && !city.trim()) {
      setExactCoords(null);
      return;
    }

    void (async () => {
      setIsGeocoding(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            setExactCoords([lat, lon]);
          }
        }
      } catch {
        // fallback a coords departamento
      } finally {
        setIsGeocoding(false);
      }
    })();
  }, [department, city, locality, streetAddress, doorNumber]);

  const baseCoords = deptCoords[department];
  if (!baseCoords && !exactCoords) return null;

  const [lat, lng] = exactCoords || baseCoords || [-32.8, -56.0];
  const delta = exactCoords ? 0.005 : 0.35;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;

  const locationText = [streetAddress, doorNumber, locality || city, department].filter(Boolean).join(", ");

  return (
    <div className="reportLocationMap">
      <iframe src={src} title={`Mapa — ${locationText}`} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />
      <small>
        <MapPin size={12}/> {exactCoords ? `Ubicación exacta encontrada: ${locationText}` : isGeocoding ? "Buscando dirección exacta..." : `Referencia aproximada · ${department}, Uruguay`}
      </small>
    </div>
  );
}

function AudioRecorder({ onAudioRecorded, onAudioCleared }: { onAudioRecorded: (file: File) => void; onAudioCleared: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const supportedType = typeof MediaRecorder !== "undefined" && (
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
        MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg" : ""
      );

      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const rawType = recorder.mimeType || "audio/webm";
        const cleanType = rawType.split(";")[0] || "audio/webm";
        const extension = cleanType.includes("mp4") ? "mp4" : cleanType.includes("ogg") ? "ogg" : "webm";
        
        const blob = new Blob(chunks, { type: cleanType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        const audioFile = new File([blob], `relato_voz_${Date.now()}.${extension}`, { type: cleanType });
        onAudioRecorded(audioFile);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      setMicError("No se pudo acceder al micrófono. Verificá los permisos de tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    onAudioCleared();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainderSecs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainderSecs).padStart(2, "0")}`;
  };

  return (
    <div className="reportAudioBox">
      <div className="reportAudioHeader">
        <Mic size={20} className="reportAudioHeaderIcon" />
        <div>
          <strong>Grabá un mensaje de voz</strong>
          <small>Si preferís hablar antes que escribir, grabá tu relato acá.</small>
        </div>
      </div>

      {!audioUrl && !isRecording && (
        <div className="reportAudioAction">
          <button type="button" className="reportMicButton" onClick={startRecording} aria-label="Iniciar grabación de voz">
            <Mic size={30} />
          </button>
          <span className="reportMicHelp">Tocá para grabar</span>
        </div>
      )}

      {isRecording && (
        <div className="reportAudioAction isRecording">
          <span className="reportMicStage">
            <span className="reportMicPulse" aria-hidden="true" />
            <button type="button" className="reportStopButton" onClick={stopRecording} aria-label="Detener grabación">
              <Square size={22} fill="currentColor" />
            </button>
          </span>
          <div className="reportRecordingStatus">
            <strong><span className="reportRecDot" aria-hidden="true" />Grabando… {formatSeconds(recordingTime)}</strong>
            <small>Tocá el cuadrado para finalizar</small>
          </div>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="reportAudioResult">
          <div className="reportAudioSuccessNotice">
            <CheckCircle2 size={18} color="#16a34a" />
            <span><strong>Tu audio quedó registrado</strong></span>
          </div>

          <audio src={audioUrl} controls className="reportAudioPlayer" />

          <button type="button" className="reportAudioDeleteButton" onClick={clearAudio}>
            <Trash2 size={15} /> Borrar audio
          </button>
        </div>
      )}

      {micError && <p className="reportMicError" role="alert">{micError}</p>}
    </div>
  );
}


export function IntakeReportForm({
  initialConcerns = [],
  initialNarrative = "",
  initialFacility = null,
  enabled = false,
}: {
  initialConcerns?: string[];
  initialNarrative?: string;
  initialFacility?: Facility | null;
  enabled?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<IntakeDraft>(() => ({
    ...initialDraft,
    setting: initialFacility ? "En un residencial / ELEPEM" : initialDraft.setting,
    facilityName: initialFacility ? initialFacility.name : initialDraft.facilityName,
    department: initialFacility ? initialFacility.department : initialDraft.department,
    locality: initialFacility ? initialFacility.locality : initialDraft.locality,
    streetAddress: initialFacility ? initialFacility.address : initialDraft.streetAddress,
    concerns: initialConcerns.filter((concern) => concerns.includes(concern)),
    narrative: initialNarrative,
  }));
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const errorAnchors = useRef<Partial<Record<ErrorTarget, HTMLDivElement | null>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [attachmentState, setAttachmentState] = useState<"idle" | "uploading" | "complete" | "partial">("idle");
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [emailNotice, setEmailNotice] = useState("");
  const [selectedUrgencyText, setSelectedUrgencyText] = useState("");
  
  // La asistencia de ubicación sólo consulta servicios externos después de
  // una acción explícita. Escribir en los campos nunca dispara geocodificación.
  type AddressSuggestionItem = {
    displayName: string;
    road: string;
    houseNumber: string;
    suburb: string;
    city: string;
    department: string;
  };
  
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestionItem[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [locationSnapshot, setLocationSnapshot] = useState<LocationSnapshot | null>(null);
  const [locationLookupStatus, setLocationLookupStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");

  const update = <Key extends keyof IntakeDraft>(key: Key, value: IntakeDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleConcern = (concern: string) => update("concerns", draft.concerns.includes(concern) ? draft.concerns.filter((item) => item !== concern) : [...draft.concerns, concern]);
  const locationSummary = [draft.city, draft.locality, draft.streetAddress, draft.doorNumber].filter(Boolean).join(" · ");

  const lookupLocation = async () => {
    const query = draft.streetAddress.trim();
    const snapshot = {
      department: draft.department,
      city: draft.city,
      locality: draft.locality,
      streetAddress: draft.streetAddress,
      doorNumber: draft.doorNumber,
    };
    setLocationSnapshot(snapshot);
    setLocationLookupStatus("loading");
    const fullQuery = [query, draft.locality, draft.city, draft.department, "Uruguay"].filter(Boolean).join(", ");
    try {
      if (query.length >= 3) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(fullQuery)}&limit=5`);
        if (!res.ok) throw new Error("location-lookup-failed");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const suggestions: AddressSuggestionItem[] = data.map((item: { display_name: string; address?: Record<string, string> }) => {
            const addr = item.address || {};
            const matchedDept = departments.find((d) => 
              d !== "No se conoce" && (
                item.display_name.toLowerCase().includes(d.toLowerCase()) || 
                (addr.state && addr.state.toLowerCase().includes(d.toLowerCase())) ||
                (addr.county && addr.county.toLowerCase().includes(d.toLowerCase()))
              )
            ) || "";

            const roadName = addr.road || addr.pedestrian || addr.street || item.display_name.split(",")[0];
            const houseNo = addr.house_number || "";
            const sub = addr.suburb || addr.neighbourhood || addr.quarter || "";
            const cty = addr.city || addr.town || addr.village || addr.municipality || "";

            return {
              displayName: item.display_name,
              road: houseNo && !roadName.includes(houseNo) ? `${roadName} ${houseNo}` : roadName,
              houseNumber: houseNo,
              suburb: sub,
              city: cty,
              department: matchedDept,
            };
          }).slice(0, 5);

          setAddressSuggestions(suggestions);
          setShowAddressSuggestions(true);
          setLocationLookupStatus("idle");
        } else {
          setAddressSuggestions([]);
          setShowAddressSuggestions(false);
          setLocationLookupStatus("empty");
        }
      } else {
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        setLocationLookupStatus("idle");
      }
    } catch {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setLocationLookupStatus("error");
    }
  };

  const selectSuggestion = (item: AddressSuggestionItem) => {
    update("streetAddress", item.road || item.displayName);
    if (item.houseNumber) update("doorNumber", item.houseNumber);
    if (item.suburb) update("locality", item.suburb);
    if (item.city) update("city", item.city);
    if (item.department) update("department", item.department);
    setLocationSnapshot({
      department: item.department || draft.department,
      city: item.city || draft.city,
      locality: item.suburb || draft.locality,
      streetAddress: item.road || item.displayName,
      doorNumber: item.houseNumber || draft.doorNumber,
    });
    setShowAddressSuggestions(false);
  };

  const validate = (): FieldError | null => {
    // Validación Paso 1
    if (step === 1) {
      const hasConcern = draft.concerns.length > 0;
      const hasNarrative = draft.narrative.trim().length > 0;
      const isUnclassified = draft.concerns.includes("No sé cómo clasificarlo");

      if (!hasConcern && !hasNarrative) {
        return { target: "concerns", text: "Elegí al menos una preocupación o contá brevemente qué está pasando." };
      }

      if (isUnclassified && !hasNarrative) {
        return { target: "concerns", text: "Al elegir 'No sé cómo clasificarlo', escribí una breve explicación de lo que ocurre." };
      }
    }

    // Validación Paso 2
    if (step === 2) {
      const hasAddress = Boolean(draft.streetAddress.trim());
      const hasDept = Boolean(draft.department && draft.department !== "No se conoce");
      const hasCityOrLocality = Boolean(draft.city.trim() || draft.locality.trim());
      const hasFacilityName = Boolean(draft.facilityName.trim());
      const isUnknownAddr = draft.unknownAddress;
      const hasAnyRef = Boolean(draft.streetAddress.trim() || draft.locality.trim() || draft.city.trim() || draft.narrative.trim());

      const isValidLocation =
        hasAddress ||
        (hasDept && hasCityOrLocality) ||
        (hasFacilityName && (hasCityOrLocality || hasDept)) ||
        (isUnknownAddr && hasAnyRef);

      if (!isValidLocation) {
        return { target: "location", text: "Indicá una dirección o referencia, o especificá departamento y ciudad/barrio para ubicar el lugar." };
      }
    }

    if (step === 3 && (!draft.privacy || !draft.reporter)) {
      return { target: "identity", text: "Completá la privacidad y quién comunica la situación." };
    }
    if (step === 3 && draft.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) {
      return { target: "identity", text: "Revisá el formato del correo electrónico." };
    }
    if (step === 3 && draft.contactPhone.trim() && !/^[+()0-9\s.-]{6,24}$/.test(draft.contactPhone.trim())) {
      return { target: "identity", text: "Revisá el número de celular. Puede incluir prefijo, espacios, guiones y paréntesis." };
    }
    if (step === 4 && !consent) {
      return { target: "consent", text: "Confirmá que este ejercicio se guardará sólo para la demostración." };
    }
    return null;
  };

  const registerAnchor = (target: ErrorTarget, node: HTMLDivElement | null) => {
    errorAnchors.current[target] = node;
  };

  const showError = (failure: FieldError) => {
    setError(failure);
    const anchor = errorAnchors.current[failure.target];
    anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    anchor?.focus({ preventScroll: true });
  };

  const advance = () => {
    const failure = validate();
    if (failure) return showError(failure);
    setError(null);
    if (step < 4) setStep((current) => current + 1);
  };

  const submit = async () => {
    const failure = validate();
    if (failure) return showError(failure);
    setError(null);
    setSubmitting(true);
    setFormMessage("");
    try {
      const response = await fetch("/api/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            setting: draft.setting,
            reporter: draft.reporter,
            reporterName: draft.reporterName,
            channel: "Formulario web / app",
            location: {
              department: draft.department,
              reference: locationSummary || (draft.unknownAddress ? "Dirección exacta no conocida (ver referencias)" : "No especificada"),
            },
            facility: { name: draft.facilityName || null },
            concerns: draft.concerns,
            narrative: draft.narrative,
            risks: ["Por evaluar por el equipo"],
            privacy: draft.privacy,
            contactEmail: draft.contactEmail,
            contactPhone: draft.contactPhone,
            contactMethod: draft.contactMethod,
            safeContact: draft.safeContact,
            noEarlyContact: draft.noEarlyContact,
            preliminaryPriority: draft.urgency || "Baja",
            suggestedRoute: [],
          },
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("caseCode" in data) || typeof data.caseCode !== "string") {
        const error = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudo guardar la comunicación. Intentá nuevamente.";
        throw new Error(error);
      }
      const savedCaseCode = data.caseCode;
      const uploadToken = "uploadToken" in data && typeof data.uploadToken === "string" ? data.uploadToken : "";
      setCaseCode(savedCaseCode);
      try { window.sessionStorage.setItem("alerta-mayor-last-code", savedCaseCode); } catch {}
      const notification = "emailNotification" in data && data.emailNotification && typeof data.emailNotification === "object"
        ? data.emailNotification as Record<string, unknown>
        : null;
      if (draft.contactEmail.trim()) {
        setEmailNotice(notification?.sent === true
          ? `También enviamos el código a ${draft.contactEmail.trim()}.`
          : "El correo quedó registrado. El envío automático se habilitará al configurar Resend.");
      }
      if (files.length) {
        setAttachmentState("uploading");
        let uploaded = 0;
        for (const file of files) {
          const formData = new FormData();
          formData.set("file", file);
          formData.set("uploadToken", uploadToken);
          try {
            const uploadResponse = await fetch(`/api/intake-reports/${encodeURIComponent(savedCaseCode)}/attachments`, {
              method: "POST",
              body: formData,
            });
            if (uploadResponse.ok) {
              uploaded++;
            }
          } catch {}
        }
        setUploadedFileCount(uploaded);
        setAttachmentState(uploaded === files.length ? "complete" : "partial");
      }
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "No se pudo guardar la comunicación. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };


  const copyCaseCode = async () => {
    try {
      await navigator.clipboard.writeText(caseCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  };

  const addFiles = (nextFiles: FileList | null) => {
    if (!nextFiles) return;
    const allowed = Array.from(nextFiles).filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);
    const merged = [...files, ...allowed].slice(0, 5);
    setFiles(merged);
    if (Array.from(nextFiles).some((file) => file.size > 10 * 1024 * 1024)) {
      setFormMessage("Cada archivo puede pesar hasta 10 MB. Los archivos más grandes no se agregaron.");
    } else if (files.length + nextFiles.length > 5) {
      setFormMessage("Podés adjuntar hasta 5 archivos.");
    } else {
      setFormMessage("");
    }
  };

  if (caseCode) return <section className="reportFlow reportSuccess">
    <div className="reportSuccessMark"><CheckCircle2 size={36}/></div>
    <h1>Recibimos tu comunicación</h1>
    <p className="reportTrackingWarning"><strong>Guardá este código.</strong> Lo vas a necesitar para seguir el avance o hacer un reclamo sobre esta comunicación.</p>
    
    <div className="reportTrackingCodeClean">
      <code>{caseCode}</code>
      <button type="button" className="reportCopyButtonClean" onClick={() => void copyCaseCode()}>
        {copyState === "copied" ? <Check size={16}/> : <Copy size={16}/>} 
        {copyState === "copied" ? "Copiado" : "Copiar código"}
      </button>
    </div>

    {copyState === "error" && <p className="reportCopyError" role="alert">No se pudo copiar automáticamente. Seleccioná el código y copialo manualmente.</p>}
    {emailNotice && <p className="reportSuccessNotice"><Mail size={17}/>{emailNotice}</p>}
    {attachmentState === "uploading" && <p className="reportSuccessNotice"><Paperclip size={17}/>Subiendo {files.length} {files.length === 1 ? "archivo" : "archivos"}…</p>}
    {attachmentState === "complete" && <p className="reportSuccessNotice isComplete"><Check size={17}/>{uploadedFileCount} {uploadedFileCount === 1 ? "archivo guardado" : "archivos guardados"} como evidencia privada.</p>}
    {attachmentState === "partial" && <p className="reportSuccessNotice isWarning"><ShieldAlert size={17}/>La comunicación se guardó, pero sólo se pudieron adjuntar {uploadedFileCount} de {files.length} archivos.</p>}
    
    <div className="reportSuccessSingleAction" style={{display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "24px"}}>
      {caseCode && (
        <Link className="reportBack" href={`/seguimiento?codigo=${encodeURIComponent(caseCode)}`}>
          Consultar el estado ahora
        </Link>
      )}
      <Link className="reportContinue" href="/">
        Volver al inicio <ArrowRight size={17}/>
      </Link>
    </div>
  </section>;

  const stageTitle = step === 1 ? "¿Qué está pasando?" : step === 2 ? "¿Dónde ocurre?" : step === 3 ? "Privacidad y contacto" : "Revisá y enviá";


  return <section className="reportFlow">
    <header className="reportFlowHeader">
      <h1>{stageTitle}</h1>
      <p className="lead">
        {step === 1
          ? "Elegí al menos una preocupación o contá brevemente qué está pasando."
          : step === 2
          ? "Brindá datos suficientes para localizar el lugar de la situación."
          : "Completá según tus preferencias de privacidad."}
      </p>
      {!enabled && <p className="notice" role="status">La recepción demo está desactivada. Podés recorrer el formulario, pero el envío requiere habilitar el entorno de demostración.</p>}
    </header>

    <nav className="reportStepper reportStepperFour" aria-label="Pasos de la comunicación">
      {["Situación", "Lugar", "Privacidad y contacto", "Revisión"].map((label, index) => <button key={label} type="button" className={`reportStep ${step === index + 1 ? "isCurrent" : ""} ${step > index + 1 ? "isComplete" : ""}`} onClick={() => index + 1 < step && setStep(index + 1)} disabled={index + 1 > step || submitting} aria-current={step === index + 1 ? "step" : undefined}><span className="reportStepNumber">{step > index + 1 ? <CheckCircle2 size={15}/> : index + 1}</span><span className="reportStepLabel">{label}</span></button>)}
    </nav>

    <div className="reportStage">
      {step === 1 && <>
        <p className="reportStageHelp">Elegí al menos una preocupación o contá brevemente qué está pasando. No es necesario completar ambas cosas.</p>
        <h3 className="reportSubheading">¿Hay riesgo ahora?</h3>
        <div className="reportOptionGrid isCompact">
          {URGENCY_OPTIONS.map((opt) => {
            const isSelected = selectedUrgencyText === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                className={`reportOption ${isSelected ? "isSelected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedUrgencyText(opt.label);
                  update("urgency", opt.value);
                }}
              >
                <span className="reportOptionCopy"><strong>{opt.label}</strong></span>
              </button>
            );
          })}
        </div>
        <div className="privacyNotice privacyNotice-gray" style={{ marginTop: "10px", marginBottom: "18px" }}>
          En una emergencia llamá al 911, a Bomberos o a una emergencia médica. Este formulario no sustituye una respuesta inmediata.
        </div>
        <h3 className="reportSubheading">Ámbito</h3>
        <OptionGrid options={places} selected={draft.setting} onSelect={(value) => update("setting", value)} />
        <FieldGroup target="concerns" error={error} register={registerAnchor}>
        <h3 className="reportSubheading">Preocupación <RequiredMark/></h3>
        <OptionGrid options={concerns} selected={draft.concerns} onSelect={toggleConcern} multiple />
        <div className="reportNarrativeColumns">
          <label className="reportField">
            <span>
              Contá brevemente qué está pasando
              {draft.concerns.includes("No sé cómo clasificarlo") && <em style={{color: "#d97706", fontStyle: "normal", marginLeft: "6px"}}>(Obligatorio para “No sé cómo clasificarlo”)</em>}
            </span>
            <textarea value={draft.narrative} onChange={(event) => update("narrative", event.target.value)} placeholder="Si preferís, escribí un resumen breve de la situación." />
          </label>

          <AudioRecorder
            onAudioRecorded={(audioFile) => {
              setFiles((current) => [...current.filter((f) => !f.name.startsWith("relato_voz_")), audioFile]);
            }}
            onAudioCleared={() => {
              setFiles((current) => current.filter((f) => !f.name.startsWith("relato_voz_")));
            }}
          />
        </div>
        </FieldGroup>

        {/* Imágenes o pruebas adjuntas en el Paso 1 */}
        <div className="reportAttachments">
          <div className="reportAttachmentsHeading">
            <span><Paperclip size={18}/></span>
            <div>
              <strong>Imágenes o pruebas</strong>
              <small>Desde el celular o la computadora. Hasta 5 archivos de 10 MB cada uno.</small>
            </div>
          </div>
          <label className="reportFilePicker">
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain,.doc,.docx,audio/*" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
            <Paperclip size={18}/> Elegir archivos
          </label>
          {files.length > 0 && (
            <ul className="reportFileList">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`}>
                  <span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span>
                  <button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>
                    <Trash2 size={16}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>}

      {step === 2 && <>
        <FieldGroup target="location" error={error} register={registerAnchor}>
        <p className="reportStageHelp">Brindá datos suficientes para localizar el lugar. No es necesario completar todos los campos si indicás una dirección clara o referencia.</p>
        
        {/* 1. Dirección o referencia PRIMERO */}
        <div className="reportFieldGrid reportFieldGridOne">
          <div className="reportAddressWrapper">
            <label className="reportField">
              <span>Dirección o referencia</span>
              <input
                value={draft.streetAddress}
                onChange={(event) => update("streetAddress", event.target.value)}
                placeholder="Ej.: Av. 18 de Julio 1234, Montevideo"
              />
            </label>
            {showAddressSuggestions && addressSuggestions.length > 0 && (
              <ul className="reportAddressSuggestions">
                {addressSuggestions.map((item, index) => (
                  <li key={index} onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(item);
                  }}>
                    <MapPin size={14}/> {item.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 2. Departamento, Ciudad, Barrio y Número de puerta */}
        <div className="reportFieldGrid">
          <label className="reportField"><span>Departamento</span><select value={draft.department} onChange={(event) => update("department", event.target.value)}><option value="">Elegí una opción</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="reportField"><span>Ciudad o localidad principal</span><input value={draft.city} onChange={(event) => update("city", event.target.value)} placeholder="Ej.: Montevideo, Salto, Paysandú" /></label>
        </div>

        <div className="reportFieldGrid">
          <label className="reportField"><span>Barrio o zona</span><input value={draft.locality} onChange={(event) => update("locality", event.target.value)} placeholder="Ej.: Pocitos, Centro, Barrio Sur" /></label>
          <label className="reportField"><span>Número de puerta, apto o torre</span><input value={draft.doorNumber} onChange={(event) => update("doorNumber", event.target.value)} placeholder="Ej.: Apto 3, Torre B" /></label>
        </div>

        {draft.setting === "En un residencial / ELEPEM" && (
          <label className="reportField" style={{marginTop: "14px"}}>
            <span>Nombre del residencial o establecimiento</span>
            <input value={draft.facilityName} onChange={(event) => update("facilityName", event.target.value)} placeholder="Ej.: Residencial Los Pinos" />
          </label>
        )}

        <label className="reportCheckbox" style={{marginTop: "14px", marginBottom: "14px"}}>
          <input type="checkbox" checked={draft.unknownAddress} onChange={(e) => update("unknownAddress", e.target.checked)} />
          <span>No conozco la dirección exacta</span>
        </label>

        {draft.unknownAddress && (
          <div className="privacyNotice privacyNotice-gray" style={{marginBottom: "16px"}}>
            Indicá cualquier referencia que pueda ayudar: nombre del lugar, barrio, esquina, comercio cercano o descripción de la zona en el relato.
          </div>
        )}

        <div className="reportLocationAction">
          <button
            type="button"
            className="reportBack"
            disabled={locationLookupStatus === "loading" || ![draft.streetAddress, draft.locality, draft.city, draft.department].some((value) => value.trim())}
            onClick={() => void lookupLocation()}
          >
            <MapPin size={17}/>{locationLookupStatus === "loading" ? "Buscando…" : "Buscar dirección y mostrar mapa"}
          </button>
          <small>La consulta de ubicación se realiza sólo al usar este botón.</small>
          {locationLookupStatus === "empty" && <p role="status">No encontramos una coincidencia exacta. Podés conservar la referencia escrita.</p>}
          {locationLookupStatus === "error" && <p role="alert">No se pudo consultar el mapa. La comunicación puede enviarse igualmente.</p>}
        </div>

        {locationSnapshot && locationSnapshot.department && locationSnapshot.department !== "No se conoce" && (
          <LocationMap location={locationSnapshot} />
        )}
        </FieldGroup>
      </>}

      {step === 3 && <>
        <FieldGroup target="identity" error={error} register={registerAnchor}>
        {/* 1. Selección de Privacidad y bajada explicativa */}
        <h3 className="reportSubheading">¿Cómo querés que manejemos tus datos?</h3>
        <p style={{margin: "-6px 0 14px", color: "#5c6e82", fontSize: "0.86rem", lineHeight: "1.45"}}>
          Esta elección se refiere a tus datos como persona que comunica la situación. No cambia la prioridad con la que se evaluará el riesgo. En todos los casos deberás aportar información suficiente para localizar y comprender la situación.
        </p>

        <OptionGrid
          options={["Anónima", "Confidencial", "Con identidad registrada"]}
          selected={draft.privacy}
          onSelect={(value) => {
            update("privacy", value);
            if (value === "Anónima") {
              update("contactEmail", "");
              update("contactPhone", "");
              update("reporterName", "");
              update("safeContact", "");
              update("contactMethod", "Sin contacto");
            }
          }}
        />
        
        {draft.privacy === "Anónima" && (
          <div className="privacyNotice privacyNotice-gray">
            No te pediremos nombre, documento, teléfono ni correo electrónico. El equipo no podrá llamarte ni escribirte. Recibirás un código para consultar el estado de la comunicación. Evitá incluir información que permita identificarte en el relato o en los archivos que adjuntes.
          </div>
        )}
        {draft.privacy === "Confidencial" && (
          <div className="privacyNotice privacyNotice-yellow">
            El equipo autorizado podrá ver tus datos para comunicarse contigo y pedirte información adicional. Tu identidad no se mostrará al establecimiento ni a la persona señalada. Si fuera necesario comunicarla a otro organismo, se te informará para qué y con quién se compartiría, salvo que exista una obligación o excepción legal aplicable.
          </div>
        )}
        {draft.privacy === "Con identidad registrada" && (
          <div className="privacyNotice privacyNotice-green">
            Tu nombre y tus datos de contacto quedarán vinculados a la comunicación. El equipo podrá utilizarlos para verificar información, contactarte y gestionar la situación. Esto no significa que tu identidad sea pública ni que se comunique automáticamente al establecimiento o a la persona señalada.
          </div>
        )}

        {/* 2. Árbol decisorio de ¿Quién comunica? según Privacidad */}
        {draft.privacy === "Anónima" && (
          <>
            <h3 className="reportSubheading" style={{marginTop: "22px"}}>¿Cómo conocés los hechos?</h3>
            <OptionGrid
              options={["Lo vi", "Me lo contó la persona afectada", "Me lo contó otra persona", "Otro"]}
              selected={draft.reporter}
              onSelect={(value) => update("reporter", value)}
            />
          </>
        )}

        {draft.privacy === "Confidencial" && (
          <>
            <h3 className="reportSubheading" style={{marginTop: "22px"}}>Relación con la persona o los hechos</h3>
            <OptionGrid
              options={["Soy la persona afectada", "Familiar", "Vecino o vecina", "Trabajador o profesional", "Otra relación", "Prefiero no decirlo"]}
              selected={draft.reporter}
              onSelect={(value) => update("reporter", value)}
            />

            <label className="reportField" style={{marginTop: "14px"}}>
              <span>Nombre, alias o cómo querés que te llamemos <em>opcional</em></span>
              <input value={draft.reporterName} onChange={(event) => update("reporterName", event.target.value)} placeholder="Ej.: María (solo visible para el equipo autorizado)" />
            </label>

            <h3 className="reportSubheading" style={{marginTop: "22px"}}>Contacto reservado</h3>
            <div className="reportFieldGrid">
              <label className="reportField">
                <span>Medio seguro de contacto</span>
                <select value={draft.contactMethod} onChange={(event) => update("contactMethod", event.target.value)}>
                  <option>Llamada</option>
                  <option>WhatsApp o SMS</option>
                  <option>Correo</option>
                  <option>Persona de confianza</option>
                </select>
              </label>
              <label className="reportField">
                <span>Horario o condición segura <em>opcional</em></span>
                <input value={draft.safeContact} onChange={(event) => update("safeContact", event.target.value)} placeholder="Ej.: Llamar solo en la tarde" />
              </label>
            </div>

            <div className="reportFieldGrid reportContactData">
              <label className="reportField"><span><Phone size={15}/> Celular / Teléfono <em>opcional</em></span><input type="tel" inputMode="tel" autoComplete="tel" value={draft.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} placeholder="Ej.: 099 123 456" /></label>
              <label className="reportField"><span><Mail size={15}/> Correo electrónico <em>opcional</em></span><input type="email" inputMode="email" autoComplete="email" value={draft.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} placeholder="Ej.: nombre@correo.com" /></label>
            </div>

            <label className="reportCheckbox" style={{marginTop: "14px"}}>
              <input type="checkbox" checked={draft.noEarlyContact} onChange={(event) => update("noEarlyContact", event.target.checked)} />
              <span>No contactar primero a la persona señalada ni al establecimiento.</span>
            </label>
          </>
        )}

        {draft.privacy === "Con identidad registrada" && (
          <>
            <h3 className="reportSubheading" style={{marginTop: "22px"}}>Relación con la persona afectada</h3>
            <OptionGrid
              options={["La propia persona", "Familiar o referente", "Vecino/a o amistad", "Cuidador/a", "Profesional", "Otra persona"]}
              selected={draft.reporter}
              onSelect={(value) => update("reporter", value)}
            />

            <label className="reportField" style={{marginTop: "14px"}}>
              <span>Nombre y apellido completo</span>
              <input value={draft.reporterName} onChange={(event) => update("reporterName", event.target.value)} placeholder="Ej.: María Rodríguez" />
            </label>

            <h3 className="reportSubheading" style={{marginTop: "22px"}}>Datos de contacto registrados</h3>
            <div className="reportFieldGrid reportContactData">
              <label className="reportField"><span><Phone size={15}/> Celular principal</span><input type="tel" inputMode="tel" autoComplete="tel" value={draft.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} placeholder="Ej.: 099 123 456" /></label>
              <label className="reportField"><span><Mail size={15}/> Correo electrónico</span><input type="email" inputMode="email" autoComplete="email" value={draft.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} placeholder="Ej.: nombre@correo.com" /></label>
            </div>

            <div className="reportFieldGrid" style={{marginTop: "14px"}}>
              <label className="reportField">
                <span>Horario y forma segura de contacto <em>opcional</em></span>
                <input value={draft.safeContact} onChange={(event) => update("safeContact", event.target.value)} placeholder="Ej.: preferentemente mañanas" />
              </label>
            </div>

            <label className="reportCheckbox" style={{marginTop: "14px"}}>
              <input type="checkbox" checked={draft.noEarlyContact} onChange={(event) => update("noEarlyContact", event.target.checked)} />
              <span>No contactar primero a la persona señalada ni al establecimiento.</span>
            </label>
          </>
        )}
        </FieldGroup>
      </>}

      {step === 4 && <>
        <FieldGroup target="consent" error={error} register={registerAnchor}>
        <div className="reportSummary">
          <div><strong>Situación</strong><span>{draft.setting || "No indicada"}</span></div>
          <div><strong>Preocupación</strong><span>{draft.concerns.join(" · ") || "No indicada"}</span></div>
          {draft.narrative.trim() ? (
            <div><strong>Lo escrito / Relato</strong><span>{draft.narrative}</span></div>
          ) : null}
          <div><strong>Lugar</strong><span>{draft.department}{locationSummary ? ` · ${locationSummary}` : ""}</span></div>
          <div><strong>Quién comunica</strong><span>{draft.reporter}{draft.reporterName ? ` (${draft.reporterName})` : ""}</span></div>
          <div><strong>Privacidad</strong><span>{draft.privacy || "No indicada"}</span></div>
          <div><strong>Pruebas / Imágenes</strong><span>{files.length > 0 ? `${files.length} ${files.length === 1 ? "archivo adjunto" : "archivos adjuntos"}` : "Sin archivos adjuntos"}</span></div>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #cbd9e7" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: 600 }}>Archivos y audios adjuntos a enviar</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {files.map((file, idx) => {
                const isAudio = file.type.startsWith("audio/") || file.name.startsWith("relato_voz_") || /\.(webm|mp3|ogg|wav)$/i.test(file.name);
                const isImage = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|heic)$/i.test(file.name);
                const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

                if (isAudio) {
                  return (
                    <div key={`${file.name}-${idx}`} style={{ padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                        <strong style={{ color: "#334155" }}>{file.name}</strong>
                        <small style={{ color: "#64748b" }}>{fileSizeMB} MB</small>
                      </div>
                      <audio src={URL.createObjectURL(file)} controls style={{ width: "100%", height: "36px", marginTop: "4px" }} />
                    </div>
                  );
                }

                if (isImage) {
                  return (
                    <div key={`${file.name}-${idx}`} style={{ padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                        <strong style={{ color: "#334155" }}>{file.name}</strong>
                        <small style={{ color: "#64748b" }}>{fileSizeMB} MB</small>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (blob URL); next/image no puede optimizarla */}
                      <img src={URL.createObjectURL(file)} alt={file.name} style={{ maxHeight: "130px", borderRadius: "8px", border: "1px solid #cbd9e7", marginTop: "6px", objectFit: "contain", backgroundColor: "#f8fafc" }} />
                    </div>
                  );
                }

                return (
                  <div key={`${file.name}-${idx}`} style={{ padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <strong style={{ color: "#334155" }}>{file.name}</strong>
                    <small style={{ color: "#64748b" }}>{fileSizeMB} MB</small>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {draft.privacy === "Anónima" ? (
          <div className="privacyNotice privacyNotice-gray" style={{ marginTop: "16px", marginBottom: "16px" }}>
            Vas a enviar una comunicación anónima. Se guardará la información sobre la situación, el lugar y los archivos. No se guardarán tu nombre, teléfono ni correo. El equipo no podrá contactarte.
          </div>
        ) : (
          <div className="privacyNotice privacyNotice-yellow" style={{ marginTop: "16px", marginBottom: "16px" }}>
            Vas a enviar una comunicación confidencial / registrada. El equipo podrá contactarte mediante los canales que indicaste.
          </div>
        )}
        <label className="reportCheckbox reportConsent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Entiendo que esto es una demostración: se guardará en la base de datos para que el equipo lo vea, pero no se enviará a ningún organismo.</span></label>
        </FieldGroup>
      </>}

      {formMessage && <div className="reportValidation" role="alert">{formMessage}</div>}
    </div>

    <footer className="reportActions"><button className="reportBack" type="button" disabled={step === 1 || submitting} onClick={() => { setFormMessage(""); setStep((current) => current - 1); }}><ArrowLeft size={17}/> Volver</button><span>Paso {step} de 4</span>{step < 4 ? <button className="reportContinue" type="button" onClick={advance}>Continuar <ArrowRight size={17}/></button> : <button className="reportContinue" type="button" disabled={submitting || !enabled} onClick={submit}>{submitting ? "Guardando…" : "Guardar y enviar al equipo"}<ArrowRight size={17}/></button>}</footer>
  </section>;
}
