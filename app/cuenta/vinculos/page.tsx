import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Link2, UserPlus } from "lucide-react";
import { readAccountSession } from "../../../lib/institutional-auth";
import { listFacilityOptions, listOwnRelationshipRequests } from "../../../lib/role-workflows-db";
import { InviteFamilyForm, RelationshipRequestForm, WorkflowStatus } from "../../components/institutional/RoleWorkflowForms";

export const metadata: Metadata = { title: "Mis vínculos" };
export const dynamic = "force-dynamic";

export default async function RelationshipsPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta/vinculos");
  const [facilities, requests] = await Promise.all([listFacilityOptions(), listOwnRelationshipRequests(account.userId)]);

  const verifiedResident = requests.find((r) => r.status === "verified" && r.relationshipType === "resident");
  const pendingResidentRequest = requests.find((r) => r.status === "pending" && r.relationshipType === "resident");

  return <main className="institutionalWorkspace workflowWorkspace">
    <Link className="workflowBack" href="/cuenta"><ArrowLeft size={18} /> Volver a mi cuenta</Link>
    <header className="workflowHero">
      <span className="workflowHeroIcon"><Link2 size={25} /></span>
      <div>
        <p className="accountEyebrow">Cuenta personal</p>
        <h1>Mis vínculos</h1>
        <p>Gestioná tu verificación de residencia e invitá a tus familiares para compartir experiencias.</p>
      </div>
    </header>

    <div className="workflowColumns">
      {verifiedResident ? (
        <section className="workflowPanel">
          <div className="inviteFamilyHeading">
            <span className="inviteIcon"><UserPlus size={20} /></span>
            <h3>Invitar un familiar</h3>
          </div>
          <p className="inviteFamilyLead">
            Ingresá el correo de tu familiar para enviarle una invitación y que pueda participar en Arandú.
          </p>
          <InviteFamilyForm facilityName={verifiedResident.facilityName} />
        </section>
      ) : pendingResidentRequest ? (
        <section className="workflowPanel">
          <h2>Solicitud en revisión</h2>
          <div className="workflowPendingCard">
            <h3>{pendingResidentRequest.facilityName}</h3>
            <p>Tu solicitud de verificación como persona residente está siendo revisada por un verificador independiente.</p>
            <WorkflowStatus status="pending" />
          </div>
        </section>
      ) : (
        <section className="workflowPanel">
          <h2>Solicitar verificación de residencia</h2>
          <RelationshipRequestForm facilities={facilities} />
        </section>
      )}

      <div className="workflowRequestListDirect">
        {requests.map((request) => (
          <article className="workflowRequest" key={request.id}>
            <div>
              <h3>{request.facilityName}</h3>
              <p>
                {request.relationshipType === "resident" ? "Persona residente" : "Familiar invitado"} · {[request.locality, request.department].filter(Boolean).join(" · ")}
              </p>
            </div>
            <WorkflowStatus status={request.status} />
          </article>
        ))}
      </div>
    </div>
  </main>;
}


