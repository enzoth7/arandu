import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook } from "@oai/artifact-tool";

const repoRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ["inventory", "data/discovery/organizacion_cambios_2026-08-16/inventario.csv", 19],
  ["pending_prices", "Cambios/02_pendiente_revision/precios_no_conciliados/precios_no_conciliados_5.csv", 5],
  ["pending_candidates", "Cambios/02_pendiente_revision/residenciales/candidatos_pendientes_84.csv", 84],
  ["normalized_corrections", "Cambios/02_pendiente_revision/correcciones/correcciones_normalizadas_143.csv", 143],
];

const validations = [];
for (const [name, relativePath, expectedRows] of files) {
  const absolutePath = path.join(repoRoot, relativePath);
  const csvText = await fs.readFile(absolutePath, "utf8");
  const workbook = await Workbook.fromCSV(csvText, { sheetName: name.slice(0, 31) });
  const inspection = await workbook.inspect({
    kind: "workbook,sheet,table",
    maxChars: 5000,
    tableMaxRows: 4,
    tableMaxCols: 12,
    tableMaxCellChars: 100,
  });
  const nonEmptyLines = csvText.trimEnd().split(/\r?\n/);
  const actualRows = nonEmptyLines.length - 1;
  if (actualRows !== expectedRows) {
    throw new Error(`${relativePath}: expected ${expectedRows} data rows, got ${actualRows}`);
  }
  validations.push({
    name,
    path: relativePath.replaceAll("\\", "/"),
    expected_rows: expectedRows,
    actual_rows: actualRows,
    parsed_with_artifact_tool: true,
    inspection: inspection.ndjson,
  });
}

const outputPath = path.join(repoRoot, "data/discovery/organizacion_cambios_2026-08-16/spreadsheet_validation.json");
await fs.writeFile(outputPath, `${JSON.stringify({ validated_at: new Date().toISOString(), files: validations }, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ validated: validations.map(({ name, actual_rows }) => ({ name, actual_rows })) })}\n`);
