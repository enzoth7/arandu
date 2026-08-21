import test from "node:test";
import assert from "node:assert/strict";
import {
  BRIEF_EXPERIENCE_SECTIONS,
  BRIEF_EXPERIENCE_VERSION,
  parseBriefExperienceSubmission,
} from "../../lib/brief-experience.mjs";

function validSubmission() {
  return {
    version: BRIEF_EXPERIENCE_VERSION,
    facilityId: 244,
    answers: BRIEF_EXPERIENCE_SECTIONS.map((section, index) => ({
      sectionId: section.id,
      rating: index === 0 ? "good" : null,
      reasonIds: index === 0 ? [section.aspects[0][0]] : [],
      skipped: index !== 0,
    })),
    comment: "Una experiencia breve y sin datos personales.",
    publicationConsent: true,
    sendToFacility: false,
    shareContactWithFacility: false,
    consent: true,
  };
}

test("accepts the five-section contract without contact or attachments", () => {
  const parsed = parseBriefExperienceSubmission(validSubmission());
  assert.equal(parsed?.facilityId, 244);
  assert.equal(parsed?.answers.length, 5);
  assert.equal(parsed?.answers[0].rating, "good");
});

test("accepts the isolated test ELEPEM without treating it as a public bigint", () => {
  const parsed = parseBriefExperienceSubmission({ ...validSubmission(), facilityId: "DEMO-ELEPEM-001" });
  assert.equal(parsed?.facilityId, null);
  assert.equal(parsed?.demoFacilityId, "DEMO-ELEPEM-001");
  assert.equal(parseBriefExperienceSubmission({ ...validSubmission(), facilityId: "DEMO-ELEPEM-9999" }), null);
});

test("keeps skipped and unrated as distinct states", () => {
  const submission = validSubmission();
  submission.answers[1] = { sectionId: BRIEF_EXPERIENCE_SECTIONS[1].id, rating: "unrated", reasonIds: [], skipped: false };
  const parsed = parseBriefExperienceSubmission(submission);
  assert.equal(parsed?.answers[1].rating, "unrated");
  assert.equal(parsed?.answers[2].skipped, true);
});

test("rejects reasons for an unrated section and stale reasons after a rating change", () => {
  const submission = validSubmission();
  submission.answers[0] = { sectionId: BRIEF_EXPERIENCE_SECTIONS[0].id, rating: "unrated", reasonIds: [BRIEF_EXPERIENCE_SECTIONS[0].aspects[0][0]], skipped: false };
  assert.equal(parseBriefExperienceSubmission(submission), null);
});

test("rejects unknown sections, extra fields and comments over 1200 characters", () => {
  const unknown = validSubmission();
  unknown.answers[0].sectionId = "other";
  assert.equal(parseBriefExperienceSubmission(unknown), null);
  assert.equal(parseBriefExperienceSubmission({ ...validSubmission(), attachments: [] }), null);
  assert.equal(parseBriefExperienceSubmission({ ...validSubmission(), comment: "x".repeat(1201) }), null);
});

test("requires content and keeps contact sharing dependent on facility delivery", () => {
  const empty = validSubmission();
  empty.answers = BRIEF_EXPERIENCE_SECTIONS.map((section) => ({ sectionId: section.id, rating: null, reasonIds: [], skipped: true }));
  empty.comment = "";
  assert.equal(parseBriefExperienceSubmission(empty), null);
  assert.equal(parseBriefExperienceSubmission({ ...validSubmission(), shareContactWithFacility: true }), null);
});
