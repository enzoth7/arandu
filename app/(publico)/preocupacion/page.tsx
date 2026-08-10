import type { Metadata } from "next";
import { IntakeReportForm } from "../../components/IntakeReportForm";

export const metadata: Metadata = {
  title: "Comunicar una preocupación",
  description: "Contá una situación sobre vos o sobre otra persona mayor. La herramienta prepara una evaluación humana.",
};

export default function PersonasDenunciaPage() {
  return <IntakeReportForm enabled={process.env.DEMO_MODE === "true" && process.env.DEMO_INTAKE_ENABLED === "true"} />;
}
