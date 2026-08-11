import { readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";

const MISSING = new Set(["", "sin dato", "sin departamento", "sin localidad", "no informado", "n/a"]);
const DEPARTMENTS = new Map([
  ["artigas", "Artigas"], ["canelones", "Canelones"], ["cerro largo", "Cerro Largo"],
  ["colonia", "Colonia"], ["durazno", "Durazno"], ["flores", "Flores"],
  ["florida", "Florida"], ["lavalleja", "Lavalleja"], ["maldonado", "Maldonado"],
  ["montevideo", "Montevideo"], ["paysandu", "Paysandú"], ["rio negro", "Río Negro"],
  ["rivera", "Rivera"], ["rocha", "Rocha"], ["salto", "Salto"],
  ["san jose", "San José"], ["soriano", "Soriano"], ["tacuarembo", "Tacuarembó"],
  ["treinta y tres", "Treinta y Tres"],
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isMissing(value) {
  return value == null || MISSING.has(normalize(value));
}

function displayName(value) {
  const small = new Set(["de", "del", "la", "las", "los", "y", "e"]);
  return String(value ?? "").toLocaleLowerCase("es-UY").split(/\s+/).map((word, index) => (
    index > 0 && small.has(word)
      ? word
      : `${word.charAt(0).toLocaleUpperCase("es-UY")}${word.slice(1)}`
  )).join(" ");
}

function canonicalDepartment(value) {
  return DEPARTMENTS.get(normalize(value)) ?? displayName(value);
}

function explicitLocationTail(address) {
  const raw = String(address ?? "").trim().replace(/\/$/, "");
  const dash = raw.match(/\s+-\s+([^/]+?)\.?$/);
  if (dash) return dash[1];
  const slash = raw.match(/\/\s+([^/]+?)\.?$/);
  if (slash) return slash[1];
  const dot = raw.match(/\.([^\s/.][^/.]+?)\.?$/);
  return dot ? dot[1] : null;
}

function databaseConfig() {
  return {
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: String(process.env.SUPABASE_DB_PASSWORD),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "AranduAcademic/0.1 location-normalization" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`IDE Uruguay returned HTTP ${response.status}`);
  return response.json();
}

async function reverseIde(rows) {
  const results = new Array(rows.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= rows.length) return;
      const row = rows[index];
      const params = new URLSearchParams({
        latitud: String(row.lat),
        longitud: String(row.lng),
        limit: "3",
      });
      const response = await fetchJson(`https://direcciones.ide.uy/api/v1/geocode/reverse?${params}`);
      results[index] = (Array.isArray(response) ? response : []).find((item) => (
        item?.departamento && item?.localidad
      )) ?? null;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  await Promise.all(Array.from({ length: 3 }, () => worker()));
  return results;
}

async function loadLocalities(departments) {
  const result = new Map();
  for (const department of departments) {
    const params = new URLSearchParams({ departamento: department, alias: "true" });
    const response = await fetchJson(`https://direcciones.ide.uy/api/v0/geocode/localidades?${params}`);
    const terms = [];
    for (const item of Array.isArray(response) ? response : []) {
      const canonical = displayName(item.nombre);
      terms.push({ term: normalize(item.nombre), canonical });
      for (const alias of item.alias ?? []) terms.push({ term: normalize(alias.nombre), canonical });
    }
    result.set(normalize(department), terms.filter(({ term }) => term.length >= 3));
  }
  return result;
}

function explicitLocality(address, department, localities) {
  const tail = normalize(explicitLocationTail(address));
  if (tail.length < 3) return null;
  const matches = (localities.get(normalize(department)) ?? [])
    .filter(({ term }) => tail === term || tail.includes(term))
    .sort((left, right) => right.term.length - left.term.length);
  return matches[0]?.canonical ?? null;
}

async function buildPlan(client) {
  const publicResult = await client.query(`
    select id, name, department, locality, address, lat, lng
    from public.residenciales
    where lower(trim(coalesce(department, ''))) in ('', 'sin dato', 'sin departamento', 'sin localidad', 'no informado', 'n/a')
       or lower(trim(coalesce(locality, ''))) in ('', 'sin dato', 'sin departamento', 'sin localidad', 'no informado', 'n/a')
    order by id
  `);
  const candidateResult = await client.query(`
    select candidate.id, candidate.candidate_key, candidate.normalized_name,
           candidate.normalized_department, candidate.normalized_locality,
           candidate.normalized_address, candidate.lat, candidate.lng,
           candidate.status, candidate.best_match_residencial_id,
           matched.department as matched_department, matched.locality as matched_locality
    from discovery_private.facility_candidates as candidate
    left join public.residenciales as matched
      on matched.id = candidate.best_match_residencial_id
    where candidate.normalized_department is null
       or trim(candidate.normalized_department) = ''
       or candidate.normalized_department in ('sin dato', 'sin departamento', 'sin localidad')
       or candidate.normalized_locality is null
       or trim(candidate.normalized_locality) = ''
       or candidate.normalized_locality in ('sin dato', 'sin departamento', 'sin localidad')
    order by candidate.id
  `);

  const departments = [...new Set(publicResult.rows.map(({ department }) => department).filter(Boolean))];
  const localities = await loadLocalities(departments);
  const publicReverse = await reverseIde(publicResult.rows);
  const candidateReverse = await reverseIde(candidateResult.rows);

  const publicCorrections = publicResult.rows.map((row, index) => {
    const ide = publicReverse[index];
    const explicit = explicitLocality(row.address, row.department, localities);
    let locality;
    let method;
    if (normalize(row.department) === "montevideo") {
      locality = "Montevideo";
      method = "single_locality_department";
    } else if (explicit) {
      locality = explicit;
      method = "address_explicit_locality";
    } else if (normalize(ide?.departamento) === normalize(row.department)) {
      locality = displayName(ide.localidad);
      method = "ide_reverse";
    } else {
      throw new Error(`Could not resolve public locality for ${row.id}`);
    }
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      oldDepartment: row.department,
      oldLocality: row.locality,
      department: canonicalDepartment(row.department),
      locality,
      method,
      ide: ide ? { id: String(ide.id), address: ide.address, department: ide.departamento, locality: ide.localidad } : null,
    };
  });

  const candidateCorrections = candidateResult.rows.map((row, index) => {
    const ide = candidateReverse[index];
    const matchedUsable = !isMissing(row.matched_department) && !isMissing(row.matched_locality);
    const department = matchedUsable ? canonicalDepartment(row.matched_department) : canonicalDepartment(ide?.departamento);
    const locality = matchedUsable ? displayName(row.matched_locality) : displayName(ide?.localidad);
    if (!department || !locality) throw new Error(`Could not resolve candidate location for ${row.id}`);
    return {
      id: String(row.id),
      candidateKey: row.candidate_key,
      name: row.normalized_name,
      oldDepartment: row.normalized_department,
      oldLocality: row.normalized_locality,
      department,
      locality,
      method: matchedUsable ? "best_official_match" : "ide_reverse",
      ide: ide ? { id: String(ide.id), address: ide.address, department: ide.departamento, locality: ide.localidad } : null,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "IDE Uruguay reverse geocoding and existing official records",
    publicCorrections,
    candidateCorrections,
  };
}

async function applyPlan(client, plan, { commit }) {
  await client.query("begin");
  try {
    for (const correction of plan.publicCorrections) {
      const current = await client.query(`
        select residencial.*, mapping.facility_id
        from public.residenciales as residencial
        join elepem_core.legacy_facility_map as mapping
          on mapping.legacy_residencial_id = residencial.id
         and mapping.mapping_status = 'mapped'
        where residencial.id = $1
        for update of residencial
      `, [correction.id]);
      const row = current.rows[0];
      if (!row || row.department !== correction.oldDepartment || row.locality !== correction.oldLocality) {
        throw new Error(`Public record changed after planning: ${correction.id}`);
      }
      const previousAddress = await client.query(`
        update elepem_core.facility_addresses
        set is_current = false, valid_to = current_date
        where facility_id = $1 and is_current
        returning *
      `, [row.facility_id]);
      if (previousAddress.rowCount !== 1) throw new Error(`Expected one current address for ${correction.id}`);
      const address = previousAddress.rows[0];
      await client.query(`
        insert into elepem_core.facility_addresses (
          facility_id, address_line, normalized_address, locality, department,
          postal_code, address_type, valid_from, is_current, observation_id
        ) values ($1, $2, $3, $4, $5, $6, $7, current_date, true, $8)
      `, [row.facility_id, address.address_line, address.normalized_address, correction.locality,
        correction.department, address.postal_code, address.address_type, address.observation_id]);
      await client.query(`
        insert into elepem_core.audit_log (
          entity_type, entity_key, action, actor_identifier, before_state, after_state, request_id
        ) values ('facility_location', $1, 'normalize_location', 'codex:project_owner_instruction', $2, $3,
                  'normalize-missing-locations-2026-08-04')
      `, [correction.id,
        { department: row.department, locality: row.locality, address: row.address },
        { department: correction.department, locality: correction.locality, address: row.address,
          method: correction.method, ide: correction.ide }]);
      await client.query(`
        update public.residenciales
        set department = $2, locality = $3, updated_at = now()
        where id = $1
      `, [correction.id, correction.department, correction.locality]);
    }

    for (const correction of plan.candidateCorrections) {
      const current = await client.query(`
        select * from discovery_private.facility_candidates where id = $1 for update
      `, [correction.id]);
      const row = current.rows[0];
      if (!row || row.normalized_department !== correction.oldDepartment || row.normalized_locality !== correction.oldLocality) {
        throw new Error(`Candidate changed after planning: ${correction.id}`);
      }
      await client.query(`
        insert into elepem_core.audit_log (
          entity_type, entity_key, action, actor_identifier, before_state, after_state, request_id
        ) values ('facility_candidate_location', $1, 'normalize_location', 'codex:project_owner_instruction', $2, $3,
                  'normalize-missing-locations-2026-08-04')
      `, [correction.candidateKey,
        { department: row.normalized_department, locality: row.normalized_locality },
        { department: normalize(correction.department), locality: normalize(correction.locality),
          method: correction.method, ide: correction.ide }]);
      await client.query(`
        update discovery_private.facility_candidates
        set normalized_department = $2, normalized_locality = $3, updated_at = now()
        where id = $1
      `, [correction.id, normalize(correction.department), normalize(correction.locality)]);
    }
    await client.query(commit ? "commit" : "rollback");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const apply = process.argv.includes("--apply");
const checkApply = process.argv.includes("--check-apply");
const input = argument("--input");
const output = argument("--output");
const client = new Client(databaseConfig());
await client.connect();
try {
  const plan = input ? JSON.parse(await readFile(input, "utf8")) : await buildPlan(client);
  if (output) await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const summary = {
    mode: apply ? "apply" : checkApply ? "check-apply-rollback" : "dry-run",
    publicCorrections: plan.publicCorrections.length,
    candidateCorrections: plan.candidateCorrections.length,
    publicMethods: Object.fromEntries([...new Set(plan.publicCorrections.map(({ method }) => method))]
      .map((method) => [method, plan.publicCorrections.filter((item) => item.method === method).length])),
    candidateMethods: Object.fromEntries([...new Set(plan.candidateCorrections.map(({ method }) => method))]
      .map((method) => [method, plan.candidateCorrections.filter((item) => item.method === method).length])),
    output,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (apply || checkApply) await applyPlan(client, plan, { commit: apply });
} finally {
  await client.end();
}
