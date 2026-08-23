import type { Metadata } from "next";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { listInstitutionalAccounts, listRepresentationClaims, listFacilityOptions } from "../../../lib/role-workflows-db";
import { AccountRoleEditor, InstitutionalRoleAssignmentForm, WorkflowDecisionButtons, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";
import { TeamTabs } from "../../components/institutional/TeamTabs";

export const metadata: Metadata = { title: "Administración de accesos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdministrationTeamPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireInstitutionalRole("administrator");
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "solicitudes";

  const [claims, accounts, facilities] = await Promise.all([listRepresentationClaims(), listInstitutionalAccounts(), listFacilityOptions()]);

  return (
    <main className="institutionalWorkspace workflowWorkspace teamWorkflow">
      <TeamTabs role={session.role} />

      {tab === "solicitudes" ? (
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
                      <h3>{claim.facility_name}</h3>
                      <p>{[claim.locality, claim.department].filter(Boolean).join(" — ")}</p>
                      <p className="workflowAccountEmail">{claim.email}</p>
                    </div>
                    <div className="workflowReviewMainRight">
                      <WorkflowStatus status={claim.status} />
                      <WorkflowDecisionButtons
                        endpoint="/api/team/admin/representations"
                        payload={{ userId: claim.user_id, facilityId: claim.facilityId }}
                        kind="representation"
                        status={claim.status}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="workflowEmpty">
              <p>No hay solicitudes de representación pendientes en este momento.</p>
            </div>
          )}
        </section>
      ) : (
        <div className="workflowColumns workflowAdminColumns">
          <section className="workflowPanel">
          <h2>Asignar función interna</h2>
          <p>La persona debe haber creado previamente su cuenta personal con su correo.</p>
          <InstitutionalRoleAssignmentForm facilities={facilities} />
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
      )}
    </main>
  );
}
