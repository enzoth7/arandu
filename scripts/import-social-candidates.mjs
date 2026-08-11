import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readElepemDataSource } from "../lib/elepem-data-source.mjs";
import { buildSocialCandidateDryRun, socialDryRunReadSql } from "./lib/social-candidate-import.mjs";
import { discoveryPath, parseArgs, uruguayDateStamp, writeJsonAtomically } from "./lib/discovery-files.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readTargets(dataSource) {
  const readSql = socialDryRunReadSql(dataSource);
  const pool = createSupabasePool("arandu-social-candidate-dry-run");
  const client = await pool.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '30s'");
    const publicFacilities = await client.query(readSql.publicFacilities);
    const privateCandidates = await client.query(readSql.privateCandidates);
    const sourceObservations = await client.query(readSql.sourceObservations);
    await client.query("commit");
    return {
      publicFacilities: publicFacilities.rows,
      privateCandidates: privateCandidates.rows,
      sourceObservations: sourceObservations.rows,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error("Uso: --input <social-candidates.json> [--dry-run] [--output <report.json>].");
  if (args.apply === true) {
    throw new Error("--apply no está habilitado en esta fase: primero debe revisarse el informe y confirmarse el almacenamiento de referencia de las fuentes sociales.");
  }
  const inputPath = resolve(String(args.input));
  const osmPath = resolve(String(args.osm || "data/discovery/osm-elepem-candidates-2026-08-02.json"));
  const outputPath = discoveryPath(args.output, `social-candidate-review-${uruguayDateStamp()}.json`);
  const dataSource = readElepemDataSource();
  const [input, osmDocument, targets] = await Promise.all([readJson(inputPath), readJson(osmPath), readTargets(dataSource)]);
  const report = buildSocialCandidateDryRun({
    input,
    ...targets,
    osmCandidates: Array.isArray(osmDocument.candidates) ? osmDocument.candidates : [],
  });
  report.metadata.inputPath = inputPath;
  report.metadata.osmPath = osmPath;
  report.metadata.dataSource = dataSource;
  report.metadata.comparisonCounts = {
    publicResidenciales: targets.publicFacilities.length,
    privateCandidates: targets.privateCandidates.length,
    osmSourceObservations: targets.sourceObservations.length,
    cachedOsmCandidates: Array.isArray(osmDocument.candidates) ? osmDocument.candidates.length : 0,
  };
  await writeJsonAtomically(outputPath, report, { overwrite: true });
  console.log(JSON.stringify({ outputPath, ...report.summary, dryRun: true, publicResidencialesWrites: 0 }, null, 2));
  console.log("Dry run completo. No se modificó Supabase y no se contactó Instagram.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
