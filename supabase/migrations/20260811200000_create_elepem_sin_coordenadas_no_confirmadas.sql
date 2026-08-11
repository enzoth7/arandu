-- Migration: Create and populate elepem_sin_coordenadas_no_confirmadas
-- Residencias con situación no confirmada y sin coordenadas claras (71 registros)

CREATE TABLE IF NOT EXISTS public.elepem_sin_coordenadas_no_confirmadas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id bigint NOT NULL,
  candidate_key text NOT NULL UNIQUE,
  status text NOT NULL,
  name text NOT NULL,
  department text,
  locality text,
  address text,
  lat double precision,
  lng double precision,
  best_match_residencial_id text,
  best_match_score numeric,
  evidence_tier text NOT NULL,
  human_reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  public_eligible boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_facility_id bigint,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.elepem_sin_coordenadas_no_confirmadas IS 'Residencias ELEPEM con situación no confirmada y sin coordenadas claras extraídas del padrón de descubrimiento.';

ALTER TABLE public.elepem_sin_coordenadas_no_confirmadas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'elepem_sin_coordenadas_no_confirmadas'
      AND policyname = 'Allow read access for authenticated and service_role'
  ) THEN
    CREATE POLICY "Allow read access for authenticated and service_role"
      ON public.elepem_sin_coordenadas_no_confirmadas
      FOR SELECT
      TO authenticated, service_role
      USING (true);
  END IF;
END $$;

INSERT INTO public.elepem_sin_coordenadas_no_confirmadas (
  candidate_id,
  candidate_key,
  status,
  name,
  department,
  locality,
  address,
  lat,
  lng,
  best_match_residencial_id,
  best_match_score,
  evidence_tier,
  human_reviewed,
  reviewed_at,
  reviewed_by,
  review_note,
  public_eligible,
  first_seen_at,
  last_seen_at,
  created_at,
  updated_at,
  resolved_facility_id,
  sources
)
SELECT
  candidate.id AS candidate_id,
  candidate.candidate_key,
  candidate.status,
  candidate.normalized_name AS name,
  candidate.normalized_department AS department,
  candidate.normalized_locality AS locality,
  candidate.normalized_address AS address,
  candidate.lat,
  candidate.lng,
  candidate.best_match_residencial_id,
  candidate.best_match_score,
  candidate.evidence_tier,
  candidate.human_reviewed,
  candidate.reviewed_at,
  candidate.reviewed_by,
  candidate.review_note,
  candidate.public_eligible,
  candidate.first_seen_at,
  candidate.last_seen_at,
  candidate.created_at,
  candidate.updated_at,
  candidate.resolved_facility_id,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'sourceType', observation.source_type,
        'sourceRecordKey', observation.source_record_key,
        'sourceUrl', observation.source_url,
        'retrievedAt', observation.retrieved_at,
        'sourceDate', observation.source_date,
        'sourceLicense', observation.source_license,
        'observedName', observation.normalized_name,
        'observedAddress', observation.normalized_address,
        'evidenceRole', candidate_source.evidence_role
      ) ORDER BY observation.retrieved_at DESC, observation.id DESC
    )
    FROM discovery_private.facility_candidate_sources AS candidate_source
    JOIN discovery_private.facility_source_observations AS observation
      ON observation.id = candidate_source.observation_id
    WHERE candidate_source.candidate_id = candidate.id
  ), '[]'::jsonb) AS sources
FROM discovery_private.facility_candidates AS candidate
WHERE candidate.status NOT IN ('verified_new', 'verified_match', 'duplicate', 'rejected', 'closed')
  AND (candidate.lat IS NULL OR candidate.lng IS NULL)
ON CONFLICT (candidate_key) DO UPDATE SET
  status = EXCLUDED.status,
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  locality = EXCLUDED.locality,
  address = EXCLUDED.address,
  updated_at = EXCLUDED.updated_at;
