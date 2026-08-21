import type {
  ExperienceAnswerValue,
  ExperiencePrivacyMode,
  ExperienceQuestionId,
  ExperienceScoresByDimension,
  ParticipationValue,
  RelationshipValue,
  RespondentValue,
} from "./experience-questionnaire.mjs";

export const EXPERIENCE_ANSWER_VALUES: Set<string>;
export const EXPERIENCE_PRIVACY_VALUES: Set<string>;
export const EXPERIENCE_PAYLOAD_VERSION: 5;
export const EXPERIENCE_PRIVACY_NOTICE_VERSION: "vcr1-2026-08-17";

export type ExperienceFutureAuthorizations = {
  publicName: boolean;
  sendToFacility: boolean;
  shareContactWithFacility: boolean;
};

export type ExperienceContactInput = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
};

export type ExperienceSubmissionInput = {
  version: 5;
  facilityId: string;
  privacyMode: ExperiencePrivacyMode;
  contact: ExperienceContactInput | null;
  relationship: RelationshipValue;
  relationshipOther: string | null;
  respondentType: RespondentValue;
  residentParticipation: ParticipationValue;
  narrative: string | null;
  answers: Partial<Record<ExperienceQuestionId, ExperienceAnswerValue>>;
  requestedDestination: "private_review" | "consider_anonymized";
  publicationConsent: boolean;
  futureAuthorizations: ExperienceFutureAuthorizations;
  consent: true;
};

export type ExperienceReportPayload = {
  version: 5;
  questionnaireVersion: "vcr1-30";
  scoringVersion: "vcr1-dimensions-1";
  privacyNoticeVersion: "vcr1-2026-08-17";
  submittedAt: string;
  facilityId: string;
  relationship: RelationshipValue;
  relationshipOther: string | null;
  respondentType: RespondentValue;
  residentParticipation: ParticipationValue;
  answers: Partial<Record<ExperienceQuestionId, ExperienceAnswerValue>>;
  dimensionResults: ExperienceScoresByDimension;
  narrative: string | null;
  requestedDestination: "private_review" | "consider_anonymized";
  publicationConsent: boolean;
  privacyMode: ExperiencePrivacyMode;
  futureAuthorizations: ExperienceFutureAuthorizations;
  consent: true;
  publication: "never_automatic";
};

export function parseExperienceSubmission(value: unknown): null | {
  payload: ExperienceReportPayload;
  contact: null | { name: string | null; phone: string | null; email: string | null };
};
export function demoIntakeEnabled(env?: Record<string, string | undefined>): boolean;
export function parseFacilityChangeSubmission(value: unknown): null | {
  facilityId: number;
  payload: Record<string, unknown> & { photoCount: number; photoRightsConfirmed: boolean };
};
