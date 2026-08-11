import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSupabasePool } from "./lib/supabase-script-db.mjs";
import { parseArgs, PROJECT_ROOT, uruguayDateStamp } from "./lib/discovery-files.mjs";

const DEMO_IDS = ["VER-DEMO-001", "VER-DEMO-002", "VER-DEMO-003"];

function assertExpectedIds(rows, expectedIds, label) {
  const actual = rows.map((row) => row.id).sort();
  const expected = [...expectedIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: IDs inesperados: ${JSON.stringify(actual)}.`);
  }
}

function safeTimestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const acknowledgedProject = String(args["acknowledge-project"] || "");
  if (args.apply === true && acknowledgedProject !== projectRef) {
    throw new Error("Para aplicar, --acknowledge-project debe coincidir con SUPABASE_PROJECT_REF.");
  }

  const pool = createSupabasePool("arandu-legacy-filter-taxonomy-cleanup");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '20s'");
    await client.query("set local lock_timeout = '5s'");

    const demos = await client.query(
      `select * from public.residenciales where id = any($1::text[]) order by id for update`,
      [DEMO_IDS],
    );
    assertExpectedIds(demos.rows, DEMO_IDS, "Filas demo");
    if (demos.rows.some((row) => !/demo|fictici/i.test(`${row.id} ${row.name} ${row.status_short}`))) {
      throw new Error("Una fila objetivo no está inequívocamente marcada como demo/ficticia.");
    }

    const officialRegistration = await client.query(`
      select * from public.residenciales
      where other_source = true
        and msp_registro_historico = false
        and source_label = 'MSP · certificados de registro 2017–2024 (fila 2024)'
      order by id
      for update
    `);
    const officialFinal = await client.query(`
      select * from public.residenciales
      where other_source = true
        and msp_final = false
        and source_label = 'MSP · ELEPEM habilitados (datos abiertos, 29/07/2024)'
      order by id
      for update
    `);
    if (officialRegistration.rowCount !== 10 || officialFinal.rowCount !== 7) {
      throw new Error(`Correcciones oficiales inesperadas: registro=${officialRegistration.rowCount}, final=${officialFinal.rowCount}.`);
    }

    const appRows = await client.query(`
      select * from public.residenciales
      where status_group = 'app'
      order by id
      for update
    `);
    if (appRows.rowCount !== 17 || appRows.rows.some((row) => !String(row.source_label).startsWith("SerpApi Google Maps"))) {
      throw new Error("Los registros APP no coinciden exactamente con el lote SerpAPI/Google Maps de Paysandú.");
    }

    const backupPayload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      projectRef,
      purpose: "Respaldo previo al saneamiento de filtros legacy y al backfill normalizado.",
      automaticPublication: false,
      demoRowsToDelete: demos.rows,
      officialRegistrationRowsToCorrect: officialRegistration.rows,
      officialFinalRowsToCorrect: officialFinal.rows,
      appRowsAuditedWithoutMutation: appRows.rows,
    };
    backupPayload.sha256 = createHash("sha256").update(JSON.stringify(backupPayload)).digest("hex");

    if (args.apply !== true) {
      await client.query("rollback");
      console.log(JSON.stringify({
        dryRun: true,
        projectRef,
        demoRowsToDelete: demos.rowCount,
        officialRegistrationRowsToCorrect: officialRegistration.rowCount,
        officialFinalRowsToCorrect: officialFinal.rowCount,
        appRowsAuditedAsPublicMaps: appRows.rowCount,
      }, null, 2));
      return;
    }

    const backupDirectory = resolve(PROJECT_ROOT, "data", "migration");
    const backupPath = resolve(
      backupDirectory,
      `legacy_filter_cleanup_backup_${uruguayDateStamp()}_${safeTimestamp()}.json`,
    );
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, `${JSON.stringify(backupPayload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

    const deleted = await client.query(
      `delete from public.residenciales where id = any($1::text[]) returning id`,
      [DEMO_IDS],
    );
    assertExpectedIds(deleted.rows, DEMO_IDS, "Borrado demo");

    const correctedRegistration = await client.query(
      `update public.residenciales
       set msp_registro_historico = true, other_source = false, updated_at = now()
       where id = any($1::text[])
       returning id`,
      [officialRegistration.rows.map((row) => row.id)],
    );
    const correctedFinal = await client.query(
      `update public.residenciales
       set msp_final = true, other_source = false, updated_at = now()
       where id = any($1::text[])
       returning id`,
      [officialFinal.rows.map((row) => row.id)],
    );
    if (correctedRegistration.rowCount !== 10 || correctedFinal.rowCount !== 7) {
      throw new Error("No se corrigieron todas las banderas oficiales esperadas.");
    }

    const verification = await client.query(`
      select
        count(*)::integer as legacy_total,
        count(*) filter (where status_group = 'verificar')::integer as demo_verification_rows,
        count(*) filter (where status_group = 'app')::integer as app_rows,
        count(*) filter (
          where status_group not in ('verificar', 'app')
            and not msp_final and not msp_registro_historico and not mides_social
            and (other_source or pacp)
        )::integer as legacy_outside_label_rows
      from public.residenciales
    `);
    if (verification.rows[0].demo_verification_rows !== 0 || verification.rows[0].app_rows !== 17) {
      throw new Error(`Verificación final inesperada: ${JSON.stringify(verification.rows[0])}.`);
    }

    await client.query("commit");
    console.log(JSON.stringify({
      applied: true,
      projectRef,
      backupPath,
      deletedDemoRows: deleted.rowCount,
      correctedOfficialRegistrationRows: correctedRegistration.rowCount,
      correctedOfficialFinalRows: correctedFinal.rowCount,
      appRowsPreservedAsPublicMaps: appRows.rowCount,
      verification: verification.rows[0],
    }, null, 2));
  } catch (error) {
    try { await client.query("rollback"); } catch {}
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
