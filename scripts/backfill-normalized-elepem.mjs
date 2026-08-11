import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import pg from "pg";
import {
  applyNormalizedBackfill,
  collectNormalizedReconciliation,
} from "./lib/apply-normalized-elepem-backfill.mjs";
import {
  buildBackfillPlan,
  parseCsv,
} from "./lib/normalized-elepem-backfill.mjs";
import {
  parseArgs,
  PROJECT_ROOT,
  uruguayDateStamp,
  writeJsonAtomically,
} from "./lib/discovery-files.mjs";

const { Pool } = pg;
const DEFAULTS = {
  remoteSnapshot: "data/discovery/normalized-backfill-source-2026-08-03.json",
  osm: "data/discovery/osm-elepem-candidates-2026-08-02.json",
  paysandu: "data/discovery/instagram_paysandu_candidates_2026-08-02.json",
  artigas: "data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json",
};

function requiredInputArgument(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) {
    throw new Error(
      `Falta --${name}=ruta. Los insumos fuente v01 retirados ya no tienen una ruta predeterminada.`,
    );
  }
  return value;
}

async function readInput(relativePath, format) {
  const path = resolve(PROJECT_ROOT, relativePath);
  const content = await readFile(path, "utf8");
  return {
    path,
    relativePath: relative(PROJECT_ROOT, path).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(content).digest("hex"),
    value: format === "csv" ? parseCsv(content) : JSON.parse(content),
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeTextAtomically(target, content) {
  const outputDirectory = resolve(PROJECT_ROOT, "data", "migration");
  const relativeTarget = relative(outputDirectory, target);
  if (!relativeTarget || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw new Error("La salida debe permanecer dentro de data/migration.");
  }
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, content, "utf8");
    await rm(target, { force: true });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

function assertLocalDatabase(databaseUrl, targetId, acknowledged) {
  if (!databaseUrl) {
    throw new Error("Falta --database-url o NORMALIZED_BACKFILL_DATABASE_URL.");
  }
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("La URL de PostgreSQL local no es válida.");
  }
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error(`Backfill rechazado: ${parsed.hostname} no es un host local permitido.`);
  }
  if (!targetId || !String(targetId).startsWith("local-")) {
    throw new Error("--target-id debe identificar explícitamente un entorno local-*.");
  }
  if (!acknowledged) {
    throw new Error("Falta --acknowledge-non-production para aplicar en el entorno local.");
  }
  return {
    targetId: String(targetId),
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: parsed.pathname.replace(/^\//, "") || "postgres",
  };
}

async function collectSecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'normalized_tables', (
        select count(*) from pg_class as class
        join pg_namespace as namespace on namespace.oid = class.relnamespace
        where namespace.nspname = 'elepem_core' and class.relkind = 'r'
      ),
      'rls_not_forced', (
        select count(*) from pg_class as class
        join pg_namespace as namespace on namespace.oid = class.relnamespace
        where namespace.nspname = 'elepem_core' and class.relkind = 'r'
          and (not class.relrowsecurity or not class.relforcerowsecurity)
      ),
      'browser_table_grants', (
        select count(*) from information_schema.role_table_grants
        where table_schema = 'elepem_core'
          and grantee in ('anon', 'authenticated')
      ),
      'security_invoker_views', (
        select count(*) from pg_class as class
        join pg_namespace as namespace on namespace.oid = class.relnamespace
        where namespace.nspname = 'public'
          and class.relname in (
            'facilities_current_internal',
            'facilities_public_approved',
            'residenciales_legacy_compat',
            'known_facilities_exclusion_view'
          )
          and class.reloptions @> array['security_invoker=true']
      )
    ) as value
  `);
  return result.rows[0].value;
}

function auditMarkdown({
  target,
  inputs,
  plan,
  before,
  after,
  security,
  repeated,
  rollbackTested,
}) {
  const inputRows = inputs
    .map((input) => `| \`${input.relativePath}\` | ${input.count} | \`${input.sha256}\` |`)
    .join("\n");
  const countRows = Object.entries(after.counts)
    .map(([name, value]) => `| ${name} | ${value} |`)
    .join("\n");
  const integrityRows = Object.entries(after.integrity)
    .map(([name, value]) => `| ${name} | ${value} |`)
    .join("\n");
  return `# Auditoría de backfill normalizado — ${validAuditDate(inputs)}

Estado: ejecutado únicamente en \`${target.targetId}\` (${target.host}:${target.port}/${target.database}).

El proyecto remoto se usó solo para generar un snapshot en una transacción \`READ ONLY\`. No se aplicó SQL ni se escribió en \`itolluaivfoxnaohbsdk\`.

## Entradas

| Archivo | Filas/registros | SHA-256 |
|---|---:|---|
${inputRows}

## Plan calculado

\`\`\`json
${JSON.stringify(plan.summary, null, 2)}
\`\`\`

## Conteos posteriores

| Relación | Filas |
|---|---:|
${countRows}

## Integridad

| Control | Resultado |
|---|---:|
${integrityRows}

## Seguridad

- Tablas normalizadas: ${security.normalized_tables}.
- Tablas sin RLS habilitada y forzada: ${security.rls_not_forced}.
- Grants de tabla para \`anon\`/\`authenticated\`: ${security.browser_table_grants}.
- Vistas con \`security_invoker=true\`: ${security.security_invoker_views} de 4.
- Filas en \`facilities_public_approved\`: ${after.counts.public_approved}.
- Candidatos con \`public_eligible=true\`: ${after.integrity.public_candidates}.

## Idempotencia

- La ejecución comenzó con ${before.counts.facilities} sedes normalizadas.
- Ejecución repetida detectada: ${repeated ? "sí" : "no"}.
- Las escrituras usan claves estables y \`ON CONFLICT\`; no actualizan revisiones humanas ni publican candidatos.

## Rollback y reaplicación

- Rollback estructural probado en este target local: ${rollbackTested ? "sí" : "no"}.
- El rollback preserva las ${plan.summary.legacyRows} filas heredadas, candidatos, observaciones y los IDs externos originales; elimina únicamente el esquema canónico y los IDs cuya sede canónica propietaria se retira.
- La reaplicación restaura el modelo y los enlaces al catálogo de fuentes.

## Conflictos

Se emitieron ${plan.conflicts.length} filas en el CSV de conflictos. Las fusiones permitidas provienen exclusivamente de decisiones humanas ya documentadas en el repositorio. Matching por nombre solo está prohibido.

## Limitaciones

- Este informe demuestra el backfill local, no un corte de producción.
- Las sedes quedan \`publication_status = private\` y \`review_status = needs_review\`.
- Los candidatos privados conservan su nivel de evidencia y estado de revisión existente.
- El snapshot privado se conserva en \`data/discovery\`, ruta ignorada por Git.
`;
}

function validAuditDate(inputs) {
  const snapshot = inputs.find((input) => input.relativePath.includes("normalized-backfill-source"));
  const match = snapshot?.relativePath.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? new Date().toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dateStamp = uruguayDateStamp();
  const loaded = await Promise.all([
    readInput(String(args["remote-snapshot"] || DEFAULTS.remoteSnapshot), "json"),
    readInput(requiredInputArgument(args, "official-json"), "json"),
    readInput(requiredInputArgument(args, "official-csv"), "csv"),
    readInput(requiredInputArgument(args, "source-records"), "csv"),
    readInput(requiredInputArgument(args, "source-catalog"), "csv"),
    readInput(String(args.osm || DEFAULTS.osm), "json"),
    readInput(String(args.paysandu || DEFAULTS.paysandu), "json"),
    readInput(String(args.artigas || DEFAULTS.artigas), "json"),
  ]);
  const [remote, officialJson, officialCsv, sourceRecords, sourceCatalog, osm, paysandu, artigas] = loaded;
  const retrievedAt = Date.parse(String(remote.value.metadata?.retrievedAt ?? ""));
  const generatedAt = Number.isFinite(retrievedAt)
    ? new Date(retrievedAt).toISOString()
    : new Date().toISOString();
  const plan = buildBackfillPlan({
    remoteSnapshot: remote.value,
    officialEntities: officialJson.value,
    officialCsvRows: officialCsv.value,
    sourceRecordRows: sourceRecords.value,
    sourceCatalogRows: sourceCatalog.value,
    osmDocument: osm.value,
    paysanduDocument: paysandu.value,
    artigasDocument: artigas.value,
    generatedAt,
  });

  const inputManifest = loaded.map((input) => ({
    relativePath: input.relativePath,
    sha256: input.sha256,
    count: Array.isArray(input.value)
      ? input.value.length
      : input.value.metadata?.counts?.residenciales ??
        input.value.candidates?.length ??
        input.value.records?.length ??
        1,
  }));

  if (args.apply !== true) {
    console.log(JSON.stringify({ dryRun: true, summary: plan.summary, inputs: inputManifest }, null, 2));
    console.log("Dry run completo. No se modificó ninguna base de datos.");
    return;
  }

  const databaseUrl = String(args["database-url"] || process.env.NORMALIZED_BACKFILL_DATABASE_URL || "");
  const target = assertLocalDatabase(
    databaseUrl,
    args["target-id"],
    args["acknowledge-non-production"] === true,
  );
  console.log(JSON.stringify({ apply: true, target, planned: plan.summary }, null, 2));

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
    application_name: "arandu-normalized-local-backfill",
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });
  const client = await pool.connect();
  try {
    const required = await client.query(`
      select
        current_database() as database_name,
        to_regclass('elepem_core.facilities') is not null as normalized_ready,
        to_regclass('public.residenciales') is not null as legacy_ready
    `);
    if (!required.rows[0].normalized_ready || !required.rows[0].legacy_ready) {
      throw new Error("El target local no tiene aplicadas las migraciones requeridas.");
    }
    if (required.rows[0].database_name !== target.database) {
      throw new Error("El nombre de base verificado no coincide con --database-url.");
    }

    const before = await collectNormalizedReconciliation(client);
    const ids = await applyNormalizedBackfill(client, plan);
    const after = await collectNormalizedReconciliation(client);
    const security = await collectSecurity(client);
    const repeated = Number(before.counts.facilities) > 0;
    if (
      repeated &&
      Object.keys(after.counts).some(
        (key) => Number(after.counts[key]) !== Number(before.counts[key]),
      )
    ) {
      throw new Error(
        `Control de idempotencia falló: ${JSON.stringify({ before: before.counts, after: after.counts })}`,
      );
    }
    if (Number(after.counts.public_approved) !== 0 || Number(after.integrity.public_candidates) !== 0) {
      throw new Error("Control de seguridad falló: el backfill hizo una fila públicamente elegible.");
    }
    if (Number(after.integrity.unmapped_legacy) !== 0 || Number(after.integrity.orphan_mappings) !== 0) {
      throw new Error("Control de integridad falló: hay filas heredadas sin mapping u orphans.");
    }

    const outputDirectory = resolve(PROJECT_ROOT, "data", "migration");
    const mappingPath = resolve(outputDirectory, `facility_id_mapping_${dateStamp}.csv`);
    const conflictPath = resolve(outputDirectory, `supabase_backfill_conflicts_${dateStamp}.csv`);
    const auditPath = resolve(outputDirectory, `supabase_backfill_audit_${dateStamp}.md`);
    const reconciliationPath = resolve(outputDirectory, `supabase_reconciliation_${dateStamp}.json`);

    const mappingHeader = [
      "legacy_residencial_id",
      "facility_key",
      "facility_id",
      "mapping_status",
      "match_method",
      "confidence",
      "official_entity_ids",
      "department",
    ];
    const mappingLines = [mappingHeader.join(",")];
    for (const row of plan.legacyMappings) {
      mappingLines.push(
        [
          row.legacyResidencialId,
          row.facilityKey,
          ids.facilities.get(row.facilityKey),
          row.mappingStatus,
          row.matchMethod,
          row.confidence,
          row.officialEntityIds.join("|"),
          row.department,
        ].map(csvEscape).join(","),
      );
    }
    await writeTextAtomically(mappingPath, `${mappingLines.join("\n")}\n`);

    const conflictHeader = [
      "conflict_id",
      "conflict_type",
      "legacy_residencial_id",
      "official_entity_id",
      "department",
      "detail",
      "requires_human_review",
      "resolution",
    ];
    const conflictLines = [conflictHeader.join(",")];
    for (const row of plan.conflicts) {
      const conflictId = `CONFLICT-${createHash("sha256")
        .update(JSON.stringify(row))
        .digest("hex")
        .slice(0, 16)}`;
      conflictLines.push(
        [
          conflictId,
          row.conflictType,
          row.legacyResidencialId,
          row.officialEntityId,
          row.department,
          row.detail,
          row.requiresHumanReview,
          row.resolution,
        ].map(csvEscape).join(","),
      );
    }
    await writeTextAtomically(conflictPath, `${conflictLines.join("\n")}\n`);

    const reconciliation = {
      schemaVersion: 1,
      generatedAt,
      environment: { type: "local", ...target },
      remoteProject: { projectRef: remote.value.metadata.projectRef, access: "read_only_export" },
      inputs: inputManifest,
      planned: plan.summary,
      before,
      after,
      security,
      idempotence: {
        repeatedRun: repeated,
        stableKeysUsed: true,
        humanReviewsOverwritten: false,
      },
      publication: {
        normalizedApprovedRows: Number(after.counts.public_approved),
        publicEligibleCandidates: Number(after.integrity.public_candidates),
        automaticPublication: false,
      },
      rollback: {
        testedSeparately: args["rollback-tested"] === true,
        legacyRowsPreserved:
          args["rollback-tested"] === true ? plan.summary.legacyRows : null,
        candidatesPreserved:
          args["rollback-tested"] === true ? plan.summary.candidates : null,
        observationsPreserved:
          args["rollback-tested"] === true ? plan.summary.sourceObservations : null,
        originalExternalIdsPreserved:
          args["rollback-tested"] === true
            ? Number(remote.value.metadata.counts.externalIds)
            : null,
        reappliedSuccessfully: args["rollback-tested"] === true,
      },
    };
    await writeJsonAtomically(reconciliationPath, reconciliation, { overwrite: true });
    await writeTextAtomically(
      auditPath,
      auditMarkdown({
        target,
        inputs: inputManifest,
        plan,
        before,
        after,
        security,
        repeated,
        rollbackTested: args["rollback-tested"] === true,
      }),
    );

    console.log(
      JSON.stringify(
        {
          target,
          outputs: { mappingPath, conflictPath, auditPath, reconciliationPath },
          before: before.counts,
          after: after.counts,
          integrity: after.integrity,
          security,
          automaticPublication: false,
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
