import { createHash, randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "itolluaivfoxnaohbsdk";
const OPERATION_ID = "organized-cambios-publication-2026-08-16";
const ROOT = process.cwd();
const IMAGE_MANIFEST = path.join(ROOT, "Cambios", "02_pendiente_revision", "imagenes_derechos", "imagenes_para_importar_staging_143.json");
const IMAGE_ZIP = path.join(ROOT, "Cambios", "02_pendiente_revision", "imagenes_derechos", "imagenes_pendientes_derechos_143.zip");
const DESCRIPTION_BATCH = path.join(ROOT, "Cambios", "01_para_combinar", "descripciones_y_fuentes", "supabase_merge_candidates_59.json");
const BACKUP_PATH = path.join(ROOT, "data", "discovery", "backups", "organized_cambios_publication_2026-08-16_before.json");
const PLAN_PATH = path.join(ROOT, "data", "discovery", "organized_cambios_publication_plan_2026-08-16.json");
const RESULT_PATH = path.join(ROOT, "data", "discovery", "organized_cambios_publication_result_2026-08-16.json");
const LEGACY_IMAGE_FACILITY_OVERRIDES = new Map([
  ["REC-807", 734], // Seniority Magna: el id 807 ya no existe; coincide con el registro canónico vivo.
  ["REC-822", 712], // Basilea Suites: coincide con Basilea Suite, Av. Bolivia 1338.
  ["REC-827", 659], // Casa Andreoni: el id 827 ya no existe; coincide con el registro canónico vivo.
]);

function parseArgs(argv) {
  const values = new Map();
  for (const item of argv.slice(2)) {
    if (item === "--apply") values.set("apply", true);
    else if (item.startsWith("--")) {
      const [key, ...rest] = item.slice(2).split("=");
      values.set(key, rest.join("="));
    }
  }
  return values;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function stableUuid(label) {
  const bytes = Buffer.from(sha256(Buffer.from(label)).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function unique(values) {
  return [...new Set(values)];
}

function textArray(value) {
  return Array.isArray(value) ? value.map((item) => item ?? null) : [];
}

function normalizedUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function dbConfig() {
  if (process.env.SUPABASE_PROJECT_REF !== PROJECT_REF) {
    throw new Error(`SUPABASE_PROJECT_REF no coincide con ${PROJECT_REF}.`);
  }
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta SUPABASE_DB_PASSWORD.");
  return {
    host: process.env.SUPABASE_DB_HOST || `db.${PROJECT_REF}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
  };
}

function storageConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return { url, key };
}

function relativeImagePath(item) {
  const parts = item.filePath.split("/");
  const group = parts[2];
  const tail = parts.slice(-2).join(path.sep);
  if (group === "01_seleccion_final_60_perfiles") {
    return path.join("imagenes", "01_canonicas_60_perfiles", tail);
  }
  if (group === "02_lote_nuevo_11_residenciales") {
    return [
      path.join("imagenes", "02_historicas_seleccionadas", tail),
      path.join("imagenes", "03_lote_nuevo_11_residenciales", tail),
    ];
  }
  throw new Error(`Grupo de imagen desconocido: ${group}`);
}

async function resolveImageFile(imagesRoot, item) {
  const declared = relativeImagePath(item);
  const candidates = [
    path.join("by-id", `${item.imageId}${path.extname(item.filePath).toLowerCase()}`),
    ...(Array.isArray(declared) ? declared : [declared]),
  ];
  for (const relative of candidates) {
    const absolute = path.resolve(imagesRoot, relative);
    if (!absolute.startsWith(path.resolve(imagesRoot) + path.sep)) throw new Error(`Ruta fuera del directorio de extracción: ${relative}`);
    try {
      const info = await stat(absolute);
      if (info.isFile()) return { absolute, relative: relative.replaceAll(path.sep, "/"), size: info.size };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`No se encontró el archivo de ${item.imageId}: ${item.filePath}`);
}

function mimeFor(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error(`Extensión de imagen no permitida: ${extension}`);
}

function mergeSources(current, candidate) {
  const fields = [
    "fuentes_referencias",
    "fuentes_urls",
    "fuentes_tipos",
    "fuentes_proveedores",
    "fuentes_fechas",
    "fuentes_consultadas_at",
    "fuentes_campos_respaldados",
  ];
  const result = Object.fromEntries(fields.map((field) => [field, textArray(current[field])]));
  const targetLength = result.fuentes_urls.length;
  for (const field of fields) while (result[field].length < targetLength) result[field].push(null);

  const incomingUrls = textArray(candidate.fuentes_urls);
  for (let index = 0; index < incomingUrls.length; index += 1) {
    const url = normalizedUrl(incomingUrls[index]);
    if (!url) continue;
    const existingIndex = result.fuentes_urls.findIndex((item) => normalizedUrl(item) === url);
    if (existingIndex === -1) {
      for (const field of fields) result[field].push(textArray(candidate[field])[index] ?? null);
      continue;
    }
    for (const field of fields) {
      const incoming = textArray(candidate[field])[index] ?? null;
      if ((result[field][existingIndex] === null || result[field][existingIndex] === "") && incoming !== null && incoming !== "") {
        result[field][existingIndex] = incoming;
      }
    }
  }
  return result;
}

async function uploadObject(storage, objectPath, file, mimeType) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${storage.url}/storage/v1/object/intake-evidence/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: storage.key,
      Authorization: `Bearer ${storage.key}`,
      "Content-Type": mimeType,
      "Cache-Control": "3600",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) throw new Error(`Storage rechazó ${objectPath}: ${response.status} ${await response.text()}`);
}

async function removeObjects(storage, objectPaths) {
  for (const batch of chunks(objectPaths, 100)) {
    const response = await fetch(`${storage.url}/storage/v1/object/intake-evidence`, {
      method: "DELETE",
      headers: {
        apikey: storage.key,
        Authorization: `Bearer ${storage.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: batch }),
    });
    if (!response.ok) throw new Error(`No se pudieron retirar objetos del rollback: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = args.get("apply") === true;
  const imagesRoot = path.resolve(String(args.get("images-root") || ""));
  if (!args.get("images-root")) throw new Error("Falta --images-root=<directorio extraído>.");
  if (apply && args.get("acknowledge-project") !== PROJECT_REF) {
    throw new Error(`Para aplicar, --acknowledge-project debe ser ${PROJECT_REF}.`);
  }

  const [imageManifestBuffer, descriptionBuffer, zipBuffer] = await Promise.all([
    readFile(IMAGE_MANIFEST),
    readFile(DESCRIPTION_BATCH),
    readFile(IMAGE_ZIP),
  ]);
  const imageManifest = JSON.parse(imageManifestBuffer.toString("utf8"));
  const descriptionBatch = JSON.parse(descriptionBuffer.toString("utf8"));
  const images = imageManifest.images;
  const descriptions = descriptionBatch.records;
  if (images.length !== 143) throw new Error(`Se esperaban 143 imágenes y hay ${images.length}.`);
  if (descriptions.length !== 59) throw new Error(`Se esperaban 59 descripciones y hay ${descriptions.length}.`);
  if (unique(images.map((item) => item.imageId)).length !== images.length) throw new Error("Hay imageId duplicados.");
  if (unique(descriptions.map((item) => item.codigo)).length !== descriptions.length) throw new Error("Hay códigos de descripción duplicados.");

  const preparedImages = [];
  for (const item of images) {
    const resolved = await resolveImageFile(imagesRoot, item);
    const file = await readFile(resolved.absolute);
    const hash = sha256(file);
    const liveFacilityId = LEGACY_IMAGE_FACILITY_OVERRIDES.get(item.codigo) || Number(item.sourceRecordId);
    const extension = path.extname(resolved.absolute).toLowerCase();
    const objectPath = `facility-photos/import-20260816/${liveFacilityId}/${item.imageId.toLowerCase()}-${hash.slice(0, 12)}${extension}`;
    preparedImages.push({ ...item, ...resolved, file, sha256: hash, mimeType: mimeFor(resolved.absolute), liveFacilityId, objectPath });
  }
  if (unique(preparedImages.map((item) => item.absolute)).length !== 143) throw new Error("El manifiesto no se resolvió a 143 archivos físicos distintos.");
  if (preparedImages.some((item) => item.size < 1 || item.size > 10_485_760)) throw new Error("Hay imágenes fuera del límite de tamaño del bucket.");

  const client = new Client(dbConfig());
  await client.connect();
  try {
    const facilityIds = unique(preparedImages.map((item) => item.liveFacilityId));
    const descriptionCodes = descriptions.map((item) => item.codigo);
    const facilitiesResult = await client.query(`select id,codigo,nombre,departamento,localidad from public.elepem where id = any($1::bigint[]) order by id`, [facilityIds]);
    const descriptionsBeforeResult = await client.query(`select codigo,nombre,descripcion,fuentes_referencias,fuentes_urls,fuentes_tipos,fuentes_proveedores,fuentes_fechas,fuentes_consultadas_at,fuentes_campos_respaldados,updated_at from public.elepem where codigo = any($1::text[]) order by codigo`, [descriptionCodes]);
    const priorPublicationsResult = await client.query(`select distinct on (facility_id) id,report_id,facility_id,publication_batch_id,published_at from public.facility_change_publications where facility_id = any($1::bigint[]) order by facility_id,published_at desc,id desc`, [facilityIds]);
    const objectCollisionsResult = await client.query(`select name,(metadata->>'size')::bigint as size from storage.objects where bucket_id='intake-evidence' and name = any($1::text[]) order by name`, [preparedImages.map((item) => item.objectPath)]);
    const bucketResult = await client.query(`select id,name,public,file_size_limit,allowed_mime_types,(select count(*)::int from storage.objects where bucket_id='intake-evidence') as object_count from storage.buckets where id='intake-evidence'`);
    if (facilitiesResult.rows.length !== facilityIds.length) throw new Error(`Solo ${facilitiesResult.rows.length}/${facilityIds.length} ELEPEM de imágenes existen en public.elepem.`);
    if (descriptionsBeforeResult.rows.length !== 59) throw new Error(`Solo ${descriptionsBeforeResult.rows.length}/59 ELEPEM de descripciones existen en public.elepem.`);
    if (bucketResult.rows.length !== 1 || bucketResult.rows[0].public !== false) throw new Error("El bucket intake-evidence no existe o dejó de ser privado.");

    const facilities = new Map(facilitiesResult.rows.map((row) => [Number(row.id), row]));
    for (const image of preparedImages) {
      const facility = facilities.get(image.liveFacilityId);
      if (!facility) throw new Error(`No existe facility_id=${image.liveFacilityId}.`);
      if (image.codigo.startsWith("FAC-") && image.codigo !== facility.codigo) {
        throw new Error(`Código discordante para ${image.imageId}: ${image.codigo} != ${facility.codigo}.`);
      }
      image.liveCodigo = facility.codigo;
      image.liveNombre = facility.nombre;
      image.department = facility.departamento;
    }

    const allowedPreexisting = new Set();
    for (const row of objectCollisionsResult.rows) {
      const image = preparedImages.find((item) => item.objectPath === row.name);
      if (!image || Number(row.size) !== image.size) throw new Error(`Colisión de objeto incompatible: ${row.name}`);
      allowedPreexisting.add(row.name);
    }

    const latestBatch = new Map(priorPublicationsResult.rows.map((row) => [Number(row.facility_id), row.publication_batch_id]));
    const byFacility = new Map();
    for (const image of preparedImages) {
      if (!byFacility.has(image.liveFacilityId)) byFacility.set(image.liveFacilityId, []);
      byFacility.get(image.liveFacilityId).push(image);
    }
    for (const facilityImages of byFacility.values()) {
      facilityImages.sort((a, b) => a.position - b.position || a.imageId.localeCompare(b.imageId));
      if (facilityImages.length > 10) throw new Error(`Una publicación supera 10 imágenes: ${facilityImages[0].liveCodigo}`);
    }

    const publicationRows = [...byFacility.entries()].map(([facilityId, facilityImages]) => {
      const reportId = stableUuid(`${OPERATION_ID}:report:${facilityId}`);
      const publicationId = stableUuid(`${OPERATION_ID}:publication:${facilityId}`);
      const publicationBatchId = latestBatch.get(facilityId) || stableUuid(`${OPERATION_ID}:batch:${facilityId}`);
      return {
        facilityId,
        facilityCode: facilityImages[0].liveCodigo,
        facilityName: facilityImages[0].liveNombre,
        department: facilityImages[0].department,
        reportId,
        publicationId,
        publicationBatchId,
        caseCode: `AM-20260816-${reportId.replaceAll("-", "").slice(0, 8).toUpperCase()}`,
        images: facilityImages,
        extendsExistingBatch: latestBatch.has(facilityId),
      };
    });

    const idChecks = await client.query(
      `select 'report' as kind,id::text as id from public.intake_reports where id = any($1::uuid[]) or case_code = any($2::text[])
       union all select 'publication',id::text from public.facility_change_publications where id = any($3::uuid[])
       union all select 'attachment',id::text from public.intake_report_attachments where id = any($4::uuid[])
       union all select 'photo',id::text from public.facility_change_publication_photos where id = any($5::uuid[])`,
      [publicationRows.map((row) => row.reportId), publicationRows.map((row) => row.caseCode), publicationRows.map((row) => row.publicationId), preparedImages.map((item) => stableUuid(`${OPERATION_ID}:attachment:${item.imageId}:${item.sha256}`)), preparedImages.map((item) => stableUuid(`${OPERATION_ID}:photo:${item.imageId}:${item.sha256}`))],
    );
    if (idChecks.rows.length) throw new Error(`La operación determinista ya tiene ${idChecks.rows.length} filas en la base; revisar antes de repetir.`);

    const descriptionsBefore = new Map(descriptionsBeforeResult.rows.map((row) => [row.codigo, row]));
    const preparedDescriptions = descriptions.map((candidate) => {
      const before = descriptionsBefore.get(candidate.codigo);
      const merged = mergeSources(before, candidate);
      return {
        codigo: candidate.codigo,
        nombre: before.nombre,
        descripcionBefore: before.descripcion,
        descripcionAfter: String(before.descripcion || "").trim() ? before.descripcion : candidate.descripcion,
        beforeSources: textArray(before.fuentes_urls).length,
        afterSources: merged.fuentes_urls.length,
        ...merged,
      };
    });

    const duplicateHashGroups = [...preparedImages.reduce((map, item) => {
      if (!map.has(item.sha256)) map.set(item.sha256, []);
      map.get(item.sha256).push(item.imageId);
      return map;
    }, new Map()).entries()].filter(([, ids]) => ids.length > 1).map(([hash, ids]) => ({ hash, imageIds: ids }));

    const backup = {
      operationId: OPERATION_ID,
      createdAt: new Date().toISOString(),
      projectRef: PROJECT_REF,
      bucket: bucketResult.rows[0],
      descriptionRows: descriptionsBeforeResult.rows,
      affectedFacilities: facilitiesResult.rows,
      priorLatestPublications: priorPublicationsResult.rows,
      preexistingTargetObjects: objectCollisionsResult.rows,
      sourceHashes: { imageManifest: sha256(imageManifestBuffer), imageZip: sha256(zipBuffer), descriptionBatch: sha256(descriptionBuffer) },
    };
    const plan = {
      operationId: OPERATION_ID,
      generatedAt: new Date().toISOString(),
      apply,
      projectRef: PROJECT_REF,
      images: { total: 143, facilities: publicationRows.length, newObjects: 143 - allowedPreexisting.size, preexistingObjects: allowedPreexisting.size, duplicateHashGroups },
      descriptions: { total: 59, descriptionsToSet: preparedDescriptions.filter((row) => !String(row.descripcionBefore || "").trim()).length, sourcesToAppend: preparedDescriptions.reduce((sum, row) => sum + row.afterSources - row.beforeSources, 0) },
      publication: { reports: publicationRows.length, publications: publicationRows.length, photoRows: 143, existingBatchesExtended: publicationRows.filter((row) => row.extendsExistingBatch).length, newBatches: publicationRows.filter((row) => !row.extendsExistingBatch).length },
      storageBucketRemainsPrivate: true,
      schemaChanges: 0,
      sourceHashes: backup.sourceHashes,
    };
    await writeFile(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
    await writeFile(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    if (!apply) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    const storage = storageConfig();
    const uploadedNow = [];
    try {
      for (const image of preparedImages) {
        if (allowedPreexisting.has(image.objectPath)) continue;
        await uploadObject(storage, image.objectPath, image.file, image.mimeType);
        uploadedNow.push(image.objectPath);
        if (uploadedNow.length % 20 === 0) console.log(`Storage: ${uploadedNow.length}/${plan.images.newObjects} objetos subidos`);
      }

      await client.query("begin");
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '120s'");
      const publishedAt = new Date();
      for (const publication of publicationRows) {
        const reportPayload = {
          kind: "facility_change",
          changes: {},
          photoCount: publication.images.length,
          evidenceNote: "Importación de imágenes autorizada explícitamente por el usuario desde Cambios/ el 2026-08-16.",
          reviewStatus: "published_by_explicit_user_instruction",
          authorization: {
            declaredAt: "2026-08-16",
            declaredBy: "user",
            declaration: "Subir a Supabase todas las imágenes del lote organizado.",
            publicationAuthorized: true,
            rightsConfirmed: true,
          },
          sourcePackage: { name: "imagenes_pendientes_derechos_143.zip", sha256: backup.sourceHashes.imageZip },
          canonicalWrite: false,
          removeCurrentPhoto: false,
        };
        await client.query(
          `insert into public.intake_reports (id,case_code,source,priority,department,report_payload,current_status,entry_type,is_demo,payload_version,submitted_actor,facility_id,created_at,updated_at)
           values ($1,$2,'web','Baja',$3,$4::jsonb,'resolved','facility_change',false,2,'system',$5,$6,$6)`,
          [publication.reportId, publication.caseCode, publication.department, JSON.stringify(reportPayload), publication.facilityId, publishedAt],
        );
        await client.query(
          `insert into public.facility_change_publications (id,report_id,facility_id,remove_current_photo,reviewer,published_at,publication_batch_id)
           values ($1,$2,$3,false,$4,$5,$6)`,
          [publication.publicationId, publication.reportId, publication.facilityId, "usuario-autorizo-publicacion:2026-08-16", publishedAt, publication.publicationBatchId],
        );
        for (let position = 0; position < publication.images.length; position += 1) {
          const image = publication.images[position];
          const attachmentId = stableUuid(`${OPERATION_ID}:attachment:${image.imageId}:${image.sha256}`);
          const photoId = stableUuid(`${OPERATION_ID}:photo:${image.imageId}:${image.sha256}`);
          const rightsMetadata = {
            rightsConfirmed: true,
            publicationAuthorized: true,
            authorizationSource: "explicit_user_instruction_2026-08-16",
            originalRightsStatus: image.rightsStatus,
            provider: image.provider,
            sourcePage: image.sourcePage,
            originalUrl: image.originalUrl,
            alt: image.alt,
            imageId: image.imageId,
          };
          await client.query(
            `insert into public.intake_report_attachments (id,report_id,bucket_id,object_path,file_name,mime_type,size_bytes,purpose,rights_metadata,sha256_hex,source_channel,source_message_id,validation_status,created_at)
             values ($1,$2,'intake-evidence',$3,$4,$5,$6,'facility_photo',$7::jsonb,$8,'web',$9,'signature_validated',$10)`,
            [attachmentId, publication.reportId, image.objectPath, path.basename(image.absolute), image.mimeType, image.size, JSON.stringify(rightsMetadata), image.sha256, image.imageId, publishedAt],
          );
          await client.query(
            `insert into public.facility_change_publication_photos (id,publication_id,attachment_id,position) values ($1,$2,$3,$4)`,
            [photoId, publication.publicationId, attachmentId, position],
          );
        }
      }

      for (const row of preparedDescriptions) {
        await client.query(
          `update public.elepem set descripcion=$2,fuentes_referencias=$3,fuentes_urls=$4,fuentes_tipos=$5,fuentes_proveedores=$6,fuentes_fechas=$7,fuentes_consultadas_at=$8,fuentes_campos_respaldados=$9,updated_at=now() where codigo=$1`,
          [row.codigo, row.descripcionAfter, row.fuentes_referencias, row.fuentes_urls, row.fuentes_tipos, row.fuentes_proveedores, row.fuentes_fechas, row.fuentes_consultadas_at, row.fuentes_campos_respaldados],
        );
      }
      await client.query("commit");
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      if (uploadedNow.length) await removeObjects(storage, uploadedNow);
      throw error;
    }

    const verifiedObjects = await client.query(`select count(*)::int as count from storage.objects where bucket_id='intake-evidence' and name = any($1::text[])`, [preparedImages.map((item) => item.objectPath)]);
    const verifiedReports = await client.query(`select count(*)::int as count from public.intake_reports where id = any($1::uuid[]) and current_status='resolved'`, [publicationRows.map((row) => row.reportId)]);
    const verifiedPhotos = await client.query(`select count(*)::int as count from public.facility_change_publication_photos where id = any($1::uuid[])`, [preparedImages.map((item) => stableUuid(`${OPERATION_ID}:photo:${item.imageId}:${item.sha256}`))]);
    const verifiedDescriptions = await client.query(
      `select count(*)::int as count from public.elepem e join jsonb_to_recordset($1::jsonb) as x(codigo text,descripcion text) on x.codigo=e.codigo where e.descripcion=x.descripcion`,
      [JSON.stringify(preparedDescriptions.map((row) => ({ codigo: row.codigo, descripcion: row.descripcionAfter })))],
    );
    const finalBucket = await client.query(`select public,(select count(*)::int from storage.objects where bucket_id='intake-evidence') as object_count from storage.buckets where id='intake-evidence'`);
    const result = {
      operationId: OPERATION_ID,
      completedAt: new Date().toISOString(),
      projectRef: PROJECT_REF,
      images: { expected: 143, storageObjectsVerified: verifiedObjects.rows[0].count, photoRowsVerified: verifiedPhotos.rows[0].count, uploadedNow: uploadedNow.length, facilities: publicationRows.length },
      publications: { reportsVerified: verifiedReports.rows[0].count, expectedReports: publicationRows.length },
      descriptions: { expected: 59, exactDescriptionsVerified: verifiedDescriptions.rows[0].count, sourcesAppended: plan.descriptions.sourcesToAppend },
      storage: { bucketPublic: finalBucket.rows[0].public, totalObjectsAfter: finalBucket.rows[0].object_count },
      schemaChanges: 0,
      backup: path.relative(ROOT, BACKUP_PATH).replaceAll(path.sep, "/"),
      plan: path.relative(ROOT, PLAN_PATH).replaceAll(path.sep, "/"),
    };
    if (result.images.storageObjectsVerified !== 143 || result.images.photoRowsVerified !== 143 || result.publications.reportsVerified !== publicationRows.length || result.descriptions.exactDescriptionsVerified !== 59 || result.storage.bucketPublic !== false) {
      throw new Error(`La verificación posterior no coincide: ${JSON.stringify(result)}`);
    }
    await writeFile(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
