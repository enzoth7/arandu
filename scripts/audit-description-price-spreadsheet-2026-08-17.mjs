import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { inflateRawSync } from "node:zlib";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const OPERATION_ID = "audit-description-price-spreadsheet-2026-08-17";
const APPLY_FLAG = `--confirm-description-update=${OPERATION_ID}`;
const root = process.cwd();
const workbookPath = path.join(root, "Cambios", "17-8", "Copy of DESCRIPCIONES_59_TODO_JUNTO_EDITABLE.xlsx");
const resultPath = path.join(root, "data", "discovery", `${OPERATION_ID}_result.json`);
const backupPath = path.join(root, "data", "discovery", "backups", `${OPERATION_ID}_before.json`);
const applying = process.argv.includes(APPLY_FLAG);

if (process.env.SUPABASE_PROJECT_REF !== PROJECT_REF) {
  throw new Error(`SUPABASE_PROJECT_REF no coincide con ${PROJECT_REF}.`);
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function zipEntries(buffer) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("No se encontró el directorio ZIP del XLSX.");
  const count = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Entrada ZIP inválida.");
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    entries.set(name, compression === 0 ? compressed : compression === 8 ? inflateRawSync(compressed) : null);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseWorksheet(entries) {
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") || "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => decodeXml(match[1]));
  const worksheetXml = entries.get("xl/worksheets/sheet2.xml")?.toString("utf8");
  if (!worksheetXml) throw new Error("No se encontró la hoja Descripciones_59.");
  const rows = [];
  for (const rowMatch of worksheetXml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = /\br="([A-Z]+)\d+"/.exec(cellMatch[1])?.[1];
      if (!reference) continue;
      const type = /\bt="([^"]+)"/.exec(cellMatch[1])?.[1];
      const content = cellMatch[2] || "";
      const raw = /<v>([\s\S]*?)<\/v>/.exec(content)?.[1] || "";
      cells[reference] = type === "s" ? shared[Number(raw)] : decodeXml(raw || /<is>([\s\S]*?)<\/is>/.exec(content)?.[1]);
    }
    rows.push({ row: Number(rowMatch[1]), cells });
  }
  const header = rows.find((row) => row.row === 1)?.cells;
  if (header?.C !== "Código" || header?.I !== "Descripción completa" || header?.J !== "Precio") {
    throw new Error("La hoja Descripciones_59 no tiene las columnas esperadas.");
  }
  return rows.slice(1)
    .filter((row) => row.cells.C && row.cells.O === "Sí")
    .map((row) => ({
      row: row.row,
      sourceRecordId: row.cells.D,
      codigo: row.cells.C,
      nombre: row.cells.B,
      departamento: row.cells.E,
      localidad: row.cells.F,
      direccion: row.cells.G,
      descripcion: row.cells.I,
      precioDeclarado: row.cells.J,
    }));
}

function parsePrice(value) {
  const match = /\$\s*([\d.]+)/.exec(value || "");
  return match ? Number(match[1].replaceAll(".", "")) : null;
}

const xlsx = await readFile(workbookPath);
const spreadsheetRows = parseWorksheet(zipEntries(xlsx));
const codes = spreadsheetRows.map((row) => row.codigo);
if (new Set(codes).size !== codes.length) throw new Error("Hay códigos duplicados en la hoja aprobada.");

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

await client.connect();
try {
  const matches = (await client.query(`
    select 'elepem'::text as tabla, id::int, codigo, legacy_id, nombre, departamento, localidad, direccion,
           descripcion, precio_mensual_uyu, precio_fecha, precio_fuente_url
      from public.elepem where codigo = any($1::text[])
    union all
    select 'elepem_sin_ubicacion'::text, id::int, codigo, legacy_id, nombre, departamento, localidad, direccion,
           descripcion, precio_mensual_uyu, precio_fecha, precio_fuente_url
      from public.elepem_sin_ubicacion where codigo = any($1::text[])
    order by codigo, tabla, id
  `, [codes])).rows;
  const matchesByCode = new Map();
  for (const match of matches) {
    const current = matchesByCode.get(match.codigo) || [];
    current.push(match);
    matchesByCode.set(match.codigo, current);
  }

  const rows = spreadsheetRows.map((source) => {
    const live = matchesByCode.get(source.codigo) || [];
    const declaredPrice = parsePrice(source.precioDeclarado);
    const exactMatch = live.length === 1 ? live[0] : null;
    return {
      source_row: source.row,
      source_record_id: source.sourceRecordId,
      codigo: source.codigo,
      source_name: source.nombre,
      source_location: [source.departamento, source.localidad, source.direccion].filter(Boolean).join(" · "),
      description_length: source.descripcion.length,
      declared_price_text: source.precioDeclarado,
      declared_price_uyu: declaredPrice,
      match_status: exactMatch ? "exact_code" : live.length === 0 ? "not_found" : "ambiguous_code",
      live_matches: live.map((facility) => ({
        tabla: facility.tabla,
        id: facility.id,
        codigo: facility.codigo,
        legacy_id: facility.legacy_id,
        nombre: facility.nombre,
        location: [facility.departamento, facility.localidad, facility.direccion].filter(Boolean).join(" · "),
        description_length: facility.descripcion?.length || 0,
        has_description: Boolean(facility.descripcion),
        current_price_uyu: facility.precio_mensual_uyu,
        current_price_date: facility.precio_fecha,
        current_price_source_url: facility.precio_fuente_url,
      })),
      proposed_description_update: Boolean(exactMatch && source.descripcion && source.descripcion !== exactMatch.descripcion),
      proposed_price_update: Boolean(exactMatch && declaredPrice !== null && declaredPrice !== exactMatch.precio_mensual_uyu),
    };
  });
  const updateCandidates = spreadsheetRows.map((source) => {
    const live = matchesByCode.get(source.codigo) || [];
    const target = live.length === 1 ? live[0] : null;
    if (!target || target.tabla !== "elepem" || Number(source.sourceRecordId) !== target.id) return null;
    if (!source.descripcion || source.descripcion === target.descripcion) return null;
    return {
      id: target.id,
      codigo: source.codigo,
      source_record_id: source.sourceRecordId,
      nombre: source.nombre,
      previous_description: target.descripcion,
      next_description: source.descripcion,
    };
  }).filter(Boolean);
  if (rows.some((row) => row.match_status !== "exact_code")) {
    throw new Error("La auditoría no produjo coincidencias exactas para todas las filas aprobadas.");
  }
  if (rows.some((row) => Number(row.source_record_id) !== row.live_matches[0].id)) {
    throw new Error("El ID base de la planilla no coincide con la fila activa.");
  }

  const summary = {
    source_rows_approved: rows.length,
    exact_code_matches: rows.filter((row) => row.match_status === "exact_code").length,
    not_found: rows.filter((row) => row.match_status === "not_found").length,
    ambiguous_code: rows.filter((row) => row.match_status === "ambiguous_code").length,
    descriptions_proposed: rows.filter((row) => row.proposed_description_update).length,
    prices_declared: rows.filter((row) => row.declared_price_uyu !== null).length,
    prices_proposed: rows.filter((row) => row.proposed_price_update).length,
  };
  const result = {
    operation_id: OPERATION_ID,
    generated_at: new Date().toISOString(),
    mode: applying ? "apply_requested" : "read_only_audit",
    source_workbook: path.relative(root, workbookPath).replaceAll(path.sep, "/"),
    matching_rule: "codigo exacto; source_record_id conservado para verificación secundaria",
    summary,
    rows,
    description_update_candidates: updateCandidates.map(({ previous_description, next_description, ...candidate }) => ({
      ...candidate,
      previous_description_length: previous_description?.length || 0,
      next_description_length: next_description.length,
    })),
  };
  await mkdir(path.dirname(resultPath), { recursive: true });
  if (!applying) {
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...summary, result: path.relative(root, resultPath).replaceAll(path.sep, "/") }, null, 2));
  } else {
    await mkdir(path.dirname(backupPath), { recursive: true });
    await writeFile(backupPath, `${JSON.stringify({
      ...result,
      mode: "backup_before_apply",
      description_updates: updateCandidates,
    }, null, 2)}\n`, "utf8");
    await client.query("begin");
    try {
      await client.query("set local statement_timeout = '20s'");
      await client.query("set local lock_timeout = '5s'");
      const locked = (await client.query(`
        select id::int, codigo, descripcion
          from public.elepem
         where id = any($1::bigint[])
         order by id
         for update
      `, [updateCandidates.map((candidate) => candidate.id)])).rows;
      if (locked.length !== updateCandidates.length) throw new Error("Las filas a actualizar cambiaron antes del bloqueo.");
      for (const candidate of updateCandidates) {
        const lockedRow = locked.find((row) => row.id === candidate.id);
        if (!lockedRow || lockedRow.codigo !== candidate.codigo || lockedRow.descripcion !== candidate.previous_description) {
          throw new Error(`La fila ${candidate.id} cambió desde la auditoría.`);
        }
        const update = await client.query(`
          update public.elepem
             set descripcion = $2,
                 updated_at = now()
           where id = $1
             and codigo = $3
             and descripcion is not distinct from $4
        `, [candidate.id, candidate.next_description, candidate.codigo, candidate.previous_description]);
        if (update.rowCount !== 1) throw new Error(`No se actualizó exactamente una vez la fila ${candidate.id}.`);
      }
      const verified = (await client.query(`
        select id::int, codigo, descripcion
          from public.elepem
         where id = any($1::bigint[])
      `, [updateCandidates.map((candidate) => candidate.id)])).rows;
      if (verified.length !== updateCandidates.length || verified.some((row) => {
        const candidate = updateCandidates.find((item) => item.id === row.id);
        return !candidate || row.codigo !== candidate.codigo || row.descripcion !== candidate.next_description;
      })) {
        throw new Error("La verificación de descripciones posterior no coincide con el lote autorizado.");
      }
      await client.query("commit");
      const appliedResult = {
        ...result,
        mode: "applied",
        completed_at: new Date().toISOString(),
        descriptions_updated: updateCandidates.length,
        prices_updated: 0,
        backup: path.relative(root, backupPath).replaceAll(path.sep, "/"),
      };
      await writeFile(resultPath, `${JSON.stringify(appliedResult, null, 2)}\n`, "utf8");
      console.log(JSON.stringify({ ...summary, descriptions_updated: updateCandidates.length, prices_updated: 0, backup: appliedResult.backup, result: path.relative(root, resultPath).replaceAll(path.sep, "/") }, null, 2));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
