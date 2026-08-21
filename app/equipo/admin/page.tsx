import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, MessageSquareText, ShieldCheck } from "lucide-react";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { listInstitutionalAccounts, listRepresentationClaims } from "../../../lib/role-workflows-db";
import { AccountRoleEditor, InstitutionalRoleAssignmentForm, WorkflowDecisionButtons, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";

export const metadata: Metadata = { title: "Administración de accesos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdministrationTeamPage() {
  await requireInstitutionalRole("administrator");
  const [claims, accounts] = await Promise.all([listRepresentationClaims(), listInstitutionalAccounts()]);
  return <main className="institutionalWorkspace workflowWorkspace teamWorkflow">
    <Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link>
    <header className="workflowHero"><span className="workflowHeroIcon"><ShieldCheck size={25} /></span><div><p className="accountEyebrow">Administración</p><h1>Roles y accesos</h1><p>Aprobá representantes y asigná funciones internas. Las experiencias y la identidad permanecen en bandejas separadas.</p></div></header>
    <nav className="workflowPanelLinks" aria-label="Paneles disponibles para Administración"><Link href="/equipo/verificaciones"><BadgeCheck size={19} /> Verificaciones</Link><Link href="/equipo/moderacion"><MessageSquareText size={19} /> Moderación</Link><Link href="/institucional/elepem"><Building2 size={19} /> Portal ELEPEM</Link></nav>
    <section className="workflowPanel workflowPanelWide"><h2>Solicitudes de representación</h2>{claims.length ? <div className="workflowReviewList">{claims.map((claim) => <article className="workflowReviewCard" key={`${claim.user_id}-${claim.facilityId}`}><div className="workflowReviewMain"><div><p className="workflowOverline">Representación institucional</p><h3>{claim.facility_name}</h3><p>{claim.email}</p></div><WorkflowStatus status={claim.status} /></div><WorkflowDecisionButtons endpoint="/api/team/admin/representations" payload={{ userId: claim.user_id, facilityId: claim.facilityId }} kind="representation" status={claim.status} /></article>)}</div> : <p className="workflowEmpty">No hay solicitudes de representación.</p>}</section>
    <div className="workflowColumns workflowAdminColumns"><section className="workflowPanel"><h2>Asignar función interna</h2><p>La persona debe haber creado antes su cuenta personal.</p><InstitutionalRoleAssignmentForm /></section><section className="workflowPanel"><h2>Cuentas institucionales</h2><div className="workflowAccountList">{accounts.map((account) => <AccountRoleEditor account={account} key={account.userId} />)}</div></section></div>
  </main>;
}
