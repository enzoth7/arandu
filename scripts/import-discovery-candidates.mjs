import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readElepemDataSource } from "../lib/elepem-data-source.mjs";
import {
  buildCandidateReview,
  privateCandidateRows,
  validateDiscoveryDocuments,
} from "./lib/candidate-review.mjs";
import {
  discoveryPath,
  parseArgs,
  uruguayDateStamp,
  writeJsonAtomically,
} from "./lib/discovery-files.mjs";
import { applyPrivateCandidates } from "./lib/private-candidate-import.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.existing) {
    throw new Error("Uso: --input <osm.json> --existing <residenciales.json> [--apply].");
  }
  const inputPath = resolve(String(args.input));
  const existingPath = resolve(String(args.existing));
  const limit = Number(args.limit || 3);
  if (!Number.isInteger(limit) || limit !== 3) {
    throw new Error("Esta fase exige exactamente tres alternativas por candidato.");
  }
  const [input, existing] = await Promise.all([
    readJson(inputPath),
    readJson(existingPath),
  ]);
  const validated = validateDiscoveryDocuments(input, existing);
  const review = buildCandidateReview(input, existing, { limit });
  const outputPath = discoveryPath(
    args.output,
    `osm-candidate-review-${uruguayDateStamp()}.json`,
  );
  await writeJsonAtomically(outputPath, review, { overwrite: true });

  const summary = {
    inputPath,
    existingPath,
    outputPath,
    candidateCount: review.metadata.candidateCount,
    counts: review.metadata.counts,
    apply: args.apply === true,
    publicResidencialesWrites: 0,
  };
  if (args.apply !== true) {
    console.log(JSON.stringify(summary, null, 2));
    console.log("Dry run completo. No se modificó Supabase.");
    return;
  }

  const rows = privateCandidateRows(input, review);
  const dataSource = readElepemDataSource();
  const pool = createSupabasePool("arandu-private-osm-candidate-import");
  const client = await pool.connect();
  try {
    const database = await applyPrivateCandidates(client, {
      inputMetadata: validated.inputMetadata,
      rows,
      dataSource,
    });
    review.metadata.databaseApply = {
      appliedAt: new Date().toISOString(),
      privateSchemaOnly: true,
      publicResidencialesWrites: 0,
      ...database,
    };
    await writeJsonAtomically(outputPath, review, { overwrite: true });
    console.log(JSON.stringify({ ...summary, database }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
