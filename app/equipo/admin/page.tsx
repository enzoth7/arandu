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

  return (
    <main className="institutionalWorkspace workflowWorkspace teamWorkflow">
      <Link className="workflowBack" href="/cuenta">
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a mi cuenta
      </Link>

      <header className="workflowHero">
        <span className="workflowHeroIcon" aria-hidden="true">
          <ShieldCheck size={28} />
        </span>
        <div>
          <p className="accountEyebrow">Administración</p>
          <h1>Roles y accesos</h1>
          <p>Aprobá representantes y asigná funciones internas. Las experiencias y la identidad permanecen en bandejas separadas.</p>
        </div>
      </header>

      <nav className="workflowPanelLinks" aria-label="Paneles disponibles para Administración">
        <Link href="/equipo/verificaciones">
          <BadgeCheck size={18} aria-hidden="true" />
          Verificaciones
        </Link>
        <Link href="/equipo/moderacion">
          <MessageSquareText size={18} aria-hidden="true" />
          Moderación
        </Link>
        <Link href="/institucional/elepem">
          <Building2 size={18} aria-hidden="true" />
          Portal ELEPEM
        </Link>
      </nav>

      <section className="workflowPanel workflowPanelWide">
        <div className="workflowPanelHeading">
          <div>
            <h2>Solicitudes de representación</h2>
            <p>Representantes de ELEPEM que solicitaron acceso para proponer actualizaciones y fotos.</p>
          </div>
        </div>
        {claims.length ? (
          <div className="workflowReviewList">
            {claims.map((claim) => (
              <article className="workflowReviewCard" key={`${claim.user_id}-${claim.facilityId}`}>
                <div className="workflowReviewMain">
                  <div>
                    <p className="workflowOverline">Representación institucional</p>
                    <h3>{claim.facility_name}</h3>
                    <p>{claim.email}</p>
                  </div>
                  <WorkflowStatus status={claim.status} />
                </div>
                <WorkflowDecisionButtons
                  endpoint="/api/team/admin/representations"
                  payload={{ userId: claim.user_id, facilityId: claim.facilityId }}
                  kind="representation"
                  status={claim.status}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className="workflowEmpty">
            <p>No hay solicitudes de representación pendientes en este momento.</p>
          </div>
        )}
      </section>

      <div className="workflowColumns workflowAdminColumns">
        <section className="workflowPanel">
          <h2>Asignar función interna</h2>
          <p>La persona debe haber creado previamente su cuenta personal con su correo.</p>
          <InstitutionalRoleAssignmentForm />
        </section>

        <section className="workflowPanel">
          <div className="workflowPanelHeading">
            <div>
              <h2>Cuentas institucionales</h2>
              <p>{accounts.length} cuenta{accounts.length === 1 ? "" : "s"} asignada{accounts.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="workflowAccountList">
            {accounts.map((account) => (
              <AccountRoleEditor account={account} key={account.userId} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

