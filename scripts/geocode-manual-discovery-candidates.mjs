import { loadManualDiscoveryPilot } from "../lib/manual-discovery-pilot.mjs";
import { discoveryPath, parseArgs, uruguayDateStamp, writeJsonAtomically } from "./lib/discovery-files.mjs";
import { ideQueryUrl, selectStrictIdeResult } from "./lib/ide-geocoding.mjs";

const USER_AGENT = "AranduDiscovery/1.0 (controlled IDE Uruguay geocoding; contacto: equipo@arandu.local)";

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error(`IDE respondió HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    } finally { clearTimeout(timeout); }
  }
  throw lastError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.live !== true || args["acknowledge-ide"] !== true) throw new Error("Uso: --live --acknowledge-ide [--output <archivo.json>].");
  const pilot = await loadManualDiscoveryPilot(process.cwd());
  const candidates = pilot.candidates.filter((candidate) => candidate.address && !candidate.historical);
  const results = [];
  for (const candidate of candidates) {
    const sourceUrl = ideQueryUrl(candidate);
    try {
      const response = await fetchJson(sourceUrl);
      const match = selectStrictIdeResult(response, candidate);
      results.push({ candidateKey: candidate.candidateKey, name: candidate.name, department: candidate.department, locality: candidate.locality, address: candidate.address, sourceType: "ide_uy", sourceUrl, retrievedAt: new Date().toISOString(), sourceLicense: "IDE Uruguay API", status: match ? "exact" : "needs_review", latitude: match?.puntoY ?? null, longitude: match?.puntoX ?? null, responseError: match ? null : "No hubo coincidencia exacta de puerta/localidad/departamento." });
    } catch (error) { results.push({ candidateKey: candidate.candidateKey, name: candidate.name, department: candidate.department, locality: candidate.locality, address: candidate.address, sourceType: "ide_uy", sourceUrl, retrievedAt: new Date().toISOString(), sourceLicense: "IDE Uruguay API", status: "error", latitude: null, longitude: null, responseError: error instanceof Error ? error.message : "Error desconocido" }); }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const report = { metadata: { generatedAt: new Date().toISOString(), source: "IDE Uruguay", sourceBaseUrl: "https://direcciones.ide.uy", publicResidencialesWrites: 0, automaticPublication: false }, summary: { queried: results.length, exact: results.filter((item) => item.status === "exact").length, needsReview: results.filter((item) => item.status === "needs_review").length, errors: results.filter((item) => item.status === "error").length }, results };
  const output = discoveryPath(args.output, `manual-ide-geocoding-${uruguayDateStamp()}.json`);
  await writeJsonAtomically(output, report, { overwrite: true });
  console.log(JSON.stringify({ output, ...report.summary }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
