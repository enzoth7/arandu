import type { Metadata } from "next";
import { ReviewMockup } from "../../../components/team/ReviewMockup";

export const metadata: Metadata = {
  title: "Revisión · Arandú",
  description: "Cola de revisión humana de candidatos.",
  robots: { index: false, follow: false },
};

export default function OrganizacionReviewPage() {
  return <ReviewMockup />;
}
