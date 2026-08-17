import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const OPERATION_ID = "merge-user-confirmed-duplicates-2026-08-17-round-2";
const APPLY_FLAG = `--confirm-merge=${OPERATION_ID}`;
const root = process.cwd();
const backupDirectory = path.join(root, "data", "discovery", "backups");
const backupPath = path.join(backupDirectory, `${OPERATION_ID}_before.json`);
const dryRunPath = path.join(root, "data", "discovery", `${OPERATION_ID}_dry_run.json`);
const resultPath = path.join(root, "data", "discovery", `${OPERATION_ID}_result.json`);
const applying = process.argv.includes(APPLY_FLAG);

const requestedMerges = [
  {
    targetId: 648,
    sourceId: 832,
    targetName: "Las Cuatro Estaciones",
    sourceName: "Cuatro Estaciones",
    finalName: "Las Cuatro Estaciones",
  },
  {
    targetId: 735,
    sourceId: 73,
    targetName: "Residencial Primavera",
    sourceName: "Primavera",
    finalName: "Residencial Primavera",
  },
  {
    targetId: 654,
    sourceId: 844,
    targetName: "Piebu",
    sourceName: "Hogar de Ancianos Piebu",
    finalName: "Piebu",
  },
  {
    targetId: 682,
    sourceId: 862,
    targetName: "Marías Belen",
    sourceName: "María Belën",
    finalName: "María Belén",
  },
  {
    targetId: 761,
    sourceId: 891,
    targetName: "Hogar Enrique Chaplín",
    sourceName: "Hogar Ancianos Enrique Chaplin",
    finalName: "Hogar Enrique Chaplín",
  },
];

if (process.env.SUPABASE_PROJECT_REF !== PROJECT_REF) {
  throw new Error(`SUPABASE_PROJECT_REF no coincide con ${PROJECT_REF}.`);
}

const host = process.env.SUPABASE_DB_HOST || `db.${PROJECT_REF}.supabase.co`;
const client = new Client({
  host,
  port: host.endsWith(".pooler.supabase.com") ? 6543 : Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
  application_name: OPERATION_ID,
});

const normalized = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es-UY");

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const item of values.flat()) {
    if (typeof item !== "string" || !item.trim()) continue;
    const key = normalized(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item.trim());
  }
  return result;
}

function mergeAligned(rows, definitions) {
  const seen = new Set();
  const merged = [];
  for (const row of rows) {
    const length = (row[definitions[0].column] || []).length;
    for (const definition of definitions) {
      if ((row[definition.column] || []).length !== length) {
        throw new Error(`Las matrices ${definitions.map((item) => item.column).join(", ")} no están alineadas en ${row.nombre}.`);
      }
    }
    for (let index = 0; index < length; index += 1) {
      const item = Object.fromEntries(definitions.map(({ key, column, fallback = null }) => [
        key,
        row[column]?.[index] ?? fallback,
      ]));
      const identity = definitions.map(({ key }) => normalized(item[key])).join("|");
      if (!identity.replaceAll("|", "") || seen.has(identity)) continue;
      seen.add(identity);
      merged.push(item);
    }
  }
  return Object.fromEntries(definitions.map(({ key }) => [key, merged.map((item) => item[key])]));
}

function locationScore(row) {
  return ({ puerta: 4, calle: 3, aproximada: 2, referencial: 1 })[row.precision_ubicacion] || 0;
}

function preferredLocation(rows) {
  return rows.reduce((best, row) => (!best || locationScore(row) > locationScore(best) ? row : best), null);
}

function preferredCompleteGroup(rows, columns) {
  return rows.find((row) => columns.every((column) => row[column] !== null && row[column] !== undefined)) || null;
}

function preferredPrice(rows) {
  return rows.find((row) => row.precio_mensual_uyu !== null) || null;
}

function consolidatedValues(rows, finalName) {
  const [target] = rows;
  const location = preferredLocation(rows);
  const mspSource = rows.find((row) => row.msp_habilitado);
  const midesSource = rows.find((row) => row.mides_certificado);
  const priceSource = preferredPrice(rows);
  const googleSource = preferredCompleteGroup(rows, [
    "google_place_id", "google_maps_url", "google_verificado_at", "google_verificado_por",
  ]);
  const operators = mergeAligned(rows, [
    { key: "names", column: "operadores_nombres", fallback: "" },
    { key: "types", column: "operadores_tipos", fallback: "" },
  ]);
  const osm = mergeAligned(rows, [
    { key: "ids", column: "osm_ids", fallback: "" },
    { key: "urls", column: "osm_urls", fallback: "" },
  ]);
  const otherIds = mergeAligned(rows, [
    { key: "providers", column: "otros_ids_proveedores", fallback: "" },
    { key: "ids", column: "otros_ids", fallback: "" },
    { key: "urls", column: "otros_ids_urls", fallback: "" },
  ]);
  const sources = mergeAligned(rows, [
    { key: "references", column: "fuentes_referencias", fallback: "" },
    { key: "urls", column: "fuentes_urls", fallback: "" },
    { key: "types", column: "fuentes_tipos", fallback: "official" },
    { key: "providers", column: "fuentes_proveedores", fallback: "" },
    { key: "dates", column: "fuentes_fechas" },
    { key: "consultedAt", column: "fuentes_consultadas_at" },
    { key: "backedFields", column: "fuentes_campos_respaldados", fallback: "" },
  ]);

  return {
    finalName,
    location,
    alternativeNames: uniqueStrings([
      rows.flatMap((row) => row.nombres_alternativos || []),
      rows.map((row) => row.nombre),
    ]).filter((name) => normalized(name) !== normalized(finalName)),
    phones: uniqueStrings(rows.map((row) => row.telefonos || [])),
    emails: uniqueStrings(rows.map((row) => row.emails || [])),
    websites: uniqueStrings(rows.map((row) => row.sitios_web || [])),
    instagramUrls: uniqueStrings(rows.map((row) => row.instagram_urls || [])),
    facebookUrls: uniqueStrings(rows.map((row) => row.facebook_urls || [])),
    otherSocialUrls: uniqueStrings(rows.map((row) => row.otras_redes_urls || [])),
    operators,
    price: priceSource ? {
      value: priceSource.precio_mensual_uyu,
      date: priceSource.precio_fecha,
      includes: uniqueStrings(rows.map((row) => row.precio_incluye || [])),
      sourceUrl: priceSource.precio_fuente_url,
      isDemo: priceSource.precio_es_demo,
    } : { value: null, date: null, includes: [], sourceUrl: null, isDemo: false },
    msp: Boolean(mspSource),
    mspSourceUrl: mspSource?.msp_fuente_url || null,
    mspDate: mspSource?.msp_fecha || null,
    mides: Boolean(midesSource),
    midesSourceUrl: midesSource?.mides_fuente_url || null,
    midesDate: midesSource?.mides_fecha || null,
    description: target.descripcion || rows.find((row) => row.descripcion)?.descripcion || null,
    imageUrl: target.imagen_url || rows.find((row) => row.imagen_url)?.imagen_url || null,
    imageAlt: target.imagen_alt || rows.find((row) => row.imagen_alt)?.imagen_alt || null,
    google: googleSource ? {
      placeId: googleSource.google_place_id,
      mapsUrl: googleSource.google_maps_url,
      verifiedAt: googleSource.google_verificado_at,
      verifiedBy: googleSource.google_verificado_por,
    } : { placeId: null, mapsUrl: null, verifiedAt: null, verifiedBy: null },
    osm,
    otherIds,
    sources,
  };
}

function publicRow(row) {
  return {
    id: row.id_num,
    codigo: row.codigo,
    legacy_id: row.legacy_id,
    nombre: row.nombre,
    nombres_alternativos: row.nombres_alternativos,
    departamento: row.departamento,
    localidad: row.localidad,
    direccion: row.direccion,
    lat: row.lat,
    lng: row.lng,
    precision_ubicacion: row.precision_ubicacion,
    source_count: row.fuentes_referencias?.length || 0,
    msp_habilitado: row.msp_habilitado,
    mides_certificado: row.mides_certificado,
  };
}

await client.connect();
try {
  const beforeCounts = (await client.query(`
    select (select count(*)::int from public.elepem) as elepem,
           (select count(*)::int from public.elepem_sin_ubicacion) as elepem_sin_ubicacion
  `)).rows[0];
  const selectedIds = requestedMerges.flatMap((merge) => [merge.targetId, merge.sourceId]);
  const selected = (await client.query(
    "select *, id::int as id_num from public.elepem where id = any($1::bigint[]) order by id for share",
    [selectedIds],
  )).rows;
  if (selected.length !== selectedIds.length) {
    throw new Error(`Se esperaban ${selectedIds.length} filas y se encontraron ${selected.length}.`);
  }
  for (const merge of requestedMerges) {
    const target = selected.find((row) => row.id_num === merge.targetId);
    const source = selected.find((row) => row.id_num === merge.sourceId);
    if (target?.nombre !== merge.targetName || source?.nombre !== merge.sourceName) {
      throw new Error(`Las filas ${merge.targetId}/${merge.sourceId} cambiaron desde la auditoría.`);
    }
  }

  const requestedNames = requestedMerges.flatMap((merge) => [merge.targetName, merge.sourceName]);
  const unlocatedMatches = (await client.query(`
    select id::int, codigo, nombre
      from public.elepem_sin_ubicacion
     where nombre = any($1::text[])
        or exists (
          select 1 from unnest(nombres_alternativos) as alternative_name
           where alternative_name = any($1::text[])
        )
  `, [requestedNames])).rows;
  if (unlocatedMatches.length !== 0) {
    throw new Error("También hay coincidencias en public.elepem_sin_ubicacion; se requiere revisar el lote.");
  }

  const prepared = requestedMerges.map((merge) => {
    const target = selected.find((row) => row.id_num === merge.targetId);
    const source = selected.find((row) => row.id_num === merge.sourceId);
    return { ...merge, rows: [target, source], values: consolidatedValues([target, source], merge.finalName) };
  });
  const sourceIds = prepared.map((merge) => merge.sourceId);
  const relationCounts = (await client.query(`
    select 'public.facility_change_publications' as relation, count(*)::int as count
      from public.facility_change_publications where facility_id = any($1::bigint[])
    union all
    select 'public.intake_reports', count(*)::int
      from public.intake_reports where facility_id = any($1::bigint[])
    union all
    select 'public.facility_document_status_reviews', count(*)::int
      from public.facility_document_status_reviews where facility_id = any($1::bigint[])
    union all
    select 'elepem_core.facility_experience_publications', count(*)::int
      from elepem_core.facility_experience_publications where facility_id = any($1::bigint[])
  `, [sourceIds])).rows;
  if (relationCounts.some((row) => row.count !== 0)) {
    throw new Error("Hay relaciones activas en una fila a eliminar; se detiene para no perder expedientes.");
  }

  const audit = {
    operation_id: OPERATION_ID,
    generated_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    apply_requested: applying,
    before_counts: beforeCounts,
    expected_after_counts: {
      elepem: beforeCounts.elepem - sourceIds.length,
      elepem_sin_ubicacion: beforeCounts.elepem_sin_ubicacion,
    },
    relation_counts_for_sources: relationCounts,
    unlocated_matches: unlocatedMatches,
    merges: prepared.map((merge) => ({
      target: publicRow(merge.rows[0]),
      source: publicRow(merge.rows[1]),
      final_name: merge.values.finalName,
      alternative_names: merge.values.alternativeNames,
      final_location: publicRow(merge.values.location),
      final_status: merge.values.msp
        ? "habilitacion_msp"
        : merge.values.mides ? "certificado_social_mides" : "situacion_no_confirmada",
      source_count: merge.values.sources.references.length,
      phone_count: merge.values.phones.length,
      email_count: merge.values.emails.length,
    })),
  };
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, `${JSON.stringify({ ...audit, rows: selected }, null, 2)}\n`, "utf8");
  await writeFile(dryRunPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  if (!applying) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    await client.query("begin");
    try {
      await client.query("set local statement_timeout = '20s'");
      await client.query("set local lock_timeout = '5s'");
      const locked = (await client.query(
        "select id::int from public.elepem where id = any($1::bigint[]) order by id for update",
        [selectedIds],
      )).rows;
      if (locked.length !== selectedIds.length) throw new Error("Las filas cambiaron antes de obtener el bloqueo.");

      for (const merge of prepared) {
        const value = merge.values;
        await client.query(`
          update public.elepem set
            nombre = $2,
            nombres_alternativos = $3::text[],
            departamento = $4,
            localidad = $5,
            direccion = $6,
            lat = $7,
            lng = $8,
            precision_ubicacion = $9,
            precision_etiqueta = $10,
            telefonos = $11::text[],
            emails = $12::text[],
            sitios_web = $13::text[],
            instagram_urls = $14::text[],
            facebook_urls = $15::text[],
            otras_redes_urls = $16::text[],
            operadores_nombres = $17::text[],
            operadores_tipos = $18::text[],
            precio_mensual_uyu = $19,
            precio_fecha = $20,
            precio_incluye = $21::text[],
            precio_fuente_url = $22,
            precio_es_demo = $23,
            msp_habilitado = $24,
            msp_fuente_url = $25,
            msp_fecha = $26,
            mides_certificado = $27,
            mides_fuente_url = $28,
            mides_fecha = $29,
            descripcion = $30,
            imagen_url = $31,
            imagen_alt = $32,
            google_place_id = $33,
            google_maps_url = $34,
            google_verificado_at = $35,
            google_verificado_por = $36,
            osm_ids = $37::text[],
            osm_urls = $38::text[],
            otros_ids_proveedores = $39::text[],
            otros_ids = $40::text[],
            otros_ids_urls = $41::text[],
            fuentes_referencias = $42::text[],
            fuentes_urls = $43::text[],
            fuentes_tipos = $44::text[],
            fuentes_proveedores = $45::text[],
            fuentes_fechas = $46::date[],
            fuentes_consultadas_at = $47::timestamptz[],
            fuentes_campos_respaldados = $48::text[],
            updated_at = now()
          where id = $1
        `, [
          merge.targetId, value.finalName, value.alternativeNames,
          value.location.departamento, value.location.localidad, value.location.direccion,
          value.location.lat, value.location.lng, value.location.precision_ubicacion,
          value.location.precision_etiqueta,
          value.phones, value.emails, value.websites, value.instagramUrls,
          value.facebookUrls, value.otherSocialUrls,
          value.operators.names, value.operators.types,
          value.price.value, value.price.date, value.price.includes,
          value.price.sourceUrl, value.price.isDemo,
          value.msp, value.mspSourceUrl, value.mspDate,
          value.mides, value.midesSourceUrl, value.midesDate,
          value.description, value.imageUrl, value.imageAlt,
          value.google.placeId, value.google.mapsUrl, value.google.verifiedAt, value.google.verifiedBy,
          value.osm.ids, value.osm.urls,
          value.otherIds.providers, value.otherIds.ids, value.otherIds.urls,
          value.sources.references, value.sources.urls, value.sources.types, value.sources.providers,
          value.sources.dates, value.sources.consultedAt, value.sources.backedFields,
        ]);
      }

      const deletion = await client.query(
        "delete from public.elepem where id = any($1::bigint[]) returning id::int",
        [sourceIds],
      );
      if (deletion.rowCount !== sourceIds.length) throw new Error("No se eliminaron exactamente las filas duplicadas.");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const afterCounts = (await client.query(`
      select (select count(*)::int from public.elepem) as elepem,
             (select count(*)::int from public.elepem_sin_ubicacion) as elepem_sin_ubicacion
    `)).rows[0];
    const finalRows = (await client.query(`
      select id::int, codigo, nombre, nombres_alternativos, departamento, localidad, direccion,
             lat, lng, precision_ubicacion, situacion,
             cardinality(fuentes_referencias) as source_count,
             cardinality(telefonos) as phone_count,
             cardinality(emails) as email_count
        from public.elepem
       where id = any($1::bigint[])
       order by id
    `, [prepared.map((merge) => merge.targetId)])).rows;
    const remainingSources = Number((await client.query(
      "select count(*)::int as count from public.elepem where id = any($1::bigint[])",
      [sourceIds],
    )).rows[0].count);
    if (
      afterCounts.elepem !== audit.expected_after_counts.elepem
      || afterCounts.elepem_sin_ubicacion !== audit.expected_after_counts.elepem_sin_ubicacion
      || finalRows.length !== prepared.length
      || remainingSources !== 0
    ) {
      throw new Error("La verificación posterior no coincide con el lote autorizado.");
    }

    const result = {
      ...audit,
      completed_at: new Date().toISOString(),
      applied: true,
      after_counts: afterCounts,
      rows_removed: sourceIds.length,
      remaining_source_rows: remainingSources,
      final_rows: finalRows,
      backup: path.relative(root, backupPath).replaceAll(path.sep, "/"),
      dry_run: path.relative(root, dryRunPath).replaceAll(path.sep, "/"),
    };
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await client.end();
}
