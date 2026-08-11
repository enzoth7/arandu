import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import {
  importMissingManualCandidates,
  synchronizeRegistry,
} from "../unify-elepem-registry.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL;

test("backfill local conserva la fuente social y no publica el candidato", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL no definido",
}, async () => {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("begin");
  try {
    const candidate = {
      candidateKey: "test:instagram:unified-registry",
      name: "ELEPEM de prueba local",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Prueba 1234",
      hasCoordinates: true,
      latitude: -34.9,
      longitude: -56.2,
      evidenceTier: "C",
      retrievedAt: "2026-08-10T12:00:00.000Z",
    };
    const origin = {
      file: "fixture-local.json",
      dataset: "fixture-local",
      generatedAt: candidate.retrievedAt,
      row: {
        notes: "Fixture local; no publicable.",
        phones: ["2900 0000"],
        sources: [{
          type: "instagram_public_profile",
          url: "https://www.instagram.com/arandu.test/",
          observed_at: "2026-08-10",
          claims: ["nombre comercial"],
        }],
      },
    };
    const rawByKey = new Map([[candidate.candidateKey, origin]]);

    await importMissingManualCandidates(client, [candidate], rawByKey);
    await synchronizeRegistry(client, rawByKey);

    const facility = (await client.query(`
      select identity_status, registry_visibility, location_status,
        registry_msp_final, registry_mides_social, demo_monthly_price_uyu
      from elepem_core.facilities
      where origin_candidate_id = (
        select id from discovery_private.facility_candidates where candidate_key = $1
      )
    `, [candidate.candidateKey])).rows[0];
    assert.deepEqual(facility, {
      identity_status: "pending_identity_review",
      registry_visibility: "held_identity",
      location_status: "mapped",
      registry_msp_final: false,
      registry_mides_social: false,
      demo_monthly_price_uyu: null,
    });

    assert.equal((await client.query(`
      select count(*)::integer as count
      from public.arandu_facilities_registry
      where id = 'FAC-CANDIDATE-' || (
        select id::text from discovery_private.facility_candidates where candidate_key = $1
      )
    `, [candidate.candidateKey])).rows[0].count, 0);

    const observation = (await client.query(`
      select source_url, normalized_name, normalized_address, raw_metadata
      from discovery_private.facility_source_observations
      where source_record_key like $1
    `, [`${candidate.candidateKey}:%`])).rows[0];
    assert.equal(observation.source_url, "https://www.instagram.com/arandu.test/");
    assert.equal(observation.normalized_name, null);
    assert.equal(observation.normalized_address, null);
    assert.equal(observation.raw_metadata, null);

    assert.equal((await client.query(`
      select count(*)::integer as count
      from public.arandu_facility_source_links
      where source_url = 'https://www.instagram.com/arandu.test/'
    `)).rows[0].count, 1);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
});
