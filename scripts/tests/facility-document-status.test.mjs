import assert from "node:assert/strict";
import test from "node:test";
import { facilityDocumentStatus } from "../../lib/facility-document-status.mjs";

test("el semáforo documental sólo usa MSP final y MIDES", () => {
  assert.deepEqual(facilityDocumentStatus({ mspFinal: true, midesSocial: true, mspRegistroHistorico: false }), { key: "outstanding", label: "Sobresaliente", stars: 4, tone: "strong-green" });
  assert.equal(facilityDocumentStatus({ mspFinal: true, midesSocial: false, mspRegistroHistorico: false }).stars, 3);
  assert.equal(facilityDocumentStatus({ mspFinal: false, midesSocial: true, mspRegistroHistorico: false }).stars, 3);
  assert.equal(facilityDocumentStatus({ mspFinal: false, midesSocial: false, mspRegistroHistorico: true }).stars, 2);
});
