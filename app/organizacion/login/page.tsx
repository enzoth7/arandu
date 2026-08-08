import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readServerTeamSession } from "../../../lib/team-auth";
import { ORGANIZATION_HOME } from "../../components/navigation";
import { OrganizationLogin } from "../../components/OrganizationLogin";

export const metadata: Metadata = {
  title: "Ingreso de organización · Arandú",
  robots: { index: false, follow: false },
};

export default async function OrganizacionLoginPage() {
  if (await readServerTeamSession()) redirect(ORGANIZATION_HOME);
  return <OrganizationLogin />;
}
