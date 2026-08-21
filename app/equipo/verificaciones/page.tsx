import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { listVerificationRequests } from "../../../lib/role-workflows-db";
import { WorkflowDecisionButtons, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";

export const metadata: Metadata = { title: "Verificación de vínculos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerificationTeamPage() {
  await requireInstitutionalRole("verifier");
  const requests = await listVerificationRequests();
  return <main className="institutionalWorkspace workflowWorkspace teamWorkflow">
    <Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link>
    <header className="workflowHero"><span className="workflowHeroIcon"><BadgeCheck size={25} /></span><div><p className="accountEyebrow">Equipo de verificación</p><h1>Vínculos con ELEPEM</h1><p>Esta bandeja muestra identidad y vínculo mínimo. No incluye experiencias ni respuestas personales.</p></div></header>
    <section className="workflowPanel workflowPanelWide"><div className="workflowPanelHeading"><div><h2>Solicitudes y vínculos</h2><p>{requests.length} registro{requests.length === 1 ? "" : "s"}</p></div></div>{requests.length ? <div className="workflowReviewList">{requests.map((request) => <article className="workflowReviewCard" key={request.id}><div className="workflowReviewMain"><div><p className="workflowOverline">{request.relationshipType === "resident" ? "Persona residente" : "Familiar o persona allegada"}</p><h3>{request.facilityName}</h3><p>{request.email} · {[request.locality, request.department].filter(Boolean).join(" · ")}</p></div><WorkflowStatus status={request.status} /></div><WorkflowDecisionButtons endpoint="/api/team/verifications" payload={{ relationshipId: request.id }} kind="verification" status={request.status} /></article>)}</div> : <p className="workflowEmpty">No hay solicitudes para revisar.</p>}</section>
  </main>;
}
