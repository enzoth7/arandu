import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";
import {
  applyReviewedDepartmentImport,
  buildReviewedDepartmentImportPlan,
  inspectReviewedDepartmentImport,
} from "./lib/reviewed-department-import.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPORTS_DIRECTORY = resolve(PROJECT_ROOT, "data", "reports");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) args[argument.slice(2, equals)] = argument.slice(equals + 1);
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else args[argument.slice(2)] = true;
  }
  return args;
}

function safeInput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(PROJECT_ROOT, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Insumo fuera del workspace: ${value}`);
  }
  return path;
}

function safeOutput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(REPORTS_DIRECTORY, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || !path.endsWith(".json")) {
    throw new Error("La salida debe ser JSON dentro de data/reports/.");
  }
  return path;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.review || !args.exclusion || !args.output) {
    throw new Error("Faltan --input, --review, --exclusion o --output.");
  }
  const inputPath = safeInput(args.input);
  const reviewPath = safeInput(args.review);
  const exclusionPath = safeInput(args.exclusion);
  const outputPath = safeOutput(args.output);
  const [inputContent, reviewContent, exclusionContent] = await Promise.all([
    readFile(inputPath, "utf8"),
    readFile(reviewPath, "utf8"),
    readFile(exclusionPath, "utf8"),
  ]);
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument: JSON.parse(inputContent),
    reviewDocument: JSON.parse(reviewContent),
    exclusionDocument: JSON.parse(exclusionContent),
    inputHash: createHash("sha256").update(inputContent).digest("hex"),
  });
  const pool = createSupabasePool("arandu-reviewed-department-import");
  const client = await pool.connect();
  try {
    const inspection = await inspectReviewedDepartmentImport(client, plan);
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        apply: args.apply === true,
        privateOnly: true,
        publicWritesAllowed: false,
        remoteModel: "legacy_private_workflow",
      },
      plan,
      inspection,
      databaseApply: null,
    };
    if (args.apply === true) {
      if (!inspection.safeToApply) throw new Error("El dry-run detectó revisiones humanas conflictivas.");
      report.databaseApply = await applyReviewedDepartmentImport(client, plan);
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
      output: relative(PROJECT_ROOT, outputPath).replaceAll("\\", "/"),
      apply: args.apply === true,
      plan: plan.summary,
      inspection: {
        existing: inspection.existing.length,
        conflicts: inspection.conflicts.length,
        safeToApply: inspection.safeToApply,
      },
      databaseApply: report.databaseApply,
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
