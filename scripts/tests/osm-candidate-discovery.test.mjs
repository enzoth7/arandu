import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_PROJECT_USER_AGENT,
  OSM_ATTRIBUTION,
  OSM_CANDIDATE_TAG_FILTERS,
  OSM_SOURCE_LICENSE,
  buildCacheDocument,
  buildOverpassQuery,
  normalizeOverpassPayload,
  requestOverpass,
} from "../lib/osm-candidate-discovery.mjs";

const fixturePath = new URL(
  "./fixtures/overpass-osm-candidates.json",
  import.meta.url,
);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const retrievedAt = "2026-08-02T03:00:00.000Z";

test("la consulta cubre Uruguay, nodos, vías, relaciones y etiquetas legadas", () => {
  const query = buildOverpassQuery({ timeoutSeconds: 75 });
  assert.match(query, /ISO3166-1"="UY/);
  for (const type of ["node", "way", "relation"]) {
    for (const tagFilter of OSM_CANDIDATE_TAG_FILTERS) {
      assert.ok(query.includes(`${type}${tagFilter}`));
    }
  }
  assert.match(query, /social_facility:for/);
  assert.match(query, /out tags center/);
});

test("normaliza un nodo con contacto explícito y atribución", () => {
  const candidates = normalizeOverpassPayload(fixture, retrievedAt);
  const node = candidates.find((candidate) => candidate.externalId === "node/101");
  assert.equal(node.sourceType, "openstreetmap");
  assert.equal(node.sourceRecordKey, "node/101");
  assert.equal(node.externalUrl, "https://www.openstreetmap.org/node/101");
  assert.equal(node.sourceLicense, OSM_SOURCE_LICENSE);
  assert.equal(node.attribution, OSM_ATTRIBUTION);
  assert.equal(node.name, "Residencial Ejemplo");
  assert.equal(node.operator, "Operador Ejemplo");
  assert.equal(node.address, "Calle Uno 123");
  assert.equal(node.locality, "Montevideo");
  assert.equal(node.department, "Montevideo");
  assert.equal(node.phone, "+598 2000 0000");
  assert.equal(node.website, "https://example.test/residencial");
  assert.equal(node.latitude, -34.901);
  assert.equal(node.longitude, -56.164);
  assert.equal(node.originalTags.social_facility, "nursing_home");
});

test("usa el centro de una vía", () => {
  const candidates = normalizeOverpassPayload(fixture, retrievedAt);
  const way = candidates.find((candidate) => candidate.externalId === "way/202");
  assert.equal(way.address, "Ruta 5 km 40");
  assert.equal(way.locality, "Canelones");
  assert.equal(way.department, "Canelones");
  assert.equal(way.latitude, -34.72);
  assert.equal(way.longitude, -56.22);
  assert.equal(way.phone, "4332 0000");
  assert.equal(way.website, null);
});

test("normaliza una relación con etiquetado legado", () => {
  const candidates = normalizeOverpassPayload(fixture, retrievedAt);
  const relation = candidates.find(
    (candidate) => candidate.externalId === "relation/303",
  );
  assert.equal(relation.name, "Hogar Histórico");
  assert.equal(relation.address, "Barrio Centro 45");
  assert.equal(relation.department, "Paysandú");
  assert.equal(relation.originalTags.amenity, "retirement_home");
  assert.equal(relation.latitude, -32.31);
  assert.equal(relation.longitude, -58.08);
});

test("conserva un registro incompleto sin inventar datos", () => {
  const candidates = normalizeOverpassPayload(fixture, retrievedAt);
  const incomplete = candidates.find(
    (candidate) => candidate.externalId === "node/404",
  );
  assert.equal(incomplete.name, null);
  assert.equal(incomplete.operator, null);
  assert.equal(incomplete.address, null);
  assert.equal(incomplete.locality, null);
  assert.equal(incomplete.department, null);
  assert.equal(incomplete.phone, null);
  assert.equal(incomplete.website, null);
  assert.equal(incomplete.latitude, null);
  assert.equal(incomplete.longitude, null);
  assert.deepEqual(incomplete.originalTags, { amenity: "care_home" });
});

test("reintenta HTTP 429 con backoff sin contactar Overpass", async () => {
  const responses = [
    {
      ok: false,
      status: 429,
      headers: { get: () => null },
      text: async () => "rate limited",
    },
    {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(fixture),
    },
  ];
  const delays = [];
  const requests = [];
  const payload = await requestOverpass({
    endpoint: "https://overpass.example.test/api/interpreter",
    query: buildOverpassQuery(),
    retries: 1,
    backoffMs: 100,
    fetchImpl: async (url, init) => {
      requests.push({ url: url.toString(), init });
      return responses.shift();
    },
    sleepImpl: async (delay) => delays.push(delay),
  });
  assert.equal(payload.elements.length, 4);
  assert.deepEqual(delays, [100]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].init.headers["User-Agent"], DEFAULT_PROJECT_USER_AGENT);
  assert.equal(requests[0].init.method, "POST");
  assert.ok(requests[0].init.signal instanceof AbortSignal);
});

test("el documento de caché declara que no publica residenciales", () => {
  const query = buildOverpassQuery();
  const candidates = normalizeOverpassPayload(fixture, retrievedAt);
  const cache = buildCacheDocument({
    endpoint: "https://overpass.example.test/api/interpreter",
    query,
    userAgent: "Arandu-test",
    retrievedAt,
    candidates,
  });
  assert.equal(cache.metadata.attribution, OSM_ATTRIBUTION);
  assert.equal(cache.metadata.candidateOnly, true);
  assert.equal(cache.metadata.writesPublicResidenciales, false);
  assert.equal(cache.metadata.candidateCount, 4);
  assert.match(cache.metadata.querySha256, /^[a-f0-9]{64}$/);
});
