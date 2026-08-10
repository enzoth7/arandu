import type { Metadata } from "next";
import { ResidencialesFormView } from "../../components/ResidencialesFormView";

export const metadata: Metadata = {
  title: "Cómo elegir",
  description: "Una guía paso a paso para ordenar preferencias y preparar las visitas a residenciales.",
};

export default function PersonasResidencialesFormPage() {
  return <ResidencialesFormView />;
}
