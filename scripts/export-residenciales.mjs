import { createHash } from "node:crypto";
import { discoveryPath, parseArgs, uruguayDateStamp, writeJsonAtomically } from "./lib/discovery-files.mjs";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";

export const RESIDENCIALES_EXPORT_SQL = `
  select
    id,
    name,
    department,
    locality,
    address,
    lat,
    lng,
    updated_at
  from public.residenciales
  order by department, locality, name, id
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) throw new Error("La exportación es siempre de solo lectura.");
  const dateStamp = uruguayDateStamp();
  const outputPath = discoveryPath(
    args.output,
    `residenciales-live-${dateStamp}.json`,
  );
  const pool = createSupabasePool("arandu-residenciales-readonly-export");
  const client = await pool.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '30s'");
    const result = await client.query(RESIDENCIALES_EXPORT_SQL);
    await client.query("commit");
    const retrievedAt = new Date().toISOString();
    const facilities = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      aliases: [],
      department: row.department,
      locality: row.locality,
      address: row.address,
      phone: null,
      latitude: row.lat,
      longitude: row.lng,
      updatedAt: row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
    }));
    const document = {
      metadata: {
        schemaVersion: 1,
        sourceTable: "public.residenciales",
        retrievedAt,
        recordCount: facilities.length,
        readOnly: true,
        querySha256: createHash("sha256")
          .update(RESIDENCIALES_EXPORT_SQL)
          .digest("hex"),
      },
      facilities,
    };
    await writeJsonAtomically(outputPath, document, {
      overwrite: args.overwrite === true,
    });
    console.log(JSON.stringify({ outputPath, recordCount: facilities.length, readOnly: true }, null, 2));
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
