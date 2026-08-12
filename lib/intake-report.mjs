import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_INTAKE_REQUEST_BYTES = 32_768;
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 5;
export const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;
export const UPLOAD_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/3gpp",
  "audio/3gpp2",
]);

export const EVIDENCE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/aac": "aac",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/3gpp": "3gp",
  "audio/3gpp2": "3g2",
};

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function intakeText(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function intakeTextList(value, maxItems = 24, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => intakeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function optionalText(value, maxLength = 240) {
  return intakeText(value, maxLength) || null;
}

function email(value) {
  const normalized = intakeText(value, 254).toLowerCase();
  if (!normalized) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function phone(value) {
  const normalized = intakeText(value, 24);
  if (!normalized) return null;
  return /^[+()0-9\s.-]{6,24}$/.test(normalized) ? normalized : null;
}

export function buildReportPayload(value, options = {}) {
  if (!isRecord(value)) return null;

  const source = options.source === "whatsapp_sandbox" ? "whatsapp_sandbox" : "web";
  const setting = intakeText(value.setting);
  const reporter = intakeText(value.reporter);
  const reporterName = optionalText(value.reporterName, 160);
  const location = isRecord(value.location) ? value.location : {};
  const facility = isRecord(value.facility) ? value.facility : {};
  const preliminaryPriority = intakeText(value.preliminaryPriority, 32);
  const department = intakeText(location.department, 100);
  const locationReference = intakeText(location.reference, 500);
  const selectedConcerns = intakeTextList(value.concerns);
  const narrative = intakeText(value.narrative, 6_000);
  const risks = intakeTextList(value.risks);
  const privacy = intakeText(value.privacy, 80);
  const submittedEmail = email(value.contactEmail);
  const submittedPhone = phone(value.contactPhone);

  const isWeb = source === "web";
  const facilityId = optionalText(facility.id, 100);
  const hasSituationInformation = Boolean(setting || selectedConcerns.length || narrative);
  if (!hasSituationInformation && !isWeb) return null;
  if (!department || !locationReference) return null;
  if (isWeb && (setting !== "En un residencial / ELEPEM" || !facilityId || value.consent !== true)) return null;
  if (!isWeb && (!reporter || !privacy)) return null;
  if (intakeText(value.contactEmail, 254) && !submittedEmail) return null;
  if (intakeText(value.contactPhone, 24) && !submittedPhone) return null;

  if (source === "whatsapp_sandbox") {
    if (setting !== "En un residencial / ELEPEM") return null;
    if (!options.isSandbox || !["Confidencial", "Con identidad registrada"].includes(privacy)) return null;
  }

  return {
    version: source === "whatsapp_sandbox" ? 2 : 1,
    submittedAt: options.now instanceof Date ? options.now.toISOString() : new Date().toISOString(),
    source,
    isSandbox: source === "whatsapp_sandbox",
    setting: setting || "No indicado",
    reporter: reporter || "No indicado",
    reporterName,
    channel: optionalText(value.channel),
    ageRange: optionalText(value.ageRange),
    dependency: optionalText(value.dependency),
    livingWith: optionalText(value.livingWith),
    needs: intakeTextList(value.needs),
    otherNeed: optionalText(value.otherNeed, 500),
    requestAssessment: value.requestAssessment === true,
    location: {
      department,
      reference: locationReference,
      privateAddress: optionalText(location.privateAddress, 500),
      unknownArea: optionalText(location.unknownArea, 300),
      unknownAddress: optionalText(location.unknownAddress, 500),
      unknownNote: optionalText(location.unknownNote, 1_000),
    },
    facility: {
      id: facilityId,
      name: optionalText(facility.name, 300),
      address: optionalText(facility.address, 500),
      locality: optionalText(facility.locality, 200),
      department: optionalText(facility.department, 100),
      searchStatus: optionalText(facility.searchStatus, 200),
    },
    concerns: selectedConcerns.length ? selectedConcerns : ["No indicada"],
    allegedRelation: optionalText(value.allegedRelation),
    narrative: narrative || "Sin relato adicional.",
    risks: risks.length ? risks : ["No especificado"],
    privacy: privacy || "Anónima",
    contactEmail: submittedEmail,
    contactPhone: submittedPhone,
    contactMethod: optionalText(value.contactMethod, 120),
    safeContact: optionalText(value.safeContact, 1_000),
    noEarlyContact: value.noEarlyContact === true,
    preliminaryPriority: ["Alta", "Media", "Baja"].includes(preliminaryPriority) ? preliminaryPriority : "Baja",
    suggestedRoute: intakeTextList(value.suggestedRoute, 12),
  };
}

export function newCaseCode(now = new Date(), randomBytes = crypto.getRandomValues(new Uint8Array(4))) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `AM-${date}-${suffix}`;
}

export function newUploadToken(randomBytes = crypto.getRandomValues(new Uint8Array(24))) {
  return Buffer.from(randomBytes).toString("base64url");
}

export function cleanEvidenceFileName(value) {
  const normalized = String(value || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (normalized || "archivo").slice(0, 240);
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sameSecret(left, right) {
  const leftDigest = createHash("sha256").update(String(left || "")).digest();
  const rightDigest = createHash("sha256").update(String(right || "")).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function startsWithBytes(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

export function evidenceSignatureMatches(bufferValue, mimeType) {
  const buffer = Buffer.isBuffer(bufferValue) ? bufferValue : Buffer.from(bufferValue);
  const type = String(mimeType || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(type) || buffer.length === 0) return false;
  if (type === "image/jpeg") return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
  if (type === "image/png") return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (["image/heic", "image/heif", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/3gpp", "audio/3gpp2"].includes(type)) {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "application/msword") return startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]);
  if (type === "audio/webm") return startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  if (type === "audio/ogg") return buffer.subarray(0, 4).toString("ascii") === "OggS";
  if (type === "audio/wav") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
  if (["audio/mpeg", "audio/mp3"].includes(type)) return buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (type === "audio/aac") return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  if (type === "text/plain") return !buffer.subarray(0, Math.min(buffer.length, 4_096)).includes(0);
  return false;
}
