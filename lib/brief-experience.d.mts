export type BriefExperienceRelationship = "resident" | "family";
export type BriefExperienceRating = "outstanding" | "good" | "requires_improvement" | "inadequate" | "unrated";
export const BRIEF_EXPERIENCE_VERSION: 6;
export const BRIEF_EXPERIENCE_PRIVACY_NOTICE: string;
export const BRIEF_EXPERIENCE_RATINGS: ReadonlyArray<{ value: BriefExperienceRating; label: string }>;
export const BRIEF_EXPERIENCE_SECTIONS: ReadonlyArray<{
  id: string; title: string; residentPrompt: string; familyPrompt: string; aspects: ReadonlyArray<readonly [string, string]>;
}>;
export function briefExperienceSituationPrefix(rating: BriefExperienceRating): string;
export function briefExperienceSituationTitle(rating: BriefExperienceRating): string;
export function getBriefExperienceAspects(sectionId: string, rating: BriefExperienceRating | null, relationshipType?: BriefExperienceRelationship): Array<readonly [string, string]>;
export function briefExperienceCommentPrompt(relationshipType: BriefExperienceRelationship): string;
export function parseBriefExperienceSubmission(value: unknown): null | {
  facilityId: number | null;
  demoFacilityId: string | null;
  answers: Array<{ sectionId: string; rating: BriefExperienceRating | null; reasonIds: string[]; skipped: boolean }>;
  comment: string | null;
  publicationConsent: boolean;
  sendToFacility: boolean;
  shareContactWithFacility: boolean;
};
