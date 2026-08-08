import { createHash } from "node:crypto";
import { normalizeAddress, normalizeName, normalizePhone, normalizeText } from "../../lib/facility-matching.mjs";
import { parseCsv } from "./normalized-elepem-backfill.mjs";
import { EXCLUDED_SOURCE_IDS, SOURCE_MERGE_GROUPS } from "./elepem-v01-reviewed-mappings.mjs";

const MAX_OBSERVATION_LENGTH = 500;

const CANONICAL_DEPARTMENTS = new Map([
  ["artigas", "Artigas"], ["canelones", "Canelones"], ["cerro largo", "Cerro Largo"],
  ["colonia", "Colonia"], ["durazno", "Durazno"], ["flores", "Flores"], ["florida", "Florida"],
  ["lavalleja", "Lavalleja"], ["maldonado", "Maldonado"], ["montevideo", "Montevideo"],
  ["paysandu", "Paysand\u00fa"], ["rio negro", "R\u00edo Negro"], ["rivera", "Rivera"],
  ["rocha", "Rocha"], ["salto", "Salto"], ["san jose", "San Jos\u00e9"], ["soriano", "Soriano"],
  ["tacuarembo", "Tacuaremb\u00f3"], ["treinta y tres", "Treinta y Tres"],
]);

function text(value, maximum = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function nullableText(value, maximum = 1000) {
  const result = text(value, maximum);
  return result || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableId(prefix, value) {
  return `${prefix}-${sha256(value).slice(0, 16).toUpperCase()}`;
}

function splitValues(value) {
  return unique(
    String(value ?? "")
      .split(/[|;\n]+/)
      .map((part) => part.trim()),
  );
}

function validUrl(value) {
  const raw = text(value, 1200);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function urlList(value) {
  return unique(splitValues(value).map(validUrl));
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function entryAddress(value, record = {}, source = {}) {
  const address = nullableText(value, 500);
  if (!address) return null;
  return {
    address,
    normalized_address: normalizeAddress(address, {
      department: record.department,
      locality: record.locality,
    }) || null,
    department: nullableText(record.department, 100),
    locality: nullableText(record.locality, 160),
    precision: source.precision || "source_observed",
    source_ids: source.sourceIds || [],
  };
}

function sourceRecord({
  sourceType,
  referenceKey,
  sourceUrl = null,
  sourceDate = null,
  retrievedAt = null,
  reliability = "public_source",
  note = null,
}) {
  return {
    source_type: text(sourceType, 80) || "other",
    reference_key: text(referenceKey, 360),
    source_url: validUrl(sourceUrl),
    source_date: nullableText(sourceDate, 80),
    retrieved_at: nullableText(retrievedAt, 80),
    reliability,
    observation: nullableText(note, MAX_OBSERVATION_LENGTH),
  };
}

function contactSet(values, type, sourceIds) {
  const normalized = new Map();
  for (const rawValue of values) {
    const value = text(rawValue, 300);
    if (!value) continue;
    const key = type === "phone" ? normalizePhone(value) : normalizeText(value);
    if (!key) continue;
    const existing = normalized.get(key) || { value, source_ids: [] };
    existing.source_ids = unique([...existing.source_ids, ...sourceIds]);
    normalized.set(key, existing);
  }
  return [...normalized.values()].map((item) => ({
    ...item,
    reliability: "official_facility_contact",
  }));
}

function mergeField(target, field, values) {
  target[field] = unique([...(target[field] || []), ...values]);
}

function mergeAddresses(target, addresses) {
  const existing = new Map(
    target.addresses.map((address) => [
      `${normalizeText(address.department)}|${address.normalized_address || normalizeText(address.address)}`,
      address,
    ]),
  );
  for (const address of addresses.filter(Boolean)) {
    const key = `${normalizeText(address.department)}|${address.normalized_address || normalizeText(address.address)}`;
    const prior = existing.get(key);
    if (prior) prior.source_ids = unique([...prior.source_ids, ...address.source_ids]);
    else {
      target.addresses.push(address);
      existing.set(key, address);
    }
  }
}

function mergeSources(target, sources) {
  const existing = new Map(target.sources.map((source) => [`${source.source_type}|${source.reference_key}`, source]));
  for (const source of sources) {
    if (!source.reference_key) continue;
    const key = `${source.source_type}|${source.reference_key}`;
    if (!existing.has(key)) {
      target.sources.push(source);
      existing.set(key, source);
    }
  }
}

function mergeContacts(target, contacts) {
  for (const field of ["phones", "emails", "domains"]) {
    const existing = new Map((target.contacts[field] || []).map((item) => [normalizeText(item.value), item]));
    for (const item of contacts[field] || []) {
      const key = normalizeText(item.value);
      const prior = existing.get(key);
      if (prior) prior.source_ids = unique([...prior.source_ids, ...item.source_ids]);
      else {
        target.contacts[field].push(item);
        existing.set(key, item);
      }
    }
  }
}

function createEntry({ exclusionId, subjectType, canonicalName, department = null, locality = null, status, reason }) {
  return {
    exclusion_id: exclusionId,
    subject_type: subjectType,
    canonical_name: nullableText(canonicalName, 300),
    normalized_name: normalizeName(canonicalName) || null,
    names: [],
    aliases: [],
    historical_names: [],
    department: nullableText(department, 100),
    locality: nullableText(locality, 160),
    addresses: [],
    contacts: { phones: [], emails: [], domains: [] },
    social_urls: [],
    external_ids: [],
    coordinates: [],
    sources: [],
    administrative_stages: [],
    legacy_residencial_ids: [],
    candidate_keys: [],
    lifecycle_status: "unknown",
    review_status: status,
    exclusion_reason: reason,
    possible_moves: [],
    possible_rebrands: [],
    conflicts: [],
    human_review_required: false,
    private_only: true,
  };
}

function addName(entry, name, kind, sourceIds = []) {
  const value = nullableText(name, 300);
  if (!value) return;
  const target = kind === "historical" ? entry.historical_names : kind === "alias" ? entry.aliases : entry.names;
  const existing = target.find((item) => normalizeName(item.value) === normalizeName(value));
  if (existing) existing.source_ids = unique([...existing.source_ids, ...sourceIds]);
  else target.push({ value, normalized_name: normalizeName(value), source_ids: sourceIds });
}

function addConflict(entry, conflicts, type, detail, { requiresHumanReview = true, sourceIds = [] } = {}) {
  const fingerprint = `${type}|${entry.exclusion_id}|${detail}`;
  const conflict = {
    conflict_id: stableId("EXC-CONFLICT", fingerprint),
    exclusion_id: entry.exclusion_id,
    conflict_type: type,
    department: entry.department,
    detail: text(detail, 1500),
    source_ids: sourceIds,
    requires_human_review: requiresHumanReview,
  };
  if (!entry.conflicts.some((item) => item.conflict_id === conflict.conflict_id)) {
    entry.conflicts.push(conflict);
    entry.human_review_required ||= requiresHumanReview;
    conflicts.push(conflict);
  }
}

function administrativeStages(entity) {
  const stages = [];
  if (entity.msp_final === "true") stages.push("authorization_final");
  if (entity.mides_social === "true") stages.push("social_certificate");
  if (entity.msp_registro_historico === "true") stages.push("historical_registration");
  if (entity.pacp === "true") stages.push("provider_registry");
  if (text(entity.highest_stage)) stages.push(text(entity.highest_stage, 80));
  return unique(stages);
}

function lifecycleForEntity(entity) {
  if (entity.msp_final === "true") return "current";
  if (entity.msp_registro_historico === "true" && entity.mides_social !== "true" && entity.pacp !== "true") {
    return "historical";
  }
  return "known_unconfirmed_current";
}

function reviewedRepresentativeMap() {
  const representatives = new Map();
  for (const group of SOURCE_MERGE_GROUPS) {
    for (const member of group.members) representatives.set(member, group.representative);
  }
  return representatives;
}

function csvRows(value) {
  return Array.isArray(value) ? value : parseCsv(String(value ?? ""));
}

function exactCandidateKey(prefix, value) {
  const raw = text(value, 360);
  return raw ? `${prefix}:${raw}` : null;
}

function recordsForOfficial(sourceRows, entityId) {
  return sourceRows.filter((row) => String(row.entity_id) === String(entityId));
}

function parsePdfTextSummary(pdfText) {
  const raw = String(pdfText ?? "");
  const lines = raw.split(/\r?\n/);
  const rowNumbers = new Set(
    lines
      .map((line) => line.match(/^\s*(\d{1,4})\s+/)?.[1])
      .filter(Boolean),
  );
  const contaminationSignals = [
    ["split_header", /dire\s+cci[oó]n|t\s+elef[oó]nico/i],
    ["split_email", /\b[\w.-]+\s+@\s*[\w.-]+\.[a-z]{2,}\b/i],
    ["merged_rows", /\d{2,}\s+[A-Za-zÁÉÍÓÚÑ].{0,40}\d{2,}\s+[A-Za-zÁÉÍÓÚÑ]/i],
  ].filter(([, pattern]) => pattern.test(raw)).map(([type]) => type);
  return {
    text_characters: raw.length,
    numbered_line_candidates: rowNumbers.size,
    extraction_contamination_signals: contaminationSignals,
    extraction_requires_human_review: contaminationSignals.length > 0,
  };
}

function candidateSource(type, record, retrievedAt) {
  const firstSource = Array.isArray(record.sources) ? record.sources[0] || {} : {};
  return sourceRecord({
    sourceType: type,
    referenceKey: record.candidate_key || record.candidateKey || record.sourceRecordKey || record.externalId || "candidate",
    sourceUrl: firstSource.url || record.instagram_url || record.facebook_url || record.externalUrl || record.sourceUrl || null,
    sourceDate: firstSource.observed_at || firstSource.observedAt || record.generated_at || null,
    retrievedAt,
    reliability: type === "social_public_url" ? "public_lead_tier_c" : "public_candidate_source",
  });
}

function candidateEntry(entries, key, details) {
  const existing = entries.get(key);
  if (existing) return existing;
  const entry = createEntry({
    exclusionId: stableId("EXC-CANDIDATE", key),
    subjectType: "private_candidate",
    canonicalName: details.name,
    department: details.department,
    locality: details.locality,
    status: details.status || "unreviewed_candidate",
    reason: "Candidato conocido: excluir de redescubrimiento y conservar para revisión privada.",
  });
  entry.candidate_keys.push(key);
  entries.set(key, entry);
  return entry;
}

function attachCandidateDetails(entry, details, conflicts) {
  addName(entry, details.name, "observed", details.sourceIds || []);
  for (const alias of details.aliases || []) addName(entry, alias, "alias", details.sourceIds || []);
  mergeAddresses(entry, [entryAddress(details.address, details, {
    precision: details.addressPrecision || "source_observed",
    sourceIds: details.sourceIds || [],
  })]);
  const latitude = coordinate(details.latitude ?? details.lat, -90, 90);
  const longitude = coordinate(details.longitude ?? details.lng, -180, 180);
  if (latitude !== null && longitude !== null) {
    entry.coordinates.push({ lat: latitude, lng: longitude, method: details.coordinateMethod || "source_observed", source_ids: details.sourceIds || [] });
  }
  mergeField(entry, "social_urls", urlList(details.socialUrl));
  if (details.externalId) {
    entry.external_ids.push({ provider: details.provider || "openstreetmap", external_id: text(details.externalId, 360), external_url: validUrl(details.externalUrl), source_ids: details.sourceIds || [] });
  }
  if (details.matchStatus && details.matchStatus !== "new_candidate") {
    addConflict(entry, conflicts, "candidate_possible_duplicate", `Sugerencia ${details.matchStatus}; no se fusionó automáticamente.`, {
      sourceIds: details.sourceIds || [],
    });
  }
  if (!text(details.address)) {
    addConflict(entry, conflicts, "candidate_missing_exact_address", "La pista no tiene dirección física exacta; no es geocodificable todavía.", {
      sourceIds: details.sourceIds || [],
    });
  }
}

function finaliseEntry(entry) {
  entry.department = CANONICAL_DEPARTMENTS.get(normalizeText(entry.department)) || entry.department;
  entry.names.sort((a, b) => a.value.localeCompare(b.value, "es-UY"));
  entry.aliases.sort((a, b) => a.value.localeCompare(b.value, "es-UY"));
  entry.historical_names.sort((a, b) => a.value.localeCompare(b.value, "es-UY"));
  entry.addresses.sort((a, b) => `${a.department || ""}|${a.address}`.localeCompare(`${b.department || ""}|${b.address}`, "es-UY"));
  entry.sources.sort((a, b) => `${a.source_type}|${a.reference_key}`.localeCompare(`${b.source_type}|${b.reference_key}`));
  entry.external_ids = entry.external_ids.filter((value, index, values) => values.findIndex((item) => `${item.provider}|${item.external_id}` === `${value.provider}|${value.external_id}`) === index);
  entry.social_urls = unique(entry.social_urls).sort();
  entry.administrative_stages = unique(entry.administrative_stages).sort();
  entry.legacy_residencial_ids = unique(entry.legacy_residencial_ids).sort();
  entry.candidate_keys = unique(entry.candidate_keys).sort();
  entry.coordinates = entry.coordinates.filter((value, index, values) => values.findIndex((item) => item.lat === value.lat && item.lng === value.lng) === index);
  return entry;
}

export function buildKnownFacilitiesExclusionIndex({
  officialEntities,
  sourceRecords,
  legacySnapshot,
  facilityMappings,
  backfillConflicts,
  osmDocument,
  osmReview,
  paysanduDocument,
  artigasDocument,
  pdfText,
  generatedAt,
  inputManifest = [],
  pdfVisualReviewed = false,
}) {
  const officialRows = csvRows(officialEntities);
  const officialSourceRows = csvRows(sourceRecords);
  const mappings = csvRows(facilityMappings);
  const knownEntries = new Map();
  const candidateEntries = new Map();
  const conflicts = [];
  const reviewedRepresentatives = reviewedRepresentativeMap();
  const officialEntryByEntityId = new Map();
  const pdfSummary = parsePdfTextSummary(pdfText);
  const remoteMeta = legacySnapshot.metadata || {};

  for (const entity of officialRows) {
    const entityId = String(entity.entity_id);
    const excludedReason = EXCLUDED_SOURCE_IDS.get(entityId);
    const representative = excludedReason ? entityId : reviewedRepresentatives.get(entityId) || entityId;
    const entryKey = `official:${representative}`;
    let entry = knownEntries.get(entryKey);
    if (!entry) {
      entry = createEntry({
        exclusionId: `EXC-OFFICIAL-${representative}`,
        subjectType: "official_facility",
        canonicalName: entity.name,
        department: entity.department,
        locality: entity.locality,
        status: excludedReason ? "source_contaminated" : "known_official",
        reason: excludedReason
          ? "Registro oficial conservado para exclusión, pero no apto para fusión automática por contaminación de fuente."
          : "Establecimiento conocido desde registro oficial; excluir de nuevo descubrimiento.",
      });
      entry.lifecycle_status = lifecycleForEntity(entity);
      knownEntries.set(entryKey, entry);
    }
    officialEntryByEntityId.set(entityId, entry);
    const sourceRows = recordsForOfficial(officialSourceRows, entityId);
    const sourceIds = sourceRows.map((row) => String(row.record_id));
    addName(entry, entity.name, "observed", sourceIds);
    mergeAddresses(entry, [entryAddress(entity.address, entity, { sourceIds })]);
    const latitude = coordinate(entity.latitude, -90, 90);
    const longitude = coordinate(entity.longitude, -180, 180);
    if (latitude !== null && longitude !== null) {
      entry.coordinates.push({
        lat: latitude,
        lng: longitude,
        method: text(entity.geocode_method, 80) || "official_source",
        confidence: text(entity.geocode_confidence, 80) || null,
        source_ids: sourceIds,
      });
    }
    entry.administrative_stages.push(...administrativeStages(entity));
    const officialUrls = [...urlList(entity.source_urls), ...sourceRows.flatMap((row) => urlList(row.source_url))];
    for (const [index, url] of officialUrls.entries()) {
      mergeSources(entry, [sourceRecord({
        sourceType: "official",
        referenceKey: `${entityId}:url:${index + 1}`,
        sourceUrl: url,
        sourceDate: entity.latest_public_date,
        retrievedAt: generatedAt,
        reliability: "official_nominal",
      })]);
    }
    mergeSources(entry, sourceRows.map((row) => sourceRecord({
      sourceType: text(row.source_type, 80) || "official",
      referenceKey: row.record_id,
      sourceUrl: row.source_url,
      sourceDate: row.source_date,
      retrievedAt: generatedAt,
      reliability: "official_nominal",
      note: `Fuente oficial: ${text(row.source_title, 220) || "sin título"}`,
    })));
    const phones = [entity.phone, ...sourceRows.map((row) => row.phone)];
    const emails = [entity.email, ...sourceRows.map((row) => row.email)];
    mergeContacts(entry, {
      phones: contactSet(phones, "phone", sourceIds),
      emails: contactSet(emails, "email", sourceIds),
      domains: contactSet(emails.map((email) => text(email).split("@").at(-1) || ""), "email", sourceIds),
    });
    if (excludedReason) addConflict(entry, conflicts, "excluded_contaminated_source", excludedReason, { sourceIds });
    if (entity.historical_certificate_count && Number(entity.historical_certificate_count) > 0) {
      entry.historical_names.push({ value: text(entity.name, 300), normalized_name: normalizeName(entity.name), source_ids: sourceIds });
    }
  }

  for (const legacy of legacySnapshot.residenciales || []) {
    const mapping = mappings.find((row) => String(row.legacy_residencial_id) === String(legacy.id));
    const officialIds = splitValues(mapping?.official_entity_ids);
    const linkedEntries = unique(officialIds.map((id) => officialEntryByEntityId.get(id)).filter(Boolean));
    const entry = linkedEntries.length === 1
      ? linkedEntries[0]
      : (() => {
          const key = `legacy:${legacy.id}`;
          if (!knownEntries.has(key)) {
            const created = createEntry({
              exclusionId: `EXC-LEGACY-${text(legacy.id, 300)}`,
              subjectType: "legacy_facility",
              canonicalName: legacy.name,
              department: legacy.department,
              locality: legacy.locality,
              status: "known_legacy",
              reason: "Fila existente en la app sin correspondencia oficial única revisada.",
            });
            created.lifecycle_status = "known_unconfirmed_current";
            knownEntries.set(key, created);
          }
          return knownEntries.get(key);
        })();
    const sourceId = `legacy:${legacy.id}`;
    entry.legacy_residencial_ids.push(String(legacy.id));
    if (mapping?.facility_key) entry.external_ids.push({ provider: "normalized_facility_key", external_id: mapping.facility_key, external_url: null, source_ids: [sourceId] });
    addName(entry, legacy.name, "alias", [sourceId]);
    mergeAddresses(entry, [entryAddress(legacy.address, legacy, { sourceIds: [sourceId] })]);
    const latitude = coordinate(legacy.lat, -90, 90);
    const longitude = coordinate(legacy.lng, -180, 180);
    if (latitude !== null && longitude !== null) entry.coordinates.push({ lat: latitude, lng: longitude, method: legacy.precision || "legacy_source", source_ids: [sourceId] });
    mergeSources(entry, [sourceRecord({
      sourceType: "legacy_app_export",
      referenceKey: sourceId,
      retrievedAt: remoteMeta.retrievedAt,
      reliability: "operational_snapshot",
    })]);
    if (linkedEntries.length > 1) addConflict(entry, conflicts, "legacy_multiple_official_links", "El mapping legado refiere más de una entidad oficial; se conservó como entrada separada.", { sourceIds: [sourceId] });
  }

  for (const candidate of legacySnapshot.candidates || []) {
    const key = text(candidate.candidate_key, 360);
    if (!key) continue;
    const entry = candidateEntry(candidateEntries, key, {
      name: candidate.normalized_name,
      department: candidate.normalized_department,
      locality: candidate.normalized_locality,
      status: candidate.status,
    });
    const sourceIds = [`candidate:${candidate.id}`];
    attachCandidateDetails(entry, {
      name: candidate.normalized_name,
      department: candidate.normalized_department,
      locality: candidate.normalized_locality,
      address: candidate.normalized_address,
      latitude: candidate.lat,
      longitude: candidate.lng,
      matchStatus: candidate.status,
      sourceIds,
    }, conflicts);
    mergeSources(entry, [sourceRecord({
      sourceType: "private_candidate",
      referenceKey: key,
      retrievedAt: remoteMeta.retrievedAt,
      reliability: "private_candidate_lead",
    })]);
  }

  for (const candidate of osmReview.candidates || []) {
    const key = text(candidate.candidateKey, 360);
    if (!key) continue;
    const entry = candidateEntry(candidateEntries, key, {
      name: candidate.name,
      department: candidate.department,
      locality: candidate.locality,
      status: candidate.matchStatus,
    });
    attachCandidateDetails(entry, {
      name: candidate.name,
      aliases: candidate.aliases,
      department: candidate.department,
      locality: candidate.locality,
      address: candidate.address,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      externalId: candidate.source?.externalId,
      externalUrl: candidate.source?.externalUrl,
      provider: "openstreetmap",
      matchStatus: candidate.matchStatus,
      sourceIds: [`osm-review:${key}`],
    }, conflicts);
    mergeSources(entry, [sourceRecord({
      sourceType: "openstreetmap",
      referenceKey: key,
      sourceUrl: candidate.source?.externalUrl,
      sourceDate: osmReview.metadata?.generatedAt,
      retrievedAt: osmReview.metadata?.generatedAt,
      reliability: "open_data_candidate",
    })]);
  }

  for (const candidate of osmDocument.candidates || []) {
    const key = exactCandidateKey("openstreetmap", candidate.sourceRecordKey) || exactCandidateKey("osm", candidate.externalId);
    if (!key) continue;
    const entry = candidateEntry(candidateEntries, key, {
      name: candidate.name,
      department: candidate.department,
      locality: candidate.locality,
      status: "unreviewed_candidate",
    });
    attachCandidateDetails(entry, {
      name: candidate.name,
      department: candidate.department,
      locality: candidate.locality,
      address: candidate.address,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      externalId: candidate.externalId,
      externalUrl: candidate.externalUrl,
      provider: "openstreetmap",
      sourceIds: [`osm:${candidate.sourceRecordKey}`],
    }, conflicts);
    mergeSources(entry, [candidateSource("openstreetmap", candidate, candidate.retrievedAt)]);
  }

  for (const candidate of paysanduDocument.records || []) {
    const key = text(candidate.candidate_key, 360);
    if (!key) continue;
    const entry = candidateEntry(candidateEntries, key, {
      name: candidate.observed_name,
      department: candidate.department,
      locality: candidate.locality,
      status: candidate.review_status || "unreviewed_candidate",
    });
    attachCandidateDetails(entry, {
      name: candidate.observed_name,
      department: candidate.department,
      locality: candidate.locality,
      address: candidate.address,
      socialUrl: candidate.instagram_url,
      sourceIds: [`paysandu:${key}`],
    }, conflicts);
    mergeSources(entry, [candidateSource("social_public_url", candidate, paysanduDocument.generated_at)]);
    addConflict(entry, conflicts, "social_phone_not_retained_privacy_guard", "Los teléfonos de la investigación social no se copian al índice hasta que una revisión humana los clasifique como contacto institucional.", {
      requiresHumanReview: false,
      sourceIds: [`paysandu:${key}`],
    });
  }

  for (const candidate of artigasDocument.records || []) {
    const key = text(candidate.candidate_key, 360);
    if (!key) continue;
    const entry = candidateEntry(candidateEntries, key, {
      name: candidate.observed_name,
      department: candidate.department,
      locality: candidate.locality,
      status: candidate.review_status || "unreviewed_candidate",
    });
    attachCandidateDetails(entry, {
      name: candidate.observed_name,
      aliases: candidate.aliases,
      department: candidate.department,
      locality: candidate.locality,
      address: candidate.address,
      addressPrecision: candidate.address_precision,
      socialUrl: candidate.instagram_url || candidate.facebook_url,
      sourceIds: [`artigas:${key}`],
    }, conflicts);
    mergeField(entry, "social_urls", urlList(candidate.facebook_url));
    mergeSources(entry, [candidateSource("social_public_url", candidate, artigasDocument.generated_at)]);
    if (candidate.address_precision && candidate.address_precision !== "exact") {
      addConflict(entry, conflicts, "candidate_non_exact_address", `Precisión de dirección: ${text(candidate.address_precision, 120)}.`, { sourceIds: [`artigas:${key}`] });
    }
    addConflict(entry, conflicts, "social_phone_not_retained_privacy_guard", "Los teléfonos de la investigación social no se copian al índice hasta que una revisión humana los clasifique como contacto institucional.", {
      requiresHumanReview: false,
      sourceIds: [`artigas:${key}`],
    });
  }

  for (const externalId of legacySnapshot.externalIds || []) {
    const target = externalId.candidate_id
      ? [...candidateEntries.values()].find((entry) => entry.sources.some((source) => source.reference_key === `candidate:${externalId.candidate_id}`))
      : [...knownEntries.values()].find((entry) => entry.legacy_residencial_ids.includes(String(externalId.residencial_id)));
    if (!target || !text(externalId.external_id)) continue;
    target.external_ids.push({
      provider: text(externalId.provider, 80) || "other",
      external_id: text(externalId.external_id, 360),
      external_url: validUrl(externalId.external_url),
      source_ids: [`external-id:${externalId.id}`],
    });
  }

  for (const row of csvRows(backfillConflicts)) {
    const entity = officialEntryByEntityId.get(String(row.official_entity_id));
    const entry = entity || [...knownEntries.values()].find((value) => value.legacy_residencial_ids.includes(String(row.legacy_residencial_id)));
    if (entry) addConflict(entry, conflicts, text(row.conflict_type, 120) || "backfill_conflict", row.detail, { requiresHumanReview: String(row.requires_human_review) === "true" });
  }

  const entries = [...knownEntries.values(), ...candidateEntries.values()]
    .map(finaliseEntry)
    .sort((a, b) => a.exclusion_id.localeCompare(b.exclusion_id));

  const index = {
    metadata: {
      schema_version: 1,
      generated_at: generatedAt,
      scope: "Índice nacional provisional de exclusión; privado y no publicable por sí mismo.",
      supabase_access: "read_only_operational_snapshot_plus_legacy_to_canonical_mapping",
      automatic_publication: false,
      merge_policy: "Solo IDs, mappings y agrupaciones revisadas explícitamente; nunca nombre solo.",
      privacy_policy: "No incluye teléfonos de investigación social ni datos de residentes, denuncias o salud.",
      inputs: inputManifest,
      pdf: {
        visual_reviewed: pdfVisualReviewed,
        ...pdfSummary,
      },
    },
    entries,
  };
  return { index, conflicts };
}

export function validateKnownFacilitiesExclusionIndex(index, conflicts) {
  const errors = [];
  if (!index || !Array.isArray(index.entries)) errors.push("El índice no contiene entries.");
  const ids = new Set();
  for (const entry of index.entries || []) {
    if (!entry.exclusion_id || ids.has(entry.exclusion_id)) errors.push(`exclusion_id duplicado o vacío: ${entry.exclusion_id || "(vacío)"}`);
    ids.add(entry.exclusion_id);
    if (!entry.sources?.length) errors.push(`${entry.exclusion_id}: sin procedencia.`);
    if (entry.private_only !== true) errors.push(`${entry.exclusion_id}: debe permanecer privado.`);
    if (entry.subject_type === "private_candidate" && entry.review_status === "public_approved") errors.push(`${entry.exclusion_id}: candidato publicado indebidamente.`);
  }
  const departments = {};
  for (const entry of index.entries || []) {
    const department = entry.department || "Sin departamento";
    departments[department] = (departments[department] || 0) + 1;
  }
  return {
    valid: errors.length === 0,
    errors,
    counts: {
      entries: index.entries?.length || 0,
      known_facilities: index.entries?.filter((entry) => entry.subject_type !== "private_candidate").length || 0,
      private_candidates: index.entries?.filter((entry) => entry.subject_type === "private_candidate").length || 0,
      conflicts: conflicts.length,
      departments,
    },
  };
}

export function conflictsToCsv(conflicts) {
  const header = ["conflict_id", "exclusion_id", "conflict_type", "department", "detail", "source_ids", "requires_human_review"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `${[header, ...conflicts.map((conflict) => [
    conflict.conflict_id,
    conflict.exclusion_id,
    conflict.conflict_type,
    conflict.department,
    conflict.detail,
    conflict.source_ids.join("|"),
    conflict.requires_human_review,
  ])].map((row) => row.map(escape).join(",")).join("\n")}\n`;
}
