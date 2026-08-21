import { intakeText, isRecord } from "./intake-report.mjs";
import {
  EXPERIENCE_QUESTIONNAIRE_VERSION,
  EXPERIENCE_QUESTIONS,
  EXPERIENCE_QUESTION_BY_ID,
  EXPERIENCE_SCALE_OPTIONS,
  EXPERIENCE_SCORING_VERSION,
  PARTICIPATION_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESPONDENT_OPTIONS,
  isAnswerAllowedForQuestion,
  scoreExperienceAnswers,
} from "./experience-questionnaire.mjs";

export const EXPERIENCE_PAYLOAD_VERSION = 5;
export const EXPERIENCE_PRIVACY_NOTICE_VERSION = "vcr1-2026-08-17";
export const EXPERIENCE_ANSWER_VALUES = new Set(
  Object.values(EXPERIENCE_SCALE_OPTIONS).flat().map((option) => option.value),
);
export const EXPERIENCE_PRIVACY_VALUES = new Set(["anonymous", "confidential", "registered_identity"]);

const EXPERIENCE_SUBMISSION_KEYS = new Set([
  "version",
  "facilityId",
  "privacyMode",
  "contact",
  "relationship",
  "relationshipOther",
  "respondentType",
  "residentParticipation",
  "narrative",
  "answers",
  "requestedDestination",
  "publicationConsent",
  "futureAuthorizations",
  "consent",
]);
const CONTACT_KEYS = new Set(["fullName", "phone", "email"]);
const FUTURE_AUTHORIZATION_KEYS = new Set(["publicName", "sendToFacility", "shareContactWithFacility"]);
const RELATIONSHIP_VALUES = new Set(RELATIONSHIP_OPTIONS.map((option) => option.value));
const RESPONDENT_TYPE_VALUES = new Set(RESPONDENT_OPTIONS.map((option) => option.value));
const RESIDENT_PARTICIPATION_VALUES = new Set(PARTICIPATION_OPTIONS.map((option) => option.value));

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function hasExactKeys(value, expectedKeys) {
  return Object.keys(value).length === expectedKeys.size && hasOnlyKeys(value, expectedKeys);
}

function optionalStrictText(value, maximum) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > maximum || /\0/.test(value)) return false;
  return value.trim() || null;
}

function contactForSubmission(value, privacyMode) {
  if (value === null) return null;
  if (!isRecord(value) || !hasExactKeys(value, CONTACT_KEYS)) return false;
  if (![value.fullName, value.phone, value.email].every((entry) => entry === null || typeof entry === "string")) return false;

  const name = optionalStrictText(value.fullName, 160);
  const phone = optionalStrictText(value.phone, 24);
  const rawEmail = optionalStrictText(value.email, 254);
  if (name === false || phone === false || rawEmail === false) return false;
  if (phone && !/^[+()0-9\s.-]{6,24}$/.test(phone)) return false;
  const email = rawEmail ? rawEmail.toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

  if (privacyMode === "anonymous") return null;
  return name || phone || email ? { name, phone, email } : null;
}

function answersForSubmission(value) {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > EXPERIENCE_QUESTIONS.length) return false;
  for (const [questionId, answer] of entries) {
    if (!EXPERIENCE_QUESTION_BY_ID[questionId] || !isAnswerAllowedForQuestion(questionId, answer)) return false;
  }
  return Object.fromEntries(
    EXPERIENCE_QUESTIONS
      .filter((question) => Object.hasOwn(value, question.id))
      .map((question) => [question.id, value[question.id]]),
  );
}

export function parseExperienceSubmission(value) {
  if (!isRecord(value) || !hasOnlyKeys(value, EXPERIENCE_SUBMISSION_KEYS) || value.version !== EXPERIENCE_PAYLOAD_VERSION) return null;
  if (!Object.hasOwn(value, "contact") || !Object.hasOwn(value, "narrative")) return null;
  if (value.narrative !== null && typeof value.narrative !== "string") return null;
  if (typeof value.facilityId !== "string" || value.facilityId.length > 240 || /[\0-\x1f\x7f]/.test(value.facilityId)) return null;
  const facilityId = value.facilityId.trim();
  const privacyMode = EXPERIENCE_PRIVACY_VALUES.has(value.privacyMode) ? value.privacyMode : null;
  const relationship = RELATIONSHIP_VALUES.has(value.relationship) ? value.relationship : null;
  const respondentType = RESPONDENT_TYPE_VALUES.has(value.respondentType) ? value.respondentType : null;
  const residentParticipation = RESIDENT_PARTICIPATION_VALUES.has(value.residentParticipation) ? value.residentParticipation : null;
  const relationshipOther = optionalStrictText(value.relationshipOther, 240);
  const narrative = optionalStrictText(value.narrative, 6_000);
  const answers = answersForSubmission(value.answers);
  if (
    !facilityId
    || !privacyMode
    || !relationship
    || !respondentType
    || !residentParticipation
    || relationshipOther === false
    || narrative === false
    || answers === false
    || value.consent !== true
  ) return null;
  if (relationship === "other" ? !relationshipOther : value.relationshipOther !== null) return null;
  if (Object.keys(answers).length === 0 && !narrative) return null;

  const contact = contactForSubmission(value.contact, privacyMode);
  if (contact === false) return null;
  if (!isRecord(value.futureAuthorizations) || !hasOnlyKeys(value.futureAuthorizations, FUTURE_AUTHORIZATION_KEYS)) return null;
  const { publicName, shareContactWithFacility } = value.futureAuthorizations;
  const sendToFacility = value.futureAuthorizations.sendToFacility === true;
  if (
    typeof publicName !== "boolean"
    || typeof shareContactWithFacility !== "boolean"
    || (value.futureAuthorizations.sendToFacility !== undefined && typeof value.futureAuthorizations.sendToFacility !== "boolean")
  ) return null;
  if (privacyMode !== "registered_identity" && publicName) return null;
  if (publicName && !contact?.name) return null;
  if (shareContactWithFacility && (!sendToFacility || !contact)) return null;

  const requestedDestination = value.requestedDestination;
  const destinationAllowed = requestedDestination === "private_review" || requestedDestination === "consider_anonymized";
  if (!destinationAllowed || typeof value.publicationConsent !== "boolean") return null;
  const publicationConsent = requestedDestination === "consider_anonymized";
  if (value.publicationConsent !== publicationConsent) return null;

  return {
    payload: {
      version: EXPERIENCE_PAYLOAD_VERSION,
      questionnaireVersion: EXPERIENCE_QUESTIONNAIRE_VERSION,
      scoringVersion: EXPERIENCE_SCORING_VERSION,
      privacyNoticeVersion: EXPERIENCE_PRIVACY_NOTICE_VERSION,
      submittedAt: new Date().toISOString(),
      facilityId,
      relationship,
      relationshipOther,
      respondentType,
      residentParticipation,
      answers,
      dimensionResults: scoreExperienceAnswers(answers),
      narrative,
      requestedDestination,
      publicationConsent,
      privacyMode,
      futureAuthorizations: { publicName, sendToFacility, shareContactWithFacility },
      consent: true,
      publication: "never_automatic",
    },
    contact,
  };
}

export function demoIntakeEnabled(env = process.env) {
  return env.DEMO_MODE === "true" && env.DEMO_INTAKE_ENABLED === "true";
}

export function parseFacilityChangeSubmission(value) {
  if (!isRecord(value) || !isRecord(value.changes)) return null;
  const facilityId = Number(value.facilityId);
  const evidenceNote = intakeText(value.evidenceNote, 2_000);
  const photoCount = Number(value.photoCount || 0);
  const changes = {};
  for (const [key, max] of Object.entries({ name: 300, address: 500, description: 4_000 })) {
    const normalized = intakeText(value.changes[key], max);
    if (typeof value.changes[key] === "string") {
      if ((key === "name" || key === "address") && !normalized) return null;
      changes[key] = normalized;
    }
  }
  const listRules = { phones: { maximum: 20, pattern: /^[+()0-9\s.-]{6,40}$/ }, emails: { maximum: 20, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } };
  for (const [key, rule] of Object.entries(listRules)) {
    if (!Object.hasOwn(value.changes, key)) continue;
    if (!Array.isArray(value.changes[key]) || value.changes[key].length > rule.maximum) return null;
    const entries = [...new Set(value.changes[key].map((item) => typeof item === "string" ? item.trim() : ""))];
    if (entries.some((item) => !item || !rule.pattern.test(item))) return null;
    changes[key] = key === "emails" ? entries.map((item) => item.toLowerCase()) : entries;
  }
  const rawPrice = Number(value.changes.monthlyPriceFromUyu);
  const priceChanged = Object.hasOwn(value.changes, "monthlyPriceFromUyu");
  if (priceChanged) {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0 || rawPrice > 10_000_000) return null;
    changes.monthlyPriceFromUyu = Math.round(rawPrice);
  }
  const priceDate = intakeText(value.priceDate, 10);
  const priceSourceUrl = intakeText(value.priceSourceUrl, 2_000);
  if (priceChanged && (!/^\d{4}-\d{2}-\d{2}$/.test(priceDate) || !priceSourceUrl)) return null;
  if (priceChanged) {
    try {
      const url = new URL(priceSourceUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.hostname.toLowerCase().endsWith('supabase.co')) return null;
    } catch { return null; }
  }
  if (!Number.isSafeInteger(facilityId) || facilityId <= 0) return null;
  if (!Number.isInteger(photoCount) || photoCount < 0 || photoCount > 10) return null;
  if (Object.keys(changes).length === 0 && photoCount === 0) return null;
  return {
    facilityId,
    payload: {
      version: 4,
      submittedAt: new Date().toISOString(),
      facilityId,
      evidenceNote: evidenceNote || null,
      changes,
      priceDate: priceChanged ? priceDate : null,
      priceSourceUrl: priceChanged ? priceSourceUrl : null,
      photoCount,
      photoSource: intakeText(value.photoSource, 1_000) || null,
      photoRightsConfirmed: value.photoRightsConfirmed === true,
      decision: "review_required",
      publication: "never_automatic",
    },
  };
}
