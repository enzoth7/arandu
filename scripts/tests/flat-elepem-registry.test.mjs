import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runtimeElepemDataSource, publicFacilityRelation } from "../../lib/elepem-data-source.mjs";
import { normalizeFacility, safeExternalUrl } from "../import-flat-elepem.mjs";
import { assertMetrics } from "../verify-flat-elepem.mjs";

const migrationPath = new URL("../../supabase/migrations/20260813120000_flatten_elepem_registry.sql", import.meta.url);
const fictitiousPriceCleanupPath = new URL("../../supabase/migrations/20260814170000_remove_fictitious_prices.sql", import.meta.url);
const casaPrototypePricePath = new URL("../../supabase/migrations/20260814180000_restore_casa_costa_serena_prototype_price.sql", import.meta.url);
const filterAttributesPath = new URL("../../supabase/migrations/20260820202413_add_elepem_filter_attributes.sql", import.meta.url);
const cleanupPath = new URL("../../supabase/maintenance/20260813130000_drop_legacy_elepem_registry.sql", import.meta.url);
const registryPath = new URL("../../lib/facility-registry.ts", import.meta.url);

test("el runtime lee directamente public.elepem", async () => {
  assert.equal(runtimeElepemDataSource(), "flat");
  assert.equal(publicFacilityRelation(), "public.elepem");
  const source = await readFile(registryPath, "utf8");
  assert.match(source, /from public\.elepem as registry/i);
  assert.doesNotMatch(source, /arandu_facilities_registry|elepem_core\.facilities/);
});

test("la migración fija los conteos acordados y mantiene el borrado separado", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /exactly 1019 rows/i);
  assert.match(source, /exactly 83 rows/i);
  assert.match(source, /precio_es_demo\) <> 317/i);
  assert.match(source, /set local role service_role/i);
  assert.match(source, /grant select \(id\) on table arandu_demo\.facilities to service_role/i);
  assert.match(source, /DEMO-ELEPEM-001 already exists; refusing to overwrite/i);
  assert.doesNotMatch(source, /drop table public\.residenciales/i);
});

test("la limpieza posterior elimina precios ficticios sin tocar precios con fuente", async () => {
  const source = await readFile(fictitiousPriceCleanupPath, "utf8");
  assert.match(source, /where precio_es_demo/i);
  assert.match(source, /precio_mensual_uyu = null/i);
  assert.match(source, /precio_fuente_url = null/i);
  assert.match(source, /facility\.is_demo/i);
  assert.match(source, /No synthetic price is currently stored/i);
  assert.doesNotMatch(source, /where precio_mensual_uyu is not null;/i);
});

test("el prototipo restaura únicamente el precio aislado de Casa Costa Serena", async () => {
  const source = await readFile(casaPrototypePricePath, "utf8");
  assert.match(source, /id = 'DEMO-ELEPEM-001'/i);
  assert.match(source, /monthly_price_from_uyu = 78000/i);
  assert.match(source, /id <> 'DEMO-ELEPEM-001'[\s\S]*monthly_price_from_uyu is not null/i);
  assert.match(source, /precio_mensual_uyu is not null and precio_fuente_url is null/i);
  assert.doesNotMatch(source, /update public\.elepem\s+set/i);
});

test("los atributos filtrables quedan centrales y sólo el demo recibe valores iniciales", async () => {
  const migration = await readFile(filterAttributesPath, "utf8");
  const registry = await readFile(registryPath, "utf8");
  for (const column of [
    "modalidades_estadia",
    "habitacion_privacidad",
    "entorno",
    "accesibilidad_movilidad",
    "cuidados_profesionales",
    "vida_cotidiana_vinculos",
  ]) {
    assert.match(migration, new RegExp(`add column ${column} text\\[\\]`, "i"));
    assert.match(registry, new RegExp(`registry\\.${column}`, "i"));
  }
  assert.match(migration, /update arandu_demo\.facilities[\s\S]*DEMO-ELEPEM-001/i);
  assert.doesNotMatch(migration, /update public\.elepem\s+set/i);
  assert.match(migration, /array_position\(modalidades_estadia, null\) is null/i);
});

test("la limpieza exige archivo trazable y un punto de restauración completo", async () => {
  const source = await readFile(cleanupPath, "utf8");
  assert.match(source, /elepem_backup_manifest_sha256/);
  assert.match(source, /elepem_restore_point/);
  assert.match(source, /managed snapshot\/PITR/i);
});

test("la importación es plana y separa por coordenadas", () => {
  const base = {
    codigo: "TEST-001",
    nombre: "ELEPEM de prueba",
    departamento: "Montevideo",
    localidad: "Montevideo",
    direccion: "Prueba 123",
    mspHabilitado: false,
    midesCertificado: false,
    fuentes: [{
      referencia: "fixture:1",
      url: "https://example.org/source",
      tipo: "facility_website",
      proveedor: "Fixture",
      consultadaAt: "2026-08-13T12:00:00Z",
      camposRespaldados: ["nombre"],
    }],
  };
  assert.equal(normalizeFacility({ ...base, lat: -34.9, lng: -56.2, precisionUbicacion: "referencial" }, 0).table, "elepem");
  assert.equal(normalizeFacility(base, 0).table, "elepem_sin_ubicacion");
});

test("Google no entra como fuente genérica", () => {
  assert.throws(() => safeExternalUrl("https://www.google.com/maps/place/example"), /place_id/);
  assert.match(safeExternalUrl("https://www.google.com/maps/place/example", { google: true }), /^https:\/\/www\.google\.com\/maps/);
});

test("la verificación exige los KPI no excluyentes", () => {
  assert.doesNotThrow(() => assertMetrics({
    total: 1019,
    msp: 212,
    mides: 275,
    both: 170,
    mides_only: 105,
    unconfirmed: 702,
    demo_prices: 0,
    canelones: 117,
    unlocated: 83,
    unlocated_canelones: 39,
    unlocated_without_address: 26,
  }));
});
