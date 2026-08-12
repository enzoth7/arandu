import { intakeText, isRecord } from "./intake-report.mjs";

export const DEMO_FACILITY_ID_PATTERN = /^DEMO-ELEPEM-00[1-3]$/;
export const EXPERIENCE_ANSWER_VALUES = new Set(["yes", "partial", "no", "unknown", "prefer_not_to_answer"]);
export const EXPERIENCE_PRIVACY_VALUES = new Set(["Anónima", "Confidencial", "Con identidad registrada"]);

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
  const periodStartYear = /^\d{4}$/.test(String(value.periodStartYear || "")) ? String(value.periodStartYear) : null;
  const periodEndYear = /^\d{4}$/.test(String(value.periodEndYear || "")) ? String(value.periodEndYear) : null;
  const periodUnknown = value.periodUnknown === true;
  const period = periodUnknown
    ? "No recuerda el período"
    : (intakeText(value.period, 120) || (periodStartYear && periodEndYear ? `De ${periodStartYear} a ${periodEndYear}` : periodStartYear ? `Desde ${periodStartYear}` : periodEndYear ? `Hasta ${periodEndYear}` : null));
  const requestedDestinationInput = intakeText(value.requestedDestination, 40);
  const publicationConsentRequested = value.publicationConsent === true;
  const privacyInput = intakeText(value.privacy, 40);
  const privacy = EXPERIENCE_PRIVACY_VALUES.has(privacyInput) ? privacyInput : "Anónima";
  const narrative = intakeText(value.narrative, 6_000);
  const submittedContact = optionalContact(value.contact);
  const contact = privacy === "Anónima" ? null : submittedContact;
  const answersValue = isRecord(value.answers) ? value.answers : {};
  const answers = Object.fromEntries(
    Object.entries(answersValue)
      .filter(([key, answer]) => key.length <= 80 && EXPERIENCE_ANSWER_VALUES.has(answer))
      .slice(0, 20),
  );

  if (!facilityId || facilityId.length > 240 || contact === false || value.consent !== true) return null;
  if (!periodUnknown && periodStartYear && periodEndYear && Number(periodStartYear) > Number(periodEndYear)) return null;
  const requestedDestination = requestedDestinationInput === "consider_anonymized" && publicationConsentRequested
    ? "consider_anonymized"
    : ["private_review", "private_facility"].includes(requestedDestinationInput) ? requestedDestinationInput : "private_review";
  const publicationConsent = requestedDestination === "consider_anonymized";

  return {
    payload: {
      version: 4,
      submittedAt: new Date().toISOString(),
      facilityId,
      relationship: relationship || null,
      period: period || null,
      periodStartYear,
      periodEndYear,
      periodUnknown,
      answers,
      narrative: narrative || null,
      requestedDestination,
      publicationConsent,
      privacy,
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
  const photoCount = Number(value.photoCount || 0);
  const removeCurrentPhoto = value.removeCurrentPhoto === true;
  const changes = {};
  for (const [key, max] of Object.entries({ name: 300, address: 500, description: 2_000, phone: 24, email: 254 })) {
    const normalized = intakeText(value.changes[key], max);
    if (normalized) changes[key] = normalized;
  }
  const rawPrice = Number(value.changes.monthlyPriceFromUyu);
  if (Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice <= 10_000_000) changes.monthlyPriceFromUyu = Math.round(rawPrice);
  if (!DEMO_FACILITY_ID_PATTERN.test(facilityId)) return null;
  if (effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return null;
  if (!Number.isInteger(photoCount) || photoCount < 0 || photoCount > 10) return null;
  if (Object.keys(changes).length === 0 && photoCount === 0 && !removeCurrentPhoto) return null;
  const needsSupportingDocument = ["name", "address", "phone", "email", "monthlyPriceFromUyu"].some((key) => key in changes);
  return {
    facilityId,
    payload: {
      version: 3,
      submittedAt: new Date().toISOString(),
      facilityId,
      effectiveDate: effectiveDate || null,
      evidenceNote: evidenceNote || null,
      changes,
      photoCount,
      removeCurrentPhoto,
      needsSupportingDocument,
      decision: "review_and_preview_only",
      publication: "never_automatic",
    },
  };
}
