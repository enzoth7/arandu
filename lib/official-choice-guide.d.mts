export type OfficialChoiceGuideSource = Readonly<{
  title: string;
  year: number;
  url: string;
  sha256: string;
  version: string;
}>;

export type OfficialChoiceGuide = Readonly<{
  before: readonly string[];
  what: readonly string[];
  how: readonly string[];
  goodSignals: readonly string[];
  badSignals: readonly string[];
  closing: readonly string[];
}>;

export const OFFICIAL_CHOICE_GUIDE_SOURCE: OfficialChoiceGuideSource;
export const OFFICIAL_CHOICE_GUIDE: OfficialChoiceGuide;
export function officialChoiceGuideCanonicalText(): string;
