import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateSuggestionSql,
  matchingFacilityRelation,
  publicFacilityRelation,
  readElepemDataSource,
  runtimeElepemDataSource,
} from "../../lib/elepem-data-source.mjs";

test("public.elepem is the only runtime relation", () => {
  assert.equal(readElepemDataSource(""), "flat");
  assert.equal(readElepemDataSource("flat"), "flat");
  assert.equal(runtimeElepemDataSource(), "flat");
  assert.equal(publicFacilityRelation(), "public.elepem");
  assert.equal(matchingFacilityRelation(), "public.elepem");
});

test("legacy selectors and database candidate queues are disabled", () => {
  assert.throws(() => readElepemDataSource("normalized"), /public\.elepem/);
  assert.throws(() => readElepemDataSource("legacy"), /public\.elepem/);
  assert.throws(() => candidateSuggestionSql(), /retirada/);
});
