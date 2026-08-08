import type { Metadata } from "next";
import { PersonHome } from "../components/HomeView";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Buscá actividades, consultá residenciales o comunicá una preocupación sobre una persona mayor.",
};

export default function PersonasPage() {
  return <PersonHome />;
}
