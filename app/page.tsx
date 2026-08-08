import type { Metadata } from "next";
import { AccessChooser } from "./components/AccessChooser";

export const metadata: Metadata = {
  title: "Más Cerca · Información para decidir",
  description: "Elegí cómo ingresar: como persona, para orientarte y consultar residenciales, o como equipo de la organización.",
};

export default function HomePage() {
  return <AccessChooser />;
}
