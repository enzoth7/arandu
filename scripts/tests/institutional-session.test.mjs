import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeInstitutionalSession,
  createInstitutionalSession,
  institutionalIdentityForCredentials,
  readInstitutionalSession,
} from "../../lib/institutional-session.mjs";

process.env.INSTITUTIONAL_SESSION_SECRET = "institutional-test-secret-at-least-32-characters";
process.env.DEMO_MODE = "true";
process.env.STATE_DEMO_USERNAME = "estado-prueba";
process.env.STATE_DEMO_PASSWORD = "123456";
process.env.FACILITY_DEMO_USERNAME = "elepem-prueba";
process.env.FACILITY_DEMO_PASSWORD = "123456";
process.env.FACILITY_DEMO_IDS = "DEMO-ELEPEM-001,DEMO-ELEPEM-003";

test("las credenciales demo están separadas por rol", () => {
  assert.equal(institutionalIdentityForCredentials("state", "estado-prueba", "123456")?.role, "state");
  assert.equal(institutionalIdentityForCredentials("facility", "elepem-prueba", "123456")?.role, "facility");
  assert.equal(institutionalIdentityForCredentials("state", "elepem-prueba", "123456"), null);
  assert.equal(institutionalIdentityForCredentials("facility", "estado-prueba", "123456"), null);
});

test("las APIs distinguen sesión ausente (401) de rol incorrecto (403)", () => {
  const now = Date.parse("2026-08-10T12:00:00Z");
  const stateCookie = createInstitutionalSession({ role: "state", identity: "estado-prueba", organizationId: "STATE-DEMO-UY", facilityIds: [] }, now);
  const facilityCookie = createInstitutionalSession({ role: "facility", identity: "elepem-prueba", organizationId: "ORG-DEMO", facilityIds: ["DEMO-ELEPEM-001"] }, now);
  assert.deepEqual(authorizeInstitutionalSession(null, "state", now), { ok: false, status: 401 });
  assert.deepEqual(authorizeInstitutionalSession(facilityCookie, "state", now), { ok: false, status: 403 });
  assert.equal(authorizeInstitutionalSession(stateCookie, "state", now).ok, true);
  assert.equal(authorizeInstitutionalSession(stateCookie, "facility", now).ok, false);
});

test("la sesión firmada conserva rol, identidad, vencimiento y asignaciones", () => {
  const now = Date.parse("2026-08-10T12:00:00Z");
  const identity = institutionalIdentityForCredentials("facility", "elepem-prueba", "123456");
  const cookie = createInstitutionalSession(identity, now);
  const session = readInstitutionalSession(cookie, now + 1_000);
  assert.equal(session?.role, "facility");
  assert.equal(session?.identity, "elepem-prueba");
  assert.deepEqual(session?.facilityIds, ["DEMO-ELEPEM-001", "DEMO-ELEPEM-003"]);
  assert.equal(readInstitutionalSession(cookie, now + 8 * 60 * 60 * 1_000 + 1), null);
  assert.equal(readInstitutionalSession(`${cookie}alterado`, now), null);
});

test("un rol ELEPEM sin asignaciones reservadas no puede crear sesión", () => {
  assert.throws(() => createInstitutionalSession({ role: "facility", identity: "demo", organizationId: "ORG-DEMO", facilityIds: [] }));
});
