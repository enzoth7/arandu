import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

const MSP_URL = "https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-06/ELEPEM%20HABILITADOS%20JUNIO%202026.pdf";
const MIDES_URL = "https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social";
const SITUATIONS = new Set(["puerta", "calle", "referencial"]);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Argumento inesperado: ${value}`);
    const [key, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) args[key] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) args[key] = argv[++index];
    else args[key] = true;
  }
  return args;
}

const text = (value, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const orderedStrings = (value, max = 1000) => Array.isArray(value)
  ? value.map((item) => text(item, max)).filter(Boolean)
  : [];
const strings = (value, max = 1000) => Array.isArray(value)
  ? [...new Set(value.map((item) => text(item, max)).filter(Boolean))]
  : [];

function safeExternalUrl(value, { google = false } = {}) {
  const candidate = text(value, 1000);
  if (!candidate) return "";
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`URL no permitida: ${candidate}`);
  const host = url.hostname.toLowerCase();
  if (host.endsWith("supabase.co")) throw new Error("Una URL interna de Supabase no puede ser fuente.");
  const isGoogleMap = /(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps")
    || host === "maps.app.goo.gl";
  if (isGoogleMap && !google) throw new Error("Google sÃ³lo se admite como place_id enlazado manualmente.");
  return url.toString();
}

function isoDate(value, label) {
  const candidate = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) throw new Error(`${label} debe usar YYYY-MM-DD.`);
  return candidate;
}

function isoTimestamp(value, label) {
  const candidate = text(value, 60);
  const date = new Date(candidate);
  if (!candidate || Number.isNaN(date.valueOf())) throw new Error(`${label} no es una fecha vÃ¡lida.`);
  return date.toISOString();
}

function normalizeSources(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) {
    throw new Error("Cada fila necesita entre 1 y 200 fuentes.");
  }
  return value.map((source, index) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error(`Fuente ${index + 1} invÃ¡lida.`);
    }
    const reference = text(source.referencia, 300);
    const type = text(source.tipo, 80);
    const provider = text(source.proveedor, 200);
    const consultedAt = isoTimestamp(source.consultadaAt, `fuentes[${index}].consultadaAt`);
    if (!reference || !type || !provider) throw new Error(`Fuente ${index + 1} incompleta.`);
    return {
      reference,
      url: source.url ? safeExternalUrl(source.url) : "",
      type,
      provider,
      sourceDate: source.fecha ? isoDate(source.fecha, `fuentes[${index}].fecha`) : null,
      consultedAt,
      backedFields: strings(source.camposRespaldados, 80).join(",") || "procedencia",
    };
  });
}

function normalizeFacility(input, index) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`Fila ${index + 1} invÃ¡lida.`);
  const sources = normalizeSources(input.fuentes);
  const lat = input.lat === null || input.lat === undefined || input.lat === "" ? null : Number(input.lat);
  const lng = input.lng === null || input.lng === undefined || input.lng === "" ? null : Number(input.lng);
  if ((lat === null) !== (lng === null)) throw new Error(`Fila ${index + 1}: lat y lng deben venir juntas.`);
  const mapped = lat !== null && lng !== null;
  if (mapped && (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -35.2 || lat > -30 || lng < -58.6 || lng > -53)) {
    throw new Error(`Fila ${index + 1}: coordenadas fuera de Uruguay.`);
  }
  const precision = mapped ? text(input.precisionUbicacion, 30) : null;
  if (mapped && !SITUATIONS.has(precision)) throw new Error(`Fila ${index + 1}: precisiÃ³n invÃ¡lida.`);

  const msp = input.mspHabilitado === true;
  const mides = input.midesCertificado === true;
  const price = input.precioMensualUyu === null || input.precioMensualUyu === undefined
    ? null
    : Number(input.precioMensualUyu);
  const priceIsDemo = price !== null && input.precioEsDemo === true;
  if (price !== null && (!Number.isInteger(price) || price < 10000 || price > 10000000)) {
    throw new Error(`Fila ${index + 1}: precio invÃ¡lido.`);
  }
  if (price !== null && !priceIsDemo && !input.precioFuenteUrl) {
    throw new Error(`Fila ${index + 1}: un precio real requiere URL de fuente.`);
  }

  const googlePlaceId = text(input.googlePlaceId, 300) || null;
  const googleMapsUrl = input.googleMapsUrl ? safeExternalUrl(input.googleMapsUrl, { google: true }) : null;
  const googleVerifiedAt = input.googleVerificadoAt ? isoTimestamp(input.googleVerificadoAt, "googleVerificadoAt") : null;
  const googleVerifiedBy = text(input.googleVerificadoPor, 200) || null;
  if ([googlePlaceId, googleMapsUrl, googleVerifiedAt, googleVerifiedBy].filter(Boolean).length % 4 !== 0) {
    throw new Error(`Fila ${index + 1}: el vÃ­nculo manual de Google debe estar completo.`);
  }

  const row = {
    codigo: text(input.codigo, 240),
    legacy_id: text(input.legacyId, 240) || null,
    nombre: text(input.nombre, 300),
    nombres_alternativos: strings(input.nombresAlternativos, 300),
    departamento: text(input.departamento, 100),
    localidad: text(input.localidad, 160) || "Sin localidad informada",
    direccion: text(input.direccion, 500) || "DirecciÃ³n pendiente de confirmaciÃ³n",
    telefonos: strings(input.telefonos, 500),
    emails: strings(input.emails, 500),
    sitios_web: strings(input.sitiosWeb).map((url) => safeExternalUrl(url)),
    instagram_urls: strings(input.instagramUrls).map((url) => safeExternalUrl(url)),
    facebook_urls: strings(input.facebookUrls).map((url) => safeExternalUrl(url)),
    otras_redes_urls: strings(input.otrasRedesUrls).map((url) => safeExternalUrl(url)),
    operadores_nombres: orderedStrings(input.operadoresNombres, 300),
    operadores_tipos: orderedStrings(input.operadoresTipos, 80),
    precio_mensual_uyu: price,
    precio_fecha: price === null ? null : isoDate(input.precioFecha, "precioFecha"),
    precio_incluye: strings(input.precioIncluye, 300),
    precio_fuente_url: price !== null && !priceIsDemo ? safeExternalUrl(input.precioFuenteUrl) : null,
    precio_es_demo: priceIsDemo,
    msp_habilitado: msp,
    msp_fuente_url: msp ? safeExternalUrl(input.mspFuenteUrl || MSP_URL) : null,
    msp_fecha: msp ? isoDate(input.mspFecha || "2026-06-30", "mspFecha") : null,
    mides_certificado: mides,
    mides_fuente_url: mides ? safeExternalUrl(input.midesFuenteUrl || MIDES_URL) : null,
    mides_fecha: mides ? isoDate(input.midesFecha || "2026-01-31", "midesFecha") : null,
    descripcion: text(input.descripcion, 2000) || null,
    imagen_url: text(input.imagenUrl, 1000) || null,
    imagen_alt: text(input.imagenAlt, 300) || null,
    google_place_id: googlePlaceId,
    google_maps_url: googleMapsUrl,
    google_verificado_at: googleVerifiedAt,
    google_verificado_por: googleVerifiedBy,
    osm_ids: orderedStrings(input.osmIds, 300),
    osm_urls: orderedStrings(input.osmUrls).map((url) => safeExternalUrl(url)),
    otros_ids_proveedores: orderedStrings(input.otrosIdsProveedores, 80),
    otros_ids: orderedStrings(input.otrosIds, 300),
    otros_ids_urls: orderedStrings(input.otrosIdsUrls).map((url) => safeExternalUrl(url)),
    fuentes_referencias: sources.map((source) => source.reference),
    fuentes_urls: sources.map((source) => source.url),
    fuentes_tipos: sources.map((source) => source.type),
    fuentes_proveedores: sources.map((source) => source.provider),
    fuentes_fechas: sources.map((source) => source.sourceDate),
    fuentes_consultadas_at: sources.map((source) => source.consultedAt),
    fuentes_campos_respaldados: sources.map((source) => source.backedFields),
  };
  if (!row.codigo || !row.nombre || !row.departamento) throw new Error(`Fila ${index + 1}: faltan identidad o departamento.`);
  if (row.operadores_nombres.length !== row.operadores_tipos.length) throw new Error(`Fila ${index + 1}: operadores desalineados.`);
  if (row.osm_ids.length !== row.osm_urls.length) throw new Error(`Fila ${index + 1}: ids OSM desalineados.`);
  if (row.otros_ids.length !== row.otros_ids_urls.length || row.otros_ids.length !== row.otros_ids_proveedores.length) {
    throw new Error(`Fila ${index + 1}: otros identificadores desalineados.`);
  }
  return {
    table: mapped ? "elepem" : "elepem_sin_ubicacion",
    row: mapped ? {
      ...row,
      lat,
      lng,
      precision_ubicacion: precision,
      precision_etiqueta: text(input.precisionEtiqueta, 160) || "UbicaciÃ³n revisada manualmente",
    } : row,
  };
}

function databaseConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef || !process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta la configuraciÃ³n de Supabase.");
  return {
    projectRef,
    connection: {
      host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: process.env.SUPABASE_DB_NAME || "postgres",
      user: process.env.SUPABASE_DB_USER || "postgres",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: process.env.SUPABASE_DB_SSL_MODE === "disable" ? false : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
      application_name: "arandu-flat-elepem-file-import",
      connectionTimeoutMillis: 20_000,
    },
  };
}

async function insertRow(client, table, row) {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  await client.query(
    `insert into public.${table} (${columns.join(", ")}) values (${placeholders.join(", ")})`,
    columns.map((column) => row[column]),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error("Use --input <archivo.json>.");
  const inputPath = resolve(String(args.input));
  const payloadText = await readFile(inputPath, "utf8");
  const payload = JSON.parse(payloadText);
  if (payload.formatVersion !== 1 || !Array.isArray(payload.facilities) || payload.facilities.length === 0) {
    throw new Error("El archivo no cumple el formato de importaciÃ³n ELEPEM v1.");
  }
  const approvedBy = text(args["approved-by"], 200);
  const apply = args.apply === true;
  if (apply && (!approvedBy || payload.approvedBy !== approvedBy)) {
    throw new Error("--apply requiere --approved-by y debe coincidir con approvedBy dentro del archivo.");
  }
  const normalized = payload.facilities.map(normalizeFacility);
  const duplicateCodes = normalized.map((item) => item.row.codigo)
    .filter((code, index, all) => all.indexOf(code) !== index);
  if (duplicateCodes.length) throw new Error(`CÃ³digos repetidos en el archivo: ${[...new Set(duplicateCodes)].join(", ")}`);

  const { projectRef, connection } = databaseConfig();
  if (apply && args["acknowledge-project"] !== projectRef) {
    throw new Error("--acknowledge-project debe coincidir exactamente con SUPABASE_PROJECT_REF.");
  }
  const client = new pg.Client(connection);
  await client.connect();
  try {
    await client.query(apply ? "begin isolation level serializable" : "begin read only");
    await client.query("set local statement_timeout='30s'");
    await client.query("set local lock_timeout='5s'");
    if (apply) await client.query("select pg_advisory_xact_lock(hashtextextended('arandu:elepem-flat-import', 0))");

    const codes = normalized.map((item) => item.row.codigo);
    const conflicts = (await client.query(`
      select codigo, 'elepem' as relation from public.elepem where codigo = any($1::text[])
      union all
      select codigo, 'elepem_sin_ubicacion' from public.elepem_sin_ubicacion where codigo = any($1::text[])
    `, [codes])).rows;
    if (conflicts.length) throw new Error(`El archivo contiene cÃ³digos existentes: ${conflicts.map((item) => item.codigo).join(", ")}`);

    if (apply) {
      for (const item of normalized) await insertRow(client, item.table, item.row);
      await client.query(`insert into elepem_core.audit_log (
        entity_type, entity_key, action, actor_identifier, after_state, request_id
      ) values (
        'registry_import', $1, 'import_operator_approved_file', $2,
        jsonb_build_object('mapped', $3::integer, 'unlocated', $4::integer, 'automatic_publication', false), $5
      )`, [
        createHash("sha256").update(payloadText).digest("hex"),
        approvedBy,
        normalized.filter((item) => item.table === "elepem").length,
        normalized.filter((item) => item.table === "elepem_sin_ubicacion").length,
        `flat-import:${new Date().toISOString()}`,
      ]);
      await client.query("commit");
    } else {
      await client.query("rollback");
    }
    console.log(JSON.stringify({
      dryRun: !apply,
      projectRef,
      inputSha256: createHash("sha256").update(payloadText).digest("hex"),
      mapped: normalized.filter((item) => item.table === "elepem").length,
      unlocated: normalized.filter((item) => item.table === "elepem_sin_ubicacion").length,
      automaticPublication: false,
    }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { MIDES_URL, MSP_URL, normalizeFacility, normalizeSources, parseArgs, safeExternalUrl };
