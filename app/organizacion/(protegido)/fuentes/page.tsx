import type { Metadata } from "next";
import { Sources } from "../../../components/Sources";

export const metadata: Metadata = {
  title: "Fuentes · Arandú",
  description: "Origen, fecha y límites de los datos.",
  robots: { index: false, follow: false },
};

export default function OrganizacionFuentesPage() {
  return <Sources />;
}
