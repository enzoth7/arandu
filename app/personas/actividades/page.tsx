import type { Metadata } from "next";
import { ActivitiesView } from "../../components/ActivitiesView";

export const metadata: Metadata = {
  title: "Actividades",
  description: "Talleres, recreación y espacios para personas mayores en todo Uruguay, con su fuente y fecha.",
};

export default function PersonasActividadesPage() {
  return <ActivitiesView />;
}
