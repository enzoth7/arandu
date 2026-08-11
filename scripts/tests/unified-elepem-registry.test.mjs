import assert from "node:assert/strict";
import test from "node:test";
import {
  MIDES_URL,
  MSP_URL,
  PRICE_BUCKETS,
  sourceLabel,
  sourceType,
} from "../unify-elepem-registry.mjs";

test("clasifica fuentes originales sin exponer el archivo JSON de importacion", () => {
  assert.equal(sourceType("instagram_public_profile"), "social_public_url");
  assert.equal(sourceType("facebook_public_page"), "social_public_url");
  assert.equal(sourceType("official"), "official");
  assert.equal(sourceType("facility_website"), "facility_website");
  assert.equal(sourceLabel("https://www.instagram.com/ejemplo/", "social_public_url"), "Instagram");
  assert.equal(sourceLabel("https://www.facebook.com/ejemplo/", "social_public_url"), "Facebook");
  assert.equal(sourceLabel("https://ejemplo.uy/", "facility_website"), "Sitio institucional");
});

test("mantiene fuentes oficiales clickeables y precios demo mensuales plausibles", () => {
  assert.match(MSP_URL, /^https:\/\/www\.gub\.uy\/ministerio-salud-publica\//);
  assert.match(MIDES_URL, /^https:\/\/www\.gub\.uy\/ministerio-desarrollo-social\//);
  assert.deepEqual(PRICE_BUCKETS, [55_000, 65_000, 75_000, 85_000, 95_000, 110_000]);
  assert.ok(PRICE_BUCKETS.every((price) => Number.isInteger(price) && price > 0));
});
