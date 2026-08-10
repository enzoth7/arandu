export type InstitutionalRole = "state" | "facility";
export type IntakeKind = "concern" | "experience" | "facility_change";
export type SubmittedActor = "public" | "system" | "state" | "facility";

export type DemoFacilityProfile = {
  id: `DEMO-ELEPEM-00${1 | 2 | 3}`;
  name: string;
  locality: string;
  department: string;
  address: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  phone: string;
  email: string;
  monthlyPriceFromUyu: number;
  priceVerifiedAt: string;
  priceIncludes: string[];
};

export type ExperienceSubmission = {
  facilityId: DemoFacilityProfile["id"];
  relationship: string;
  period: string;
  answers: Record<string, "yes" | "partial" | "no" | "unknown" | "prefer_not_to_answer">;
  narrative?: string;
  requestedDestination: "aggregate" | "private_facility" | "consider_anonymized";
  contact?: { name?: string; phone?: string; email?: string };
  consent: boolean;
};

export type FacilityChangeSet = {
  facilityId: DemoFacilityProfile["id"];
  effectiveDate: string;
  evidenceNote: string;
  changes: Partial<Pick<DemoFacilityProfile, "name" | "address" | "description" | "phone" | "email" | "monthlyPriceFromUyu">>;
  photo?: {
    fileName: string;
    sourceDeclaration: string;
    rightsDeclaration: boolean;
  };
};

export type InstitutionalInboxItem = {
  id: string;
  caseCode: string;
  kind: IntakeKind;
  status: string;
  priority: string;
  createdAt: string;
  demoFacilityId: string | null;
  summary: string;
  payload: Record<string, unknown>;
};
