import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstitutionalAccess } from "../components/InstitutionalAccess";
import { readServerInstitutionalSession } from "../../lib/institutional-auth";
import type { InstitutionalRole } from "../../lib/institutional-types";

export const metadata: Metadata = { title: "Acceso institucional" };

export default async function InstitutionalAccessPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const session = await readServerInstitutionalSession();
  if (session) redirect(session.role === "state" ? "/institucional/estado" : "/institucional/elepem");
  const { rol } = await searchParams;
  const initialRole: InstitutionalRole | null = rol === "state" || rol === "facility" ? rol : null;
  return <InstitutionalAccess initialRole={initialRole} />;
}
