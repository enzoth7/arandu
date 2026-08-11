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
  facilityId: string;
  relationship: string;
  period: string;
  answers: Record<string, "yes" | "partial" | "no" | "unknown" | "prefer_not_to_answer">;
  narrative?: string;
  requestedDestination: "aggregate" | "private_facility" | "consider_anonymized";
  publicationConsent: boolean;
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
  facility: InstitutionalFacilityReference | null;
  publication: ExperiencePublicationSummary | null;
  summary: string;
  payload: Record<string, unknown>;
};

export type InstitutionalFacilityReference = {
  id: number;
  key: string;
  name: string;
  locality: string;
  department: string;
};

export type ExperiencePublicationSummary = {
  id: string;
  status: "draft" | "published" | "withdrawn";
  publicBody: string;
  publicRelationship: string | null;
  publicPeriod: string | null;
  publishedAt: string | null;
};

export type PublicExperienceItem = {
  id: string;
  body: string;
  relationship: string | null;
  period: string | null;
  publishedAt: string;
};
