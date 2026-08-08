import type { Metadata } from "next";
import { ResidencialesFormView } from "../../components/ResidencialesFormView";

export const metadata: Metadata = {
  title: "Cómo elegir",
  description: "Una guía paso a paso para ordenar preferencias, comparar residenciales y preparar las visitas.",
};

export default function PersonasResidencialesFormPage() {
  return <ResidencialesFormView />;
}
