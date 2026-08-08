import type { Metadata } from "next";
import { TeamIntakeInbox } from "../../../components/team/TeamIntakeInbox";

export const metadata: Metadata = {
  title: "Equipos · Arandú",
  description: "Comunicaciones recibidas y gestión institucional.",
  robots: { index: false, follow: false },
};

export default function OrganizacionEquiposPage() {
  return <TeamIntakeInbox />;
}
