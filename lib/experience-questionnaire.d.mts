export const EXPERIENCE_QUESTIONNAIRE_VERSION: "vcr1-30";
export const EXPERIENCE_SCORING_VERSION: "vcr1-dimensions-1";
export const EXPERIENCE_DRAFT_VERSION: 1;
export const EXPERIENCE_DRAFT_TTL_MS: number;

export type ExperienceDimensionId =
  | "autonomy"
  | "daily_life"
  | "privacy"
  | "space"
  | "care"
  | "contract";

export type ExperienceScaleId = "frequency" | "fulfillment";
export type ExperienceCategory = "outstanding" | "good" | "requires_improvement" | "inadequate";
export type ExperienceSourceId = "care_system_2019" | "elepem_movement_2026" | "arandu_methodology_v1";

export type ExperienceQuestionId =
  | "q01" | "q02" | "q03" | "q04" | "q05"
  | "q06" | "q07" | "q08" | "q09" | "q10"
  | "q11" | "q12" | "q13" | "q14" | "q15"
  | "q16" | "q17" | "q18" | "q19" | "q20"
  | "q21" | "q22" | "q23" | "q24" | "q25"
  | "q26" | "q27" | "q28" | "q29" | "q30";

export type FrequencyAnswerValue =
  | "always"
  | "almost_always"
  | "sometimes"
  | "almost_never"
  | "never"
  | "unable_to_evaluate"
  | "not_applicable";

export type FulfillmentAnswerValue =
  | "yes_completely"
  | "yes_generally"
  | "partly"
  | "very_little"
  | "no"
  | "unable_to_evaluate"
  | "not_applicable";

export type ExperienceAnswerValue = FrequencyAnswerValue | FulfillmentAnswerValue;

export type RelationshipValue =
  | "resident"
  | "family_referent_friend_neighbor"
  | "caregiver_or_team_member"
  | "worker_or_former_worker"
  | "linked_person_or_organization"
  | "other";

export type RespondentValue =
  | "current_resident"
  | "former_resident"
  | "family_or_close_person"
  | "other_direct_experience"
  | "prefer_not_to_say";

export type ParticipationValue =
  | "direct"
  | "with_support"
  | "jointly_discussed"
  | "did_not_participate"
  | "not_applicable"
  | "prefer_not_to_answer";

export type ExperiencePrivacyMode = "anonymous" | "confidential" | "registered_identity";

export type ExperienceDimension = Readonly<{
  id: ExperienceDimensionId;
  title: string;
  order: number;
}>;

export type ExperienceScaleOption<TValue extends ExperienceAnswerValue = ExperienceAnswerValue> = Readonly<{
  value: TValue;
  label: string;
  score: 0 | 1 | 2 | 3 | 4 | null;
}>;

export type ExperienceQuestion = Readonly<{
  id: ExperienceQuestionId;
  position: number;
  number: number;
  dimensionId: ExperienceDimensionId;
  scale: ExperienceScaleId;
  directText: string;
  representativeText: string;
  sourceIds: readonly ExperienceSourceId[];
}>;

export type ExperienceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
}>;

export const EXPERIENCE_DIMENSIONS: readonly ExperienceDimension[];
export const EXPERIENCE_QUESTIONS: readonly ExperienceQuestion[];
export const EXPERIENCE_QUESTION_BY_ID: Readonly<Record<ExperienceQuestionId, ExperienceQuestion>>;
export const EXPERIENCE_SCALE_OPTIONS: Readonly<{
  frequency: readonly ExperienceScaleOption<FrequencyAnswerValue>[];
  fulfillment: readonly ExperienceScaleOption<FulfillmentAnswerValue>[];
}>;
export const RELATIONSHIP_OPTIONS: readonly ExperienceOption<RelationshipValue>[];
export const RESPONDENT_OPTIONS: readonly ExperienceOption<RespondentValue>[];
export const PARTICIPATION_OPTIONS: readonly ExperienceOption<ParticipationValue>[];

export type ExperienceDimensionScore = {
  sum: number;
  scoredCount: number;
  excludedCount: number;
  missingCount: number;
  average: number | null;
  category: ExperienceCategory | null;
};

export type ExperienceScoresByDimension = Record<ExperienceDimensionId, ExperienceDimensionScore>;

export function isAnswerAllowedForQuestion(
  questionOrId: ExperienceQuestionId | ExperienceQuestion | string,
  answer: unknown,
): boolean;

export function scoreExperienceAnswers(answers: unknown): ExperienceScoresByDimension;

export type ExperienceDraft = {
  version: 1;
  savedAt: string;
  step?: number;
  facilityId?: string;
  privacyMode?: ExperiencePrivacyMode;
  relationship?: RelationshipValue;
  respondentType?: RespondentValue;
  residentParticipation?: ParticipationValue;
  answers: Partial<Record<ExperienceQuestionId, ExperienceAnswerValue>>;
};

export function sanitizeExperienceDraft(value: unknown, now?: number | Date): ExperienceDraft | null;
