import type { Metadata } from "next";
import { Sources } from "../../components/Sources";

export const metadata: Metadata = {
  title: "Fuentes",
  description: "Origen, fecha y límites de la información: qué puede y qué no puede afirmar cada ficha.",
};

export default function PersonasFuentesPage() {
  return <Sources />;
}
