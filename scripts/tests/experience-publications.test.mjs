import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeExperienceCursor,
  encodeExperienceCursor,
  parseExperiencePageLimit,
  parseExperiencePreview,
  parseExperienceWithdrawal,
} from "../../lib/experience-publications.mjs";

const PUBLICATION_ID = "123e4567-e89b-42d3-a456-426614174000";

test("la vista previa publica exige texto moderado y limita metadatos", () => {
  assert.deepEqual(parseExperiencePreview({
    publicBody: "  Una experiencia anonimizada y moderada.  ",
    publicRelationship: " Familiar ",
    publicPeriod: "2026",
  }), {
    publicBody: "Una experiencia anonimizada y moderada.",
    publicRelationship: "Familiar",
    publicPeriod: "2026",
  });
  assert.equal(parseExperiencePreview({ publicBody: "corto" }), null);
  assert.equal(parseExperiencePreview({ publicBody: "Una experiencia valida.", publicPeriod: "x".repeat(161) }), null);
});

test("el motivo de retiro es opcional pero estrictamente acotado", () => {
  assert.deepEqual(parseExperienceWithdrawal(null), { reason: null });
  assert.deepEqual(parseExperienceWithdrawal({ reason: " Revision estatal " }), { reason: "Revision estatal" });
  assert.equal(parseExperienceWithdrawal({ reason: "x".repeat(1001) }), null);
});

test("el cursor publico es opaco, estable y rechaza entradas alteradas", () => {
  const encoded = encodeExperienceCursor({ publishedAt: "2026-08-11T15:30:00.000Z", id: PUBLICATION_ID });
  assert.deepEqual(decodeExperienceCursor(encoded), {
    publishedAt: "2026-08-11T15:30:00.000Z",
    id: PUBLICATION_ID,
  });
  assert.equal(decodeExperienceCursor(`${encoded}!`), false);
  assert.equal(decodeExperienceCursor("no-es-json"), false);
});

test("el tamano de pagina usa 5 por defecto y un maximo de 20", () => {
  assert.equal(parseExperiencePageLimit(null), 5);
  assert.equal(parseExperiencePageLimit("1"), 1);
  assert.equal(parseExperiencePageLimit("20"), 20);
  assert.equal(parseExperiencePageLimit("0"), null);
  assert.equal(parseExperiencePageLimit("21"), null);
});
