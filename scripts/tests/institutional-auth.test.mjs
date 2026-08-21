import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseFacilityChangeSubmission } from "../../lib/demo-intake.mjs";

test("facility changes accept real bigint identifiers and explicit contact lists", () => {
  const parsed = parseFacilityChangeSubmission({
    facilityId: 244,
    changes: { phones: ["2400 0000", "+598 99 123 456"], emails: ["INFO@EXAMPLE.UY"] },
    evidenceNote: "Actualización del contacto institucional.",
    photoCount: 0,
  });
  assert.equal(parsed?.facilityId, 244);
  assert.deepEqual(parsed?.payload.changes, { phones: ["2400 0000", "+598 99 123 456"], emails: ["info@example.uy"] });
});

test("price changes require amount, date and a non-Supabase public URL", () => {
  const base = { facilityId: 244, changes: { monthlyPriceFromUyu: 55000 }, photoCount: 0 };
  assert.equal(parseFacilityChangeSubmission(base), null);
  assert.equal(parseFacilityChangeSubmission({ ...base, priceDate: "2026-08-21", priceSourceUrl: "https://project.supabase.co/storage/file.pdf" }), null);
  assert.ok(parseFacilityChangeSubmission({ ...base, priceDate: "2026-08-21", priceSourceUrl: "https://elepem.example.uy/precios" }));
});

test("facility changes reject protected fields and invalid identifiers", () => {
  assert.equal(parseFacilityChangeSubmission({ facilityId: "DEMO-ELEPEM-001", changes: { name: "Prueba" }, photoCount: 0 }), null);
  const parsed = parseFacilityChangeSubmission({ facilityId: 244, changes: { lat: -34.9 }, photoCount: 0 });
  assert.equal(parsed, null);
});

test("institutional schema forces RLS and removes direct intake inserts", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/20260821045927_add_institutional_accounts_and_facility_memberships.sql", import.meta.url), "utf8");
  assert.match(migration, /force row level security/i);
  assert.match(migration, /drop policy if exists "anonymous intake submissions only"/i);
  assert.match(migration, /revoke insert on table public\.intake_reports from anon, authenticated/i);
  assert.match(migration, /submitted_by_user_id uuid/i);
});

test("registration, password login and recovery are separate account flows", async () => {
  const [register, login, password, recover, accountAccess] = await Promise.all([
    readFile(new URL("../../app/api/auth/register/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/auth/password/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/auth/recover/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/components/AccountAccess.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(register, /shouldCreateUser:\s*true/);
  assert.match(register, /\/crear-contrasena/);
  assert.match(login, /signInWithPassword/);
  assert.match(password, /getUser\(\)/);
  assert.match(password, /updateUser\(\{ password \}\)/);
  assert.match(recover, /resetPasswordForEmail/);
  assert.match(recover, /over_email_send_rate_limit/);
  assert.match(recover, /Retry-After/);
  assert.match(register, /over_email_send_rate_limit/);
  assert.match(accountAccess, /Registrarte/);
  assert.match(accountAccess, /Iniciar sesión/);
  assert.match(accountAccess, /Olvidé mi contraseña/);
  assert.doesNotMatch(`${register}\n${login}\n${password}`, /user_metadata/);
});

test("roles and relationship requests remain server-controlled and separated", async () => {
  const [migration, auth, workflows, moderationInbox, verificationPage] = await Promise.all([
    readFile(new URL("../../supabase/migrations/20260821190208_institutional_roles_and_requests.sql", import.meta.url), "utf8"),
    readFile(new URL("../../lib/institutional-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../../lib/role-workflows-db.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/api/institutional/state/inbox/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../app/equipo/verificaciones/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /administrator.*verifier.*moderator.*support.*facility_representative/s);
  assert.match(migration, /status in \('pending', 'verified', 'expired', 'disputed', 'rejected', 'revoked'\)/);
  assert.match(auth, /current === "administrator" \|\| current === required/);
  assert.match(auth, /facilityIds\.length === 0/);
  assert.match(workflows, /Solo se puede aprobar una solicitud pendiente/);
  assert.match(workflows, /from auth\.users where lower\(email\) = lower\(\$1\)/);
  assert.match(moderationInbox, /entry_type = 'experience'/);
  assert.match(moderationInbox, /'\[\]'::jsonb AS contacts/);
  assert.match(moderationInbox, /'\[\]'::jsonb AS attachments/);
  assert.match(moderationInbox, /pseudonymizePayload/);
  assert.doesNotMatch(moderationInbox, /'actor', event\.actor|'internal_note', event\.internal_note/);
  assert.doesNotMatch(verificationPage, /StateInbox|brief-experience|intake_reports/i);
});
