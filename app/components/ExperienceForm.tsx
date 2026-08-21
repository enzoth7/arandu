"use client";

import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BRIEF_EXPERIENCE_RATINGS,
  BRIEF_EXPERIENCE_SECTIONS,
  BRIEF_EXPERIENCE_VERSION,
  briefExperienceCommentPrompt,
  briefExperienceSituationPrefix,
  type BriefExperienceRating,
} from "../../lib/brief-experience.mjs";
import type { VerifiedPersonalRelationship } from "../../lib/brief-experience-db";
import styles from "./ExperienceForm.module.css";

type Answer = { sectionId: string; rating: BriefExperienceRating | null; reasonIds: string[]; skipped: boolean };
const emptyAnswers = (): Answer[] => BRIEF_EXPERIENCE_SECTIONS.map((section) => ({ sectionId: section.id, rating: null, reasonIds: [], skipped: false }));

export function ExperienceForm({ relationships, initialFacilityKey }: { relationships: VerifiedPersonalRelationship[]; initialFacilityKey: string }) {
  const [facilityKey, setFacilityKey] = useState(initialFacilityKey);
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>(emptyAnswers);
  const [comment, setComment] = useState("");
  const [publicationConsent, setPublicationConsent] = useState(true);
  const [sendToFacility, setSendToFacility] = useState(false);
  const [shareContactWithFacility, setShareContactWithFacility] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ caseCode: string; message: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const relationship = relationships.find((item) => item.selectionKey === facilityKey) ?? relationships[0];
  const section = BRIEF_EXPERIENCE_SECTIONS[step];
  const answer = answers[step];

  useEffect(() => { headingRef.current?.focus(); }, [step, reviewing]);
  useEffect(() => { if (!sendToFacility) setShareContactWithFacility(false); }, [sendToFacility]);
  const completed = useMemo(() => answers.filter((item) => item.skipped || item.rating).length, [answers]);

  function updateAnswer(next: Partial<Answer>) {
    setAnswers((current) => current.map((item, index) => index === step ? { ...item, ...next } : item));
    setError("");
  }
  function chooseRating(rating: BriefExperienceRating) { updateAnswer({ rating, skipped: false, reasonIds: [] }); }
  function toggleReason(reasonId: string) {
    updateAnswer({ reasonIds: answer.reasonIds.includes(reasonId) ? answer.reasonIds.filter((id) => id !== reasonId) : [...answer.reasonIds, reasonId] });
  }
  function continueForward() {
    if (!answer.skipped && !answer.rating) { setError("Elegí una opción o usá “Omitir esta sección”."); return; }
    if (step < BRIEF_EXPERIENCE_SECTIONS.length - 1) setStep((value) => value + 1);
    else setReviewing(true);
  }
  function goBack() {
    setError("");
    if (reviewing) setReviewing(false);
    else setStep((value) => Math.max(0, value - 1));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing) return continueForward();
    if (!answers.some((item) => !item.skipped && item.rating !== "unrated") && !comment.trim()) { setError("Agregá al menos una calificación o un comentario para enviar."); return; }
    if (!consent) { setError("Confirmá el envío para revisión privada."); return; }
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/experiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: BRIEF_EXPERIENCE_VERSION, facilityId: relationship.demoFacilityId || relationship.facilityId, answers, comment, publicationConsent, sendToFacility, shareContactWithFacility, consent }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo enviar la experiencia.");
      setResult(payload);
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "No se pudo enviar la experiencia."); }
    finally { setSubmitting(false); }
  }

  if (result) return <main className={styles.page}><section className={styles.success}>
    <Check size={34} aria-hidden="true" /><p className={styles.eyebrow}>Envío recibido</p><h1>Gracias por compartir tu experiencia</h1>
    <p>{result.message}</p><p className={styles.caseCode}>Código de seguimiento: <strong>{result.caseCode}</strong></p>
    <ConcernHelp />
  </section></main>;

  return <main className={styles.page}><form className={styles.form} onSubmit={submit} noValidate>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Experiencia verificada</p><h1>Compartí lo esencial</h1><p>Cinco secciones breves. Tu identidad no se muestra al ELEPEM ni al público.</p></div>
      {relationships.length > 1 ? <label className={styles.facilitySelect}>ELEPEM<select value={facilityKey} onChange={(event) => { setFacilityKey(event.target.value); setAnswers(emptyAnswers()); setStep(0); setReviewing(false); }}>
        {relationships.map((item) => <option key={item.selectionKey} value={item.selectionKey}>{item.facilityName}</option>)}
      </select></label> : <div className={styles.facilityName}><span>ELEPEM</span><strong>{relationship.facilityName}</strong><small>{relationship.locality} · {relationship.department}</small></div>}
    </header>

    {!reviewing ? <>
      <div className={styles.progress} aria-label={`Sección ${step + 1} de 5`}><span>Sección {step + 1} de 5</span><div>{BRIEF_EXPERIENCE_SECTIONS.map((item, index) => <i key={item.id} className={index <= step ? styles.progressDone : ""} />)}</div></div>
      <section className={styles.question}>
        <p className={styles.sectionTitle}>{section.title}</p>
        <h2 tabIndex={-1} ref={headingRef}>{relationship.relationshipType === "resident" ? section.residentPrompt : section.familyPrompt}</h2>
        <div className={styles.ratingGrid}>{BRIEF_EXPERIENCE_RATINGS.map((rating) => <button key={rating.value} type="button" className={answer.rating === rating.value && !answer.skipped ? styles.selected : ""} onClick={() => chooseRating(rating.value)}>{rating.label}</button>)}</div>
        {answer.rating && answer.rating !== "unrated" && !answer.skipped && <fieldset className={styles.situations}><legend>{briefExperienceSituationPrefix(answer.rating)}. ¿Qué aspectos influyeron? <span>Opcional</span></legend>
          {section.aspects.map(([id, label]) => <label key={id}><input type="checkbox" checked={answer.reasonIds.includes(id)} onChange={() => toggleReason(id)} /><span>{label}</span></label>)}
        </fieldset>}
        <button type="button" className={styles.skip} onClick={() => updateAnswer({ rating: null, reasonIds: [], skipped: true })}>{answer.skipped ? "Sección omitida" : "Omitir esta sección"}</button>
      </section>
    </> : <section className={styles.review}>
      <p className={styles.eyebrow}>Revisión final</p><h2 tabIndex={-1} ref={headingRef}>Revisá antes de enviar</h2>
      <div className={styles.summary}>{BRIEF_EXPERIENCE_SECTIONS.map((item, index) => {
        const stored = answers[index];
        const label = stored.skipped ? "Omitida" : BRIEF_EXPERIENCE_RATINGS.find((rating) => rating.value === stored.rating)?.label || "Sin respuesta";
        return <button type="button" key={item.id} onClick={() => { setStep(index); setReviewing(false); }}><span>{item.title}</span><strong>{label}</strong></button>;
      })}</div>
      <label className={styles.comment}><span>{briefExperienceCommentPrompt(relationship.relationshipType)}</span><textarea maxLength={1200} value={comment} onChange={(event) => setComment(event.target.value)} /><small>{comment.length}/1200 · Opcional</small></label>
      <fieldset className={styles.consents}><legend>Autorizaciones separadas</legend>
        <label><input type="checkbox" checked={publicationConsent} onChange={(event) => setPublicationConsent(event.target.checked)} /><span>Puede considerarse para publicación anónima después de la moderación.</span></label>
        <label><input type="checkbox" checked={sendToFacility} onChange={(event) => setSendToFacility(event.target.checked)} /><span>Puede enviarse un mensaje moderado al ELEPEM.</span></label>
        {sendToFacility && <label><input type="checkbox" checked={shareContactWithFacility} onChange={(event) => setShareContactWithFacility(event.target.checked)} /><span>Autorizo compartir mi correo de cuenta con el ELEPEM.</span></label>}
        <label className={styles.finalConsent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que quiero enviar esta experiencia para revisión privada.</span></label>
      </fieldset>
      <aside className={styles.privacy}><ShieldCheck size={20} aria-hidden="true" /><span>No incluyas nombres, diagnósticos ni datos que identifiquen a otras personas.</span></aside>
      <ConcernHelp />
    </section>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <footer className={styles.actions}>
      <button type="button" className={styles.secondary} disabled={!reviewing && step === 0} onClick={goBack}><ArrowLeft size={17} />Volver</button>
      <span>{reviewing ? "Lista para revisión" : `${completed} de 5 completadas`}</span>
      <button type="submit" className={styles.primary} disabled={submitting}>{submitting ? "Enviando…" : reviewing ? "Enviar para revisión" : "Continuar"}<ArrowRight size={17} /></button>
    </footer>
  </form></main>;
}

function ConcernHelp() {
  return <aside className={styles.concernHelp}><strong>¿Te preocupa una situación?</strong><span>Podés llamar gratis al <a href="tel:08001811">0800 1811</a> o desde Antel al <a href="tel:*1811">*1811</a>.</span></aside>;
}
