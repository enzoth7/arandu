import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAccountSession } from "../../../lib/institutional-auth";
import { VisitDashboard } from "../../components/visits/VisitDashboard";

export const metadata: Metadata = { title: "Mis visitas" };
export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  if (!await readAccountSession()) redirect("/iniciar-sesion?next=/cuenta/visitas");
  return <main className="institutionalWorkspace accountWorkspace"><VisitDashboard mode="visitor" /></main>;
}
