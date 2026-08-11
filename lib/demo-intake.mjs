import { intakeText, isRecord } from "./intake-report.mjs";

export const DEMO_FACILITY_ID_PATTERN = /^DEMO-ELEPEM-00[1-3]$/;
export const EXPERIENCE_ANSWER_VALUES = new Set(["yes", "partial", "no", "unknown", "prefer_not_to_answer"]);

function optionalContact(value) {
  if (!isRecord(value)) return null;
  const name = intakeText(value.name, 160);
  const phone = intakeText(value.phone, 24);
  const email = intakeText(value.email, 254).toLowerCase();
  if (phone && !/^[+()0-9\s.-]{6,24}$/.test(phone)) return false;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return name || phone || email ? { name: name || null, phone: phone || null, email: email || null } : null;
}

export function parseExperienceSubmission(value) {
  if (!isRecord(value)) return null;
  const facilityId = typeof value.facilityId === "string" ? value.facilityId.trim() : "";
  const relationship = intakeText(value.relationship, 120);
  const period = intakeText(value.period, 120);
  const requestedDestination = intakeText(value.requestedDestination, 40);
  const publicationConsent = value.publicationConsent === true;
  const narrative = intakeText(value.narrative, 6_000);
  const contact = optionalContact(value.contact);
  const answersValue = isRecord(value.answers) ? value.answers : {};
  const answers = Object.fromEntries(
    Object.entries(answersValue)
      .filter(([key, answer]) => key.length <= 80 && EXPERIENCE_ANSWER_VALUES.has(answer))
      .slice(0, 20),
  );

  if (!facilityId || facilityId.length > 240 || !relationship || !period) return null;
  if (Object.keys(answers).length < 4 || contact === false || value.consent !== true) return null;
  if (!["aggregate", "private_facility", "consider_anonymized"].includes(requestedDestination)) return null;
  if (publicationConsent !== (requestedDestination === "consider_anonymized")) return null;

  return {
    payload: {
      version: 3,
      submittedAt: new Date().toISOString(),
      facilityId,
      relationship,
      period,
      answers,
      narrative: narrative || null,
      requestedDestination,
      publicationConsent,
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
  const facilityId = intakeText(value.facilityId, 32);
  const effectiveDate = intakeText(value.effectiveDate, 10);
  const evidenceNote = intakeText(value.evidenceNote, 2_000);
  const sourceDeclaration = intakeText(value.photoSourceDeclaration, 1_000);
  const changes = {};
  for (const [key, max] of Object.entries({ name: 300, address: 500, description: 2_000, phone: 24, email: 254 })) {
    const normalized = intakeText(value.changes[key], max);
    if (normalized) changes[key] = normalized;
  }
  const rawPrice = Number(value.changes.monthlyPriceFromUyu);
  if (Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice <= 10_000_000) changes.monthlyPriceFromUyu = Math.round(rawPrice);
  if (!DEMO_FACILITY_ID_PATTERN.test(facilityId) || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || evidenceNote.length < 10) return null;
  if (Object.keys(changes).length === 0 && value.hasPhoto !== true) return null;
  if (value.hasPhoto === true && (value.photoRightsConfirmed !== true || sourceDeclaration.length < 10)) return null;
  return {
    facilityId,
    payload: {
      version: 2,
      submittedAt: new Date().toISOString(),
      facilityId,
      effectiveDate,
      evidenceNote,
      changes,
      photo: value.hasPhoto === true ? { sourceDeclaration, rightsConfirmed: true } : null,
      decision: "review_and_preview_only",
      publication: "never_automatic",
    },
  };
}
