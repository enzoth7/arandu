import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const OPERATION_ID = "merge-user-confirmed-duplicates-2026-08-17";
const APPLY_FLAG = `--confirm-merge=${OPERATION_ID}`;
const root = process.cwd();
const backupDirectory = path.join(root, "data", "discovery", "backups");
const backupPath = path.join(backupDirectory, `${OPERATION_ID}_before.json`);
const dryRunPath = path.join(root, "data", "discovery", `${OPERATION_ID}_dry_run.json`);
const resultPath = path.join(root, "data", "discovery", `${OPERATION_ID}_result.json`);
const applying = process.argv.includes(APPLY_FLAG);

const requestedMerges = [
  {
    targetName: "Hogar de Ancianos de la Sociedad de Auxilio Frauenverein",
    sourceName: "Hogar de Ancianos de Nueva Helvecia",
    finalName: "Hogar de Ancianos de la Sociedad de Auxilio Frauenverein",
  },
  {
    targetName: "Hogar Montpellier",
    sourceName: "Montpellier",
    finalName: "Hogar Montpellier",
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

function mergeSources(rows) {
  const seen = new Set();
  const sources = [];
  for (const row of rows) {
    for (let index = 0; index < (row.fuentes_referencias || []).length; index += 1) {
      const source = {
        reference: row.fuentes_referencias[index] || "",
        url: row.fuentes_urls?.[index] || "",
        type: row.fuentes_tipos?.[index] || "official",
        provider: row.fuentes_proveedores?.[index] || "",
        date: row.fuentes_fechas?.[index] || null,
        consultedAt: row.fuentes_consultadas_at?.[index] || null,
        backedFields: row.fuentes_campos_respaldados?.[index] || "",
      };
      const key = `${normalized(source.reference)}|${normalized(source.url)}`;
      if (!source.reference || seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  return {
    referencias: sources.map((source) => source.reference),
    urls: sources.map((source) => source.url),
    tipos: sources.map((source) => source.type),
    proveedores: sources.map((source) => source.provider),
    fechas: sources.map((source) => source.date),
    consultadasAt: sources.map((source) => source.consultedAt),
    campos: sources.map((source) => source.backedFields),
  };
}

function locationScore(row) {
  const scores = { puerta: 4, calle: 3, aproximada: 2, referencial: 1 };
  return scores[row.precision_ubicacion] || 0;
}

function preferredLocation(rows) {
  return rows.reduce((best, row) => {
    if (!best || locationScore(row) > locationScore(best)) return row;
    return best;
  }, null);
}

function consolidatedValues(rows, finalName) {
  const [target] = rows;
  const sources = mergeSources(rows);
  if (new Set(Object.values(sources).map((items) => items.length)).size !== 1) {
    throw new Error(`Las matrices de fuentes de ${finalName} no quedaron alineadas.`);
  }
  const mspSource = rows.find((row) => row.msp_habilitado);
  const midesSource = rows.find((row) => row.mides_certificado);
  const location = preferredLocation(rows);
  const msp = Boolean(mspSource);
  const mides = Boolean(midesSource);
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
    msp,
    mides,
    mspSourceUrl: mspSource?.msp_fuente_url || null,
    mspDate: mspSource?.msp_fecha || null,
    midesSourceUrl: midesSource?.mides_fuente_url || null,
    midesDate: midesSource?.mides_fecha || null,
    situation: msp ? "habilitacion_msp" : mides ? "certificado_social_mides" : "situacion_no_confirmada",
    description: target.descripcion || rows.find((row) => row.descripcion)?.descripcion || null,
    imageUrl: target.imagen_url || rows.find((row) => row.imagen_url)?.imagen_url || null,
    imageAlt: target.imagen_alt || rows.find((row) => row.imagen_alt)?.imagen_alt || null,
    sources,
  };
}

function publicRow(row) {
  return {
    id: row.id_num,
    codigo: row.codigo,
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
  const beforeCount = Number((await client.query("select count(*)::int as count from public.elepem")).rows[0].count);
  const names = requestedMerges.flatMap((merge) => [merge.targetName, merge.sourceName]);
  const selected = (await client.query(
    "select *, id::int as id_num from public.elepem where nombre = any($1::text[]) order by id for share",
    [names],
  )).rows;
  if (selected.length !== names.length) {
    throw new Error(`Se esperaban ${names.length} filas con nombres exactos y se encontraron ${selected.length}.`);
  }
  for (const name of names) {
    if (selected.filter((row) => row.nombre === name).length !== 1) {
      throw new Error(`El nombre ${name} no identifica exactamente una fila.`);
    }
  }

  const merges = requestedMerges.map((merge) => {
    const target = selected.find((row) => row.nombre === merge.targetName);
    const source = selected.find((row) => row.nombre === merge.sourceName);
    return { ...merge, targetId: target.id_num, sourceId: source.id_num, rows: [target, source] };
  });
  const sourceIds = merges.map((merge) => merge.sourceId);
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

  const prepared = merges.map((merge) => ({
    ...merge,
    values: consolidatedValues(merge.rows, merge.finalName),
  }));
  const audit = {
    operation_id: OPERATION_ID,
    generated_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    apply_requested: applying,
    before_count: beforeCount,
    expected_after_count: beforeCount - sourceIds.length,
    relation_counts_for_sources: relationCounts,
    merges: prepared.map((merge) => ({
      target: publicRow(merge.rows[0]),
      source: publicRow(merge.rows[1]),
      final_name: merge.values.finalName,
      alternative_names: merge.values.alternativeNames,
      final_location: publicRow(merge.values.location),
      final_status: merge.values.situation,
      source_count: merge.values.sources.referencias.length,
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
      await client.query("set local statement_timeout = '15s'");
      await client.query("set local lock_timeout = '5s'");
      const locked = (await client.query(
        "select id::int as id from public.elepem where id = any($1::bigint[]) order by id for update",
        [prepared.flatMap((merge) => [merge.targetId, merge.sourceId])],
      )).rows;
      if (locked.length !== names.length) throw new Error("Las filas cambiaron antes de obtener el bloqueo.");

      for (const merge of prepared) {
        const value = merge.values;
        await client.query(`
          update public.elepem set
            nombre = $2,
            direccion = $3,
            lat = $4,
            lng = $5,
            precision_ubicacion = $6,
            precision_etiqueta = $7,
            nombres_alternativos = $8::text[],
            telefonos = $9::text[],
            emails = $10::text[],
            sitios_web = $11::text[],
            instagram_urls = $12::text[],
            facebook_urls = $13::text[],
            msp_habilitado = $14,
            mides_certificado = $15,
            msp_fuente_url = $16,
            msp_fecha = $17,
            mides_fuente_url = $18,
            mides_fecha = $19,
            descripcion = $20,
            imagen_url = $21,
            imagen_alt = $22,
            fuentes_referencias = $23::text[],
            fuentes_urls = $24::text[],
            fuentes_tipos = $25::text[],
            fuentes_proveedores = $26::text[],
            fuentes_fechas = $27::date[],
            fuentes_consultadas_at = $28::timestamptz[],
            fuentes_campos_respaldados = $29::text[],
            updated_at = now()
          where id = $1
        `, [
          merge.targetId, value.finalName,
          value.location.direccion, value.location.lat, value.location.lng,
          value.location.precision_ubicacion, value.location.precision_etiqueta,
          value.alternativeNames, value.phones, value.emails, value.websites,
          value.instagramUrls, value.facebookUrls, value.msp, value.mides,
          value.mspSourceUrl, value.mspDate, value.midesSourceUrl, value.midesDate,
          value.description, value.imageUrl, value.imageAlt,
          value.sources.referencias, value.sources.urls, value.sources.tipos, value.sources.proveedores,
          value.sources.fechas, value.sources.consultadasAt, value.sources.campos,
        ]);
      }
      const deletion = await client.query(
        "delete from public.elepem where id = any($1::bigint[]) returning id::int as id",
        [sourceIds],
      );
      if (deletion.rowCount !== sourceIds.length) throw new Error("No se eliminaron exactamente las filas duplicadas.");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const afterCount = Number((await client.query("select count(*)::int as count from public.elepem")).rows[0].count);
    const finalRows = (await client.query(`
      select id::int as id, codigo, nombre, nombres_alternativos, departamento, localidad, direccion,
             cardinality(fuentes_referencias) as source_count
      from public.elepem where id = any($1::bigint[]) order by id
    `, [prepared.map((merge) => merge.targetId)])).rows;
    const remainingSources = Number((await client.query(
      "select count(*)::int as count from public.elepem where id = any($1::bigint[])",
      [sourceIds],
    )).rows[0].count);
    if (afterCount !== beforeCount - sourceIds.length || finalRows.length !== prepared.length || remainingSources !== 0) {
      throw new Error("La verificación posterior no coincide con el lote autorizado.");
    }
    const result = {
      ...audit,
      completed_at: new Date().toISOString(),
      applied: true,
      after_count: afterCount,
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
