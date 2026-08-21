import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { readAccountSession } from "../../../lib/institutional-auth";
import { listFacilityOptions, listOwnRepresentationClaims } from "../../../lib/role-workflows-db";
import { RepresentationRequestForm, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";

export const metadata: Metadata = { title: "Solicitar representación" };
export const dynamic = "force-dynamic";

export default async function RepresentationRequestPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/institucional/solicitar-representacion");
  const [facilities, requests] = await Promise.all([listFacilityOptions(), listOwnRepresentationClaims(account.userId)]);
  return <main className="institutionalWorkspace workflowWorkspace">
    <Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link>
    <header className="workflowHero"><span className="workflowHeroIcon"><Building2 size={25} /></span><div><p className="accountEyebrow">Acceso institucional</p><h1>Representar un ELEPEM</h1><p>Reclamá acceso a un establecimiento existente. Administración verificará la autorización antes de habilitarlo.</p></div></header>
    <div className="workflowColumns"><section className="workflowPanel"><h2>Nueva solicitud</h2><RepresentationRequestForm facilities={facilities} /></section><section className="workflowPanel"><h2>Solicitudes enviadas</h2>{requests.length ? <div className="workflowList">{requests.map((request) => <article className="workflowRequest" key={`${request.user_id}-${request.facilityId}`}><div><h3>{request.facility_name}</h3><p>Representación institucional</p></div><WorkflowStatus status={request.status} /></article>)}</div> : <p className="workflowEmpty">Todavía no enviaste solicitudes.</p>}</section></div>
  </main>;
}
