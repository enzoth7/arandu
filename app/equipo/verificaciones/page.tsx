import type { Metadata } from "next";
import { requireInstitutionalRole } from "../../../lib/institutional-auth";
import { listVerificationRequests } from "../../../lib/role-workflows-db";
import { WorkflowDecisionButtons, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";
import { TeamTabs } from "../../components/institutional/TeamTabs";

export const metadata: Metadata = { title: "Verificación de vínculos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerificationTeamPage() {
  const session = await requireInstitutionalRole("verifier");
  const requests = await listVerificationRequests();
  return (
    <main className="institutionalWorkspace workflowWorkspace teamWorkflow">
      <TeamTabs role={session.role} />
      <section className="workflowPanel workflowPanelWide">
        <div className="workflowPanelHeading">
          <div>
            <h2>Solicitudes y vínculos</h2>
            <p>{requests.length} registro{requests.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        {requests.length ? (
          <div className="workflowReviewList">
            {requests.map((request) => (
              <article className="workflowReviewCard" key={request.id}>
                <div className="workflowReviewMain">
                  <div>
                    <p className="workflowOverline">
                      {request.relationshipType === "resident" ? "Persona residente" : "Familiar o persona allegada"}
                    </p>
                    <h3>{request.facilityName}</h3>
                    <p>{[request.locality, request.department].filter(Boolean).join(" — ")}</p>
                    <p className="workflowAccountEmail">{request.email}</p>
                  </div>
                  <div className="workflowReviewMainRight">
                    <WorkflowStatus status={request.status} />
                    <WorkflowDecisionButtons 
                      endpoint="/api/team/verifications" 
                      payload={{ relationshipId: request.id }} 
                      kind="verification" 
                      status={request.status} 
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="workflowEmpty">No hay solicitudes para revisar.</p>
        )}
      </section>
    </main>
  );
}
