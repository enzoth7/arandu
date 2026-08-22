import type { ExperienceReportPayload, ExperienceSubmissionInput } from "./demo-intake.mjs";

export type InstitutionalRole =
  | "administrator"
  | "verifier"
  | "moderator"
  | "facility_representative";

export type IntakeKind = "concern" | "experience" | "facility_change";
export type SubmittedActor = "public" | "system" | "state" | "facility";

export type FacilityProfile = {
  id: number;
  name: string;
  locality: string;
  department: string;
  address: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  imageAlt: string;
  phones: string[];
  emails: string[];
  monthlyPriceFromUyu: number | null;
  priceVerifiedAt: string | null;
  priceSourceUrl: string | null;
  priceIncludes: string[];
};

export type ExperienceSubmission = ExperienceSubmissionInput;
export type StoredExperiencePayload = ExperienceReportPayload;

export type FacilityChangeSet = {
  facilityId: FacilityProfile["id"];
  effectiveDate: string;
  evidenceNote: string;
  changes: Partial<Pick<FacilityProfile, "name" | "address" | "description" | "phones" | "emails" | "monthlyPriceFromUyu">>;
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
