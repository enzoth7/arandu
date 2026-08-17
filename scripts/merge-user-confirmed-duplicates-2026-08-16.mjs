import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const OPERATION_ID = "merge-user-confirmed-duplicates-2026-08-16";
const APPLY_FLAG = `--confirm-merge=${OPERATION_ID}`;
const root = process.cwd();
const backupPath = path.join(root, "data", "discovery", "backups", `${OPERATION_ID}_before.json`);
const dryRunPath = path.join(root, "data", "discovery", `${OPERATION_ID}_dry_run.json`);
const resultPath = path.join(root, "data", "discovery", `${OPERATION_ID}_result.json`);

const merges = [
  { targetId: 547, sourceIds: [548], finalName: "Don Joaquín", label: "Hogar Don Joaquín → Don Joaquín" },
  { targetId: 355, sourceIds: [1068], finalName: "Residencial Le Parc", label: "Le Parc → Residencial Le Parc" },
  {
    targetId: 758,
    sourceIds: [214, 814],
    finalName: "Residencial Centro de Cuidados Alamos",
    label: "Los Alamos (Maldonado) → Residencial Centro de Cuidados Alamos",
  },
];
const expectedRows = new Map([
  [214, "Residencial Centro de Cuidados Alamos"],
  [355, "Le Parc"],
  [547, "Don Joaquín"],
  [548, "Hogar Don Joaquín"],
  [758, "Los Alamos"],
  [814, "Los Alamos"],
  [1068, "Residencial Le Parc"],
]);
const selectedIds = [...expectedRows.keys()];
const sourceIds = merges.flatMap((merge) => merge.sourceIds);
const applying = process.argv.includes(APPLY_FLAG);

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
    const references = row.fuentes_referencias || [];
    for (let index = 0; index < references.length; index += 1) {
      const item = {
        reference: references[index] || "",
        url: row.fuentes_urls?.[index] || "",
        type: row.fuentes_tipos?.[index] || "official",
        provider: row.fuentes_proveedores?.[index] || "",
        date: row.fuentes_fechas?.[index] || null,
        consultedAt: row.fuentes_consultadas_at?.[index] || null,
        backedFields: row.fuentes_campos_respaldados?.[index] || "",
      };
      const key = `${normalized(item.reference)}|${normalized(item.url)}`;
      if (!item.reference || seen.has(key)) continue;
      seen.add(key);
      sources.push(item);
    }
  }
  return {
    referencias: sources.map((item) => item.reference),
    urls: sources.map((item) => item.url),
    tipos: sources.map((item) => item.type),
    proveedores: sources.map((item) => item.provider),
    fechas: sources.map((item) => item.date),
    consultadasAt: sources.map((item) => item.consultedAt),
    campos: sources.map((item) => item.backedFields),
  };
}

function consolidatedValues(rows, finalName) {
  const [target] = rows;
  const sources = mergeSources(rows);
  if (new Set(Object.values(sources).map((items) => items.length)).size !== 1) {
    throw new Error(`Las matrices de fuentes de ${finalName} no quedaron alineadas.`);
  }
  const alternativeNames = uniqueStrings([
    rows.flatMap((row) => row.nombres_alternativos || []),
    rows.map((row) => row.nombre),
  ]).filter((name) => normalized(name) !== normalized(finalName));
  const msp = rows.some((row) => row.msp_habilitado);
  const mides = rows.some((row) => row.mides_certificado);
  const mspSource = rows.find((row) => row.msp_habilitado);
  const midesSource = rows.find((row) => row.mides_certificado);
  return {
    finalName,
    alternativeNames,
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

await client.connect();
try {
  const beforeCount = Number((await client.query("select count(*)::int as count from public.elepem")).rows[0].count);
  const selected = (await client.query(
    "select *, id::int as id_num from public.elepem where id = any($1::bigint[]) order by id for share",
    [selectedIds],
  )).rows;
  if (selected.length !== selectedIds.length) throw new Error(`Se esperaban ${selectedIds.length} filas y hay ${selected.length}.`);
  for (const row of selected) {
    const expectedName = expectedRows.get(row.id_num);
    if (row.nombre !== expectedName) throw new Error(`La fila ${row.id_num} cambió de nombre: ${row.nombre}.`);
  }

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
    throw new Error("Aparecieron relaciones nuevas en filas fuente; se detiene para no fusionar expedientes sin revisión.");
  }

  const prepared = merges.map((merge) => {
    const rows = [merge.targetId, ...merge.sourceIds].map((id) => selected.find((row) => row.id_num === id));
    return { ...merge, values: consolidatedValues(rows, merge.finalName) };
  });
  const audit = {
    operation_id: OPERATION_ID,
    generated_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    apply_requested: applying,
    before_count: beforeCount,
    expected_after_count: beforeCount - sourceIds.length,
    relation_counts_for_sources: relationCounts,
    merges: prepared.map((merge) => ({
      label: merge.label,
      target_id: merge.targetId,
      source_ids: merge.sourceIds,
      final_name: merge.finalName,
      alternative_names: merge.values.alternativeNames,
      final_status: merge.values.situation,
      source_count: merge.values.sources.referencias.length,
    })),
  };
  await writeFile(backupPath, `${JSON.stringify({ ...audit, rows: selected }, null, 2)}\n`, "utf8");
  await writeFile(dryRunPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  if (!applying) {
    console.log(JSON.stringify(audit, null, 2));
    process.exitCode = 0;
  } else {
    await client.query("begin");
    try {
      await client.query("set local statement_timeout = '15s'");
      await client.query("set local lock_timeout = '5s'");
      const locked = (await client.query(
        "select id::int as id, nombre from public.elepem where id = any($1::bigint[]) order by id for update",
        [selectedIds],
      )).rows;
      if (locked.length !== selectedIds.length) throw new Error("Las filas cambiaron antes de obtener el bloqueo.");

      for (const merge of prepared) {
        const value = merge.values;
        await client.query(`
          update public.elepem set
            nombre = $2,
            nombres_alternativos = $3::text[],
            telefonos = $4::text[],
            emails = $5::text[],
            sitios_web = $6::text[],
            instagram_urls = $7::text[],
            facebook_urls = $8::text[],
            msp_habilitado = $9,
            mides_certificado = $10,
            msp_fuente_url = $11,
            msp_fecha = $12,
            mides_fuente_url = $13,
            mides_fecha = $14,
            descripcion = $15,
            imagen_url = $16,
            imagen_alt = $17,
            fuentes_referencias = $18::text[],
            fuentes_urls = $19::text[],
            fuentes_tipos = $20::text[],
            fuentes_proveedores = $21::text[],
            fuentes_fechas = $22::date[],
            fuentes_consultadas_at = $23::timestamptz[],
            fuentes_campos_respaldados = $24::text[],
            updated_at = now()
          where id = $1
        `, [
          merge.targetId, value.finalName, value.alternativeNames, value.phones, value.emails,
          value.websites, value.instagramUrls, value.facebookUrls, value.msp, value.mides,
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
      if (deletion.rowCount !== sourceIds.length) throw new Error("No se eliminaron exactamente las filas fuente esperadas.");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const afterCount = Number((await client.query("select count(*)::int as count from public.elepem")).rows[0].count);
    const finalRows = (await client.query(`
      select id::int as id, codigo, nombre, nombres_alternativos, departamento, localidad, direccion,
             msp_habilitado, mides_certificado, situacion, telefonos, emails,
             cardinality(fuentes_referencias) as source_count
      from public.elepem
      where id = any($1::bigint[])
      order by id
    `, [merges.map((merge) => merge.targetId)])).rows;
    const remainingSources = Number((await client.query(
      "select count(*)::int as count from public.elepem where id = any($1::bigint[])",
      [sourceIds],
    )).rows[0].count);
    if (afterCount !== beforeCount - sourceIds.length || finalRows.length !== merges.length || remainingSources !== 0) {
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
