import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateSuggestionSql,
  matchingFacilityRelation,
  publicFacilityRelation,
  readElepemDataSource,
  runtimeElepemDataSource,
} from "../../lib/elepem-data-source.mjs";

test("the unified registry is the default and mandatory web runtime source", () => {
  assert.equal(readElepemDataSource(""), "normalized");
  assert.equal(runtimeElepemDataSource(), "normalized");
  assert.equal(publicFacilityRelation("legacy"), "public.residenciales");
});

test("compatibility and normalized relations are fixed allowlisted names", () => {
  assert.equal(
    publicFacilityRelation("compatibility"),
    "public.residenciales_legacy_compat",
  );
  assert.equal(
    publicFacilityRelation("normalized"),
    "public.arandu_facilities_registry",
  );
  assert.equal(
    matchingFacilityRelation("normalized"),
    "public.known_facilities_exclusion_view",
  );
  assert.equal(
    matchingFacilityRelation("compatibility"),
    "public.residenciales_legacy_compat",
  );
});

test("invalid data source cannot reach SQL interpolation", () => {
  assert.throws(() => readElepemDataSource("public.residenciales; drop table x"));
});

test("normalized candidate suggestions join only canonical facility IDs", () => {
  const sql = candidateSuggestionSql("normalized");
  assert.match(sql, /facilities_current_internal/);
  assert.match(sql, /suggestion\.facility_id/);
  assert.doesNotMatch(sql, /join public\.residenciales as/);
});
