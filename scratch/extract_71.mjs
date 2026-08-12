import { querySupabaseDatabase } from "../lib/supabase-db.js";
import { loadManualDiscoveryPilot } from "../lib/manual-discovery-pilot.mjs";
import { buildPrivateCandidateLayer } from "../lib/private-candidate-layer.mjs";

async function main() {
  const databaseCandidates = await querySupabaseDatabase(`
    select
      candidate.id::text,
      candidate.candidate_key,
      candidate.status,
      candidate.normalized_name as name,
      candidate.normalized_department as department,
      candidate.normalized_locality as locality,
      candidate.normalized_address as address,
      candidate.lat as latitude,
      candidate.lng as longitude,
      candidate.best_match_residencial_id,
      candidate.best_match_score,
      candidate.evidence_tier,
      candidate.human_reviewed,
      candidate.reviewed_at,
      candidate.reviewed_by,
      candidate.review_note,
      candidate.public_eligible,
      candidate.first_seen_at,
      candidate.last_seen_at
    from discovery_private.facility_candidates as candidate
    where true
    order by candidate.id
  `);

  const manualPilot = await loadManualDiscoveryPilot(process.cwd());
  const layer = buildPrivateCandidateLayer(databaseCandidates, manualPilot.candidates);

  const excludedStatuses = new Set(["verified_new", "verified_match", "duplicate", "rejected", "closed"]);

  const unconfirmedNoCoordinates = layer.summary.queueCandidates.filter((candidate) => {
    if (excludedStatuses.has(candidate.status)) return false;
    return !candidate.hasCoordinates;
  });

  console.log(`Total queueCandidates: ${layer.summary.queueCandidates.length}`);
  console.log(`Total 'Sin coordenadas claras' (unconfirmed): ${unconfirmedNoCoordinates.length}`);

  if (unconfirmedNoCoordinates.length > 0) {
    console.log("Sample candidate 0:", JSON.stringify(unconfirmedNoCoordinates[0], null, 2));
  }
}

main().catch(console.error);
