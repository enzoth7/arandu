import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Link2 } from "lucide-react";
import { readAccountSession } from "../../../lib/institutional-auth";
import { listFacilityOptions, listOwnRelationshipRequests } from "../../../lib/role-workflows-db";
import { RelationshipRequestForm, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";

export const metadata: Metadata = { title: "Mis vínculos" };
export const dynamic = "force-dynamic";

export default async function RelationshipsPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta/vinculos");
  const [facilities, requests] = await Promise.all([listFacilityOptions(), listOwnRelationshipRequests(account.userId)]);
  return <main className="institutionalWorkspace workflowWorkspace">
    <Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link>
    <header className="workflowHero"><span className="workflowHeroIcon"><Link2 size={25} /></span><div><p className="accountEyebrow">Cuenta personal</p><h1>Mis vínculos</h1><p>Solicitá una verificación mínima para participar como residente o familiar. No se informa tu identidad al ELEPEM.</p></div></header>
    <div className="workflowColumns">
      <section className="workflowPanel"><h2>Solicitar verificación</h2><RelationshipRequestForm facilities={facilities} /></section>
      <section className="workflowPanel"><h2>Estado de solicitudes</h2>{requests.length ? <div className="workflowList">{requests.map((request) => <article className="workflowRequest" key={request.id}><div><h3>{request.facilityName}</h3><p>{request.relationshipType === "resident" ? "Persona residente" : "Familiar o persona allegada"} · {[request.locality, request.department].filter(Boolean).join(" · ")}</p></div><WorkflowStatus status={request.status} /></article>)}</div> : <p className="workflowEmpty">Todavía no enviaste solicitudes.</p>}</section>
    </div>
  </main>;
}
