"use client";
/* eslint-disable @next/next/no-img-element -- las vistas previas son archivos locales privados. */

import { Mic, Paperclip, Square, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg", "audio/aac", "audio/m4a", "audio/x-m4a", "audio/3gpp", "audio/3gpp2",
  "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

function PrivateFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <li className="concernAttachmentPreview privateAttachmentPreview">
    {preview ? <img src={preview} alt={`Vista previa de ${file.name}`} /> : <Paperclip size={18} aria-hidden="true" />}
    <span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span>
    <button type="button" onClick={onRemove} aria-label={`Quitar ${file.name}`}><X size={17} aria-hidden="true" /></button>
  </li>;
}

function AudioRecorder({
  audioFile,
  onAudioRecorded,
  onAudioCleared,
}: {
  audioFile: File | null;
  onAudioRecorded: (file: File) => string;
  onAudioCleared: () => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [micError, setMicError] = useState("");

  useEffect(() => {
    if (!audioFile) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0);
      return;
    }
    const timer = window.setInterval(() => setRecordingTime((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    setMicError("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Este navegador no permite grabar audio. Podés adjuntar un archivo de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        const cleanType = (recorder.mimeType || "audio/webm").split(";")[0] || "audio/webm";
        const extension = cleanType.includes("mp4") ? "mp4" : cleanType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type: cleanType });
        if (!blob.size) {
          setMicError("La grabación quedó vacía. Probá nuevamente.");
          return;
        }
        const error = onAudioRecorded(new File([blob], `mensaje_voz_${Date.now()}.${extension}`, { type: cleanType }));
        if (error) setMicError(error);
      };
      recorder.onerror = () => {
        setIsRecording(false);
        setMicError("La grabación se interrumpió. Probá nuevamente.");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setMicError("No se pudo acceder al micrófono. Revisá los permisos del navegador.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setIsRecording(false);
  }

  const minutes = Math.floor(recordingTime / 60);
  const seconds = recordingTime % 60;
  const timeLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return <div className="privateVoiceControl">
    {!audioFile && !isRecording && <button type="button" className="privateVoiceButton" onClick={() => void startRecording()} aria-label="Iniciar grabación de voz"><Mic size={24} aria-hidden="true" /><span>TOCÁ</span><small>grabar</small></button>}
    {isRecording && <><button type="button" className="privateVoiceButton isRecording" onClick={stopRecording} aria-label="Detener grabación"><Square size={16} fill="currentColor" aria-hidden="true" />Detener</button><span className="privateVoiceStatus" aria-live="polite">Grabando… {timeLabel}</span></>}
    {audioFile && audioUrl && !isRecording && <><audio src={audioUrl} controls className="privateVoicePlayer" aria-label="Vista previa del mensaje de voz" /><button type="button" className="privateVoiceDelete" onClick={() => { setMicError(""); onAudioCleared(); }}><Trash2 size={16} aria-hidden="true" />Borrar</button></>}
    {micError && <p className="reportMicError" role="alert">{micError}</p>}
  </div>;
}

export function PrivateAttachmentFields({
  children,
  files,
  recordedAudio,
  onFilesChange,
  onRecordedAudioChange,
  onMessage,
}: {
  children: ReactNode;
  files: File[];
  recordedAudio: File | null;
  onFilesChange: (files: File[]) => void;
  onRecordedAudioChange: (file: File | null) => void;
  onMessage: (message: string) => void;
}) {
  const totalFiles = files.length + (recordedAudio ? 1 : 0);

  function addFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    const validSize = [...selectedFiles].filter((file) => file.size > 0 && file.size <= MAX_FILE_BYTES);
    const available = Math.max(0, MAX_FILES - totalFiles);
    onFilesChange([...files, ...validSize.slice(0, available)]);
    if (validSize.length !== selectedFiles.length || validSize.length > available) {
      onMessage("Podés adjuntar hasta 5 archivos de hasta 10 MB cada uno.");
    } else {
      onMessage("");
    }
  }

  function saveRecording(file: File) {
    if (file.size > MAX_FILE_BYTES) return "El mensaje de voz supera los 10 MB. Grabá uno más breve.";
    if (!recordedAudio && files.length >= MAX_FILES) return "Ya alcanzaste el máximo de 5 archivos. Quitá uno para guardar el audio.";
    onRecordedAudioChange(file);
    onMessage("");
    return "";
  }

  return <div className="privateEvidenceFields">
    <div className="privateNarrativeComposer">{children}<AudioRecorder audioFile={recordedAudio} onAudioRecorded={saveRecording} onAudioCleared={() => onRecordedAudioChange(null)} /></div>
    <div className="privateFileControls"><label className="reportFilePicker"><input type="file" accept={FILE_ACCEPT} multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} /><Paperclip size={18} aria-hidden="true" />Adjuntar archivo</label><small>Hasta 5 archivos privados en total, incluido el audio.</small></div>
    {files.length > 0 && <ul className="privateAttachmentList">{files.map((file, index) => <PrivateFilePreview file={file} key={`${file.name}-${file.lastModified}-${index}`} onRemove={() => onFilesChange(files.filter((_, currentIndex) => currentIndex !== index))} />)}</ul>}
  </div>;
}
