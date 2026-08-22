import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAccountSession } from "../../../lib/institutional-auth";
import { loadVerifiedPersonalRelationships } from "../../../lib/brief-experience-db";
import { VisitDashboard } from "../../components/visits/VisitDashboard";

export const metadata: Metadata = { title: "Mis visitas" };
export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  const account = await readAccountSession();
  if (!account) redirect("/iniciar-sesion?next=/cuenta/visitas");
  const personalRelationships = account.userId.startsWith("temporary:") ? [] : await loadVerifiedPersonalRelationships(account.userId);
  if (personalRelationships.some((r) => r.relationshipType === "family")) {
    redirect("/cuenta");
  }
  return <main className="institutionalWorkspace accountWorkspace"><VisitDashboard mode="visitor" /></main>;
}

