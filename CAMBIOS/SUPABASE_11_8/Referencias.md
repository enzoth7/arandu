# COLORES

## AZUL
Schema = public

## ROJO
Schema = elepem_core

## AMARILLO
Schema = discovery_private

#  SQL

## AZUL

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.intake_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_code text NOT NULL UNIQUE CHECK (case_code ~ '^AM-[0-9]{8}-[A-F0-9]{8}$'::text),
  source text NOT NULL DEFAULT 'web'::text CHECK (source = 'web'::text),
  priority text NOT NULL CHECK (priority = ANY (ARRAY['Alta'::text, 'Media'::text, 'Baja'::text])),
  department text CHECK (department IS NULL OR char_length(department) <= 100),
  report_payload jsonb NOT NULL CHECK (jsonb_typeof(report_payload) = 'object'::text AND octet_length(report_payload::text) <= 32768),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  current_status text NOT NULL DEFAULT 'received'::text CHECK (current_status = ANY (ARRAY['received'::text, 'triage'::text, 'in_review'::text, 'contact'::text, 'referred'::text, 'resolved'::text, 'closed'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  entry_type text NOT NULL DEFAULT 'concern'::text CHECK (entry_type = ANY (ARRAY['concern'::text, 'experience'::text, 'facility_change'::text])),
  is_demo boolean NOT NULL DEFAULT false,
  demo_facility_id text CHECK (demo_facility_id IS NULL OR demo_facility_id ~ '^DEMO-ELEPEM-00[1-3]$'::text),
  payload_version integer NOT NULL DEFAULT 1 CHECK (payload_version >= 1 AND payload_version <= 20),
  submitted_actor text NOT NULL DEFAULT 'public'::text CHECK (submitted_actor = ANY (ARRAY['public'::text, 'system'::text, 'state'::text, 'facility'::text])),
  facility_id bigint,
  CONSTRAINT intake_reports_pkey PRIMARY KEY (id),
  CONSTRAINT intake_reports_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE public.residenciales (
  id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  department text NOT NULL CHECK (char_length(department) >= 1 AND char_length(department) <= 100),
  locality text NOT NULL CHECK (char_length(locality) >= 1 AND char_length(locality) <= 120),
  address text NOT NULL CHECK (char_length(address) >= 1 AND char_length(address) <= 300),
  places integer CHECK (places IS NULL OR places >= 0),
  lat double precision NOT NULL CHECK (lat >= '-90'::integer::double precision AND lat <= 90::double precision),
  lng double precision NOT NULL CHECK (lng >= '-180'::integer::double precision AND lng <= 180::double precision),
  precision text NOT NULL CHECK ("precision" = ANY (ARRAY['puerta'::text, 'calle'::text, 'referencial'::text])),
  precision_label text NOT NULL CHECK (char_length(precision_label) >= 1 AND char_length(precision_label) <= 160),
  status_group text NOT NULL CHECK (status_group = ANY (ARRAY['habilitado'::text, 'registro'::text, 'verificar'::text, 'app'::text])),
  status_stage text NOT NULL CHECK (char_length(status_stage) >= 1 AND char_length(status_stage) <= 120),
  status_short text NOT NULL CHECK (char_length(status_short) >= 1 AND char_length(status_short) <= 200),
  source_label text NOT NULL CHECK (char_length(source_label) >= 1 AND char_length(source_label) <= 240),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  msp_final boolean NOT NULL DEFAULT false,
  msp_registro_historico boolean NOT NULL DEFAULT false,
  mides_social boolean NOT NULL DEFAULT false,
  pacp boolean NOT NULL DEFAULT false,
  other_source boolean NOT NULL DEFAULT false,
  CONSTRAINT residenciales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.intake_report_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['received'::text, 'triage'::text, 'in_review'::text, 'contact'::text, 'referred'::text, 'resolved'::text, 'closed'::text])),
  public_title text NOT NULL CHECK (char_length(public_title) >= 1 AND char_length(public_title) <= 120),
  public_description text NOT NULL CHECK (char_length(public_description) >= 1 AND char_length(public_description) <= 500),
  internal_note text CHECK (internal_note IS NULL OR char_length(internal_note) <= 4000),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_data) = 'object'::text AND octet_length(event_data::text) <= 8192),
  actor text NOT NULL DEFAULT 'system'::text CHECK (actor = ANY (ARRAY['system'::text, 'state'::text, 'facility'::text, 'organization'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT intake_report_events_pkey PRIMARY KEY (id),
  CONSTRAINT intake_report_events_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.intake_reports(id)
);
CREATE TABLE public.intake_report_attachments (
  id uuid NOT NULL,
  report_id uuid NOT NULL,
  bucket_id text NOT NULL DEFAULT 'intake-evidence'::text CHECK (bucket_id = 'intake-evidence'::text),
  object_path text NOT NULL UNIQUE CHECK (char_length(object_path) >= 1 AND char_length(object_path) <= 500),
  file_name text NOT NULL CHECK (char_length(file_name) >= 1 AND char_length(file_name) <= 240),
  mime_type text NOT NULL CHECK (char_length(mime_type) >= 1 AND char_length(mime_type) <= 160),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 1 AND size_bytes <= 10485760),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  purpose text NOT NULL DEFAULT 'evidence'::text CHECK (purpose = ANY (ARRAY['evidence'::text, 'audio'::text, 'facility_photo'::text, 'supporting_document'::text])),
  rights_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(rights_metadata) = 'object'::text AND octet_length(rights_metadata::text) <= 8192),
  CONSTRAINT intake_report_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT intake_report_attachments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.intake_reports(id)
);
CREATE TABLE public.intake_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = 'tracking_code_email'::text),
  provider_message_id text CHECK (provider_message_id IS NULL OR char_length(provider_message_id) <= 240),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT intake_notification_log_pkey PRIMARY KEY (id),
  CONSTRAINT intake_notification_log_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.intake_reports(id)
);
CREATE TABLE public.residencial_discovery_candidates (
  id text NOT NULL CHECK (id ~ '^RDC-[a-f0-9]{16}$'::text),
  sources ARRAY NOT NULL CHECK (sources <@ ARRAY['openstreetmap'::text, 'google_places'::text, 'apify'::text, 'serpapi'::text] AND cardinality(sources) > 0),
  origins jsonb NOT NULL CHECK (jsonb_typeof(origins) = 'array'::text),
  google_place_ids ARRAY NOT NULL DEFAULT '{}'::text[],
  name text CHECK (name IS NULL OR char_length(name) >= 1 AND char_length(name) <= 240),
  department text CHECK (department IS NULL OR char_length(department) >= 1 AND char_length(department) <= 100),
  locality text CHECK (locality IS NULL OR char_length(locality) >= 1 AND char_length(locality) <= 160),
  address text CHECK (address IS NULL OR char_length(address) >= 1 AND char_length(address) <= 400),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 120),
  website_url text CHECK (website_url IS NULL OR char_length(website_url) <= 1000),
  lat double precision CHECK (lat IS NULL OR lat >= '-90'::integer::double precision AND lat <= 90::double precision),
  lng double precision CHECK (lng IS NULL OR lng >= '-180'::integer::double precision AND lng <= 180::double precision),
  operational_status text CHECK (operational_status IS NULL OR char_length(operational_status) <= 80),
  storage_policy text NOT NULL CHECK (storage_policy = ANY (ARRAY['open_data'::text, 'google_place_id_only'::text, 'internal_contract_risk'::text])),
  match_status text NOT NULL CHECK (match_status = ANY (ARRAY['probable_match'::text, 'possible_match'::text, 'new_candidate'::text])),
  suggested_residencial_id text,
  confidence numeric NOT NULL CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
  match_reasons ARRAY NOT NULL DEFAULT '{}'::text[],
  alternative_matches jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(alternative_matches) = 'array'::text),
  review_status text NOT NULL DEFAULT 'pending'::text CHECK (review_status = ANY (ARRAY['pending'::text, 'matched'::text, 'approved_new'::text, 'rejected'::text])),
  reviewed_at timestamp with time zone,
  reviewed_by text CHECK (reviewed_by IS NULL OR char_length(reviewed_by) <= 160),
  review_notes text CHECK (review_notes IS NULL OR char_length(review_notes) <= 4000),
  promoted_residencial_id text,
  first_seen_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone NOT NULL,
  run_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(run_metadata) = 'object'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT residencial_discovery_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT residencial_discovery_candidates_suggested_residencial_id_fkey FOREIGN KEY (suggested_residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT residencial_discovery_candidates_promoted_residencial_id_fkey FOREIGN KEY (promoted_residencial_id) REFERENCES public.residenciales(id)
);
CREATE TABLE public.intake_report_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  name text CHECK (name IS NULL OR char_length(name) >= 1 AND char_length(name) <= 160),
  phone text CHECK (phone IS NULL OR char_length(phone) >= 6 AND char_length(phone) <= 24),
  email text CHECK (email IS NULL OR char_length(email) >= 3 AND char_length(email) <= 254),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT intake_report_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT intake_report_contacts_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.intake_reports(id)
);
CREATE TABLE public.elepem_sin_coordenadas_no_confirmadas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
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
  reviewed_at timestamp with time zone,
  reviewed_by text,
  review_note text,
  public_eligible boolean NOT NULL DEFAULT false,
  first_seen_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_facility_id bigint,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT elepem_sin_coordenadas_no_confirmadas_pkey PRIMARY KEY (id)
);


## AMARILLO

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE discovery_private.facility_source_runs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  run_key text NOT NULL UNIQUE CHECK (char_length(run_key) >= 1 AND char_length(run_key) <= 200),
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['official'::text, 'openstreetmap'::text, 'public_directory'::text, 'facility_website'::text, 'news'::text, 'social_public_url'::text, 'manual_referral'::text, 'other'::text])),
  source_url text NOT NULL CHECK (char_length(source_url) <= 1000 AND source_url ~* '^https?://'::text),
  source_license text CHECK (source_license IS NULL OR char_length(source_license) <= 160),
  storage_policy text NOT NULL DEFAULT 'normalized_only'::text CHECK (storage_policy = ANY (ARRAY['reference_only'::text, 'normalized_only'::text, 'raw_metadata_permitted'::text])),
  status text NOT NULL DEFAULT 'running'::text CHECK (status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  observation_count integer NOT NULL DEFAULT 0 CHECK (observation_count >= 0),
  error_summary text CHECK (error_summary IS NULL OR char_length(error_summary) <= 2000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source_catalog_id bigint,
  CONSTRAINT facility_source_runs_pkey PRIMARY KEY (id),
  CONSTRAINT facility_source_runs_source_catalog_id_fkey FOREIGN KEY (source_catalog_id) REFERENCES elepem_core.source_catalog(id)
);
CREATE TABLE discovery_private.facility_source_observations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  run_id bigint NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['official'::text, 'openstreetmap'::text, 'public_directory'::text, 'facility_website'::text, 'news'::text, 'social_public_url'::text, 'manual_referral'::text, 'other'::text])),
  source_record_key text NOT NULL CHECK (char_length(source_record_key) >= 1 AND char_length(source_record_key) <= 300),
  source_url text NOT NULL CHECK (char_length(source_url) <= 1000 AND source_url ~* '^https?://'::text),
  retrieved_at timestamp with time zone NOT NULL,
  source_date date,
  source_license text CHECK (source_license IS NULL OR char_length(source_license) <= 160),
  storage_policy text NOT NULL DEFAULT 'normalized_only'::text CHECK (storage_policy = ANY (ARRAY['reference_only'::text, 'normalized_only'::text, 'raw_metadata_permitted'::text])),
  normalized_name text CHECK (normalized_name IS NULL OR char_length(normalized_name) >= 1 AND char_length(normalized_name) <= 300),
  normalized_department text CHECK (normalized_department IS NULL OR char_length(normalized_department) >= 1 AND char_length(normalized_department) <= 100),
  normalized_locality text CHECK (normalized_locality IS NULL OR char_length(normalized_locality) >= 1 AND char_length(normalized_locality) <= 160),
  normalized_address text CHECK (normalized_address IS NULL OR char_length(normalized_address) >= 1 AND char_length(normalized_address) <= 500),
  lat double precision CHECK (lat IS NULL OR lat >= '-90'::integer::double precision AND lat <= 90::double precision),
  lng double precision CHECK (lng IS NULL OR lng >= '-180'::integer::double precision AND lng <= 180::double precision),
  human_note text CHECK (human_note IS NULL OR char_length(human_note) <= 500),
  raw_metadata_storage_permitted boolean NOT NULL DEFAULT false,
  raw_metadata jsonb,
  record_hash text NOT NULL CHECK (record_hash ~ '^[a-f0-9]{64}$'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source_catalog_id bigint,
  CONSTRAINT facility_source_observations_pkey PRIMARY KEY (id),
  CONSTRAINT facility_source_observations_run_source_fkey FOREIGN KEY (run_id) REFERENCES discovery_private.facility_source_runs(id),
  CONSTRAINT facility_source_observations_run_source_fkey FOREIGN KEY (source_type) REFERENCES discovery_private.facility_source_runs(source_type),
  CONSTRAINT facility_source_observations_source_catalog_id_fkey FOREIGN KEY (source_catalog_id) REFERENCES elepem_core.source_catalog(id)
);
CREATE TABLE discovery_private.facility_candidates (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidate_key text NOT NULL UNIQUE CHECK (char_length(candidate_key) >= 1 AND char_length(candidate_key) <= 360),
  status text NOT NULL DEFAULT 'discovered'::text CHECK (status = ANY (ARRAY['discovered'::text, 'possible_match'::text, 'needs_review'::text, 'verified_new'::text, 'verified_match'::text, 'rejected'::text, 'duplicate'::text, 'closed'::text])),
  normalized_name text NOT NULL CHECK (char_length(normalized_name) >= 1 AND char_length(normalized_name) <= 300),
  normalized_department text CHECK (normalized_department IS NULL OR char_length(normalized_department) >= 1 AND char_length(normalized_department) <= 100),
  normalized_locality text CHECK (normalized_locality IS NULL OR char_length(normalized_locality) >= 1 AND char_length(normalized_locality) <= 160),
  normalized_address text CHECK (normalized_address IS NULL OR char_length(normalized_address) >= 1 AND char_length(normalized_address) <= 500),
  lat double precision CHECK (lat IS NULL OR lat >= '-90'::integer::double precision AND lat <= 90::double precision),
  lng double precision CHECK (lng IS NULL OR lng >= '-180'::integer::double precision AND lng <= 180::double precision),
  best_match_residencial_id text,
  best_match_score numeric CHECK (best_match_score IS NULL OR best_match_score >= 0::numeric AND best_match_score <= 1::numeric),
  evidence_tier text NOT NULL DEFAULT 'C'::text CHECK (evidence_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])),
  human_reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamp with time zone,
  reviewed_by text CHECK (reviewed_by IS NULL OR char_length(reviewed_by) >= 1 AND char_length(reviewed_by) <= 200),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 2000),
  public_eligible boolean NOT NULL DEFAULT false,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_facility_id bigint,
  CONSTRAINT facility_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT facility_candidates_best_match_residencial_id_fkey FOREIGN KEY (best_match_residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT facility_candidates_resolved_facility_id_fkey FOREIGN KEY (resolved_facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE discovery_private.facility_candidate_sources (
  candidate_id bigint NOT NULL,
  observation_id bigint NOT NULL,
  evidence_role text NOT NULL DEFAULT 'lead'::text CHECK (evidence_role = ANY (ARRAY['lead'::text, 'evidence_a'::text, 'evidence_b'::text, 'context'::text, 'conflict'::text, 'duplicate'::text])),
  independence_key text CHECK (independence_key IS NULL OR char_length(independence_key) >= 1 AND char_length(independence_key) <= 200),
  link_method text NOT NULL DEFAULT 'automated'::text CHECK (link_method = ANY (ARRAY['automated'::text, 'human'::text])),
  linked_by text CHECK (linked_by IS NULL OR char_length(linked_by) >= 1 AND char_length(linked_by) <= 200),
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_candidate_sources_pkey PRIMARY KEY (candidate_id, observation_id),
  CONSTRAINT facility_candidate_sources_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES discovery_private.facility_candidates(id),
  CONSTRAINT facility_candidate_sources_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE discovery_private.facility_external_ids (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidate_id bigint,
  residencial_id text,
  observation_id bigint,
  provider text NOT NULL CHECK (provider = ANY (ARRAY['google_place'::text, 'openstreetmap'::text, 'ide_uy'::text, 'official'::text, 'other'::text])),
  external_id text NOT NULL CHECK (char_length(external_id) >= 1 AND char_length(external_id) <= 300),
  external_url text CHECK (external_url IS NULL OR char_length(external_url) <= 1000 AND external_url ~* '^https?://'::text),
  link_method text NOT NULL CHECK (link_method = ANY (ARRAY['manual'::text, 'official_import'::text, 'source_observation'::text])),
  linked_by text NOT NULL CHECK (char_length(linked_by) >= 1 AND char_length(linked_by) <= 200),
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  facility_id bigint,
  CONSTRAINT facility_external_ids_pkey PRIMARY KEY (id),
  CONSTRAINT facility_external_ids_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES discovery_private.facility_candidates(id),
  CONSTRAINT facility_external_ids_residencial_id_fkey FOREIGN KEY (residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT facility_external_ids_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id),
  CONSTRAINT facility_external_ids_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE discovery_private.facility_candidate_match_suggestions (
  candidate_id bigint NOT NULL,
  residencial_id text,
  rank smallint NOT NULL CHECK (rank >= 1 AND rank <= 3),
  score numeric NOT NULL CHECK (score >= 0::numeric AND score <= 1::numeric),
  components jsonb NOT NULL CHECK (jsonb_typeof(components) = 'object'::text AND octet_length(components::text) <= 16384),
  generated_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  facility_id bigint,
  CONSTRAINT facility_candidate_match_suggestions_pkey PRIMARY KEY (candidate_id, rank),
  CONSTRAINT facility_candidate_match_suggestions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES discovery_private.facility_candidates(id),
  CONSTRAINT facility_candidate_match_suggestions_residencial_id_fkey FOREIGN KEY (residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT facility_candidate_match_suggestions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE discovery_private.facility_candidate_review_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  candidate_id bigint NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['verified_new'::text, 'verified_match'::text, 'duplicate'::text, 'rejected'::text, 'closed'::text, 'needs_more_evidence'::text])),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  previous_evidence_tier text NOT NULL CHECK (previous_evidence_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])),
  new_evidence_tier text NOT NULL CHECK (new_evidence_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])),
  matched_residencial_id text,
  reviewer_identifier text NOT NULL CHECK (char_length(reviewer_identifier) >= 1 AND char_length(reviewer_identifier) <= 200),
  review_note text NOT NULL CHECK (char_length(review_note) >= 3 AND char_length(review_note) <= 2000),
  corrections jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(corrections) = 'object'::text AND octet_length(corrections::text) <= 16384),
  candidate_before jsonb NOT NULL CHECK (jsonb_typeof(candidate_before) = 'object'::text AND octet_length(candidate_before::text) <= 32768),
  candidate_after jsonb NOT NULL CHECK (jsonb_typeof(candidate_after) = 'object'::text AND octet_length(candidate_after::text) <= 32768),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  matched_facility_id bigint,
  CONSTRAINT facility_candidate_review_events_pkey PRIMARY KEY (id),
  CONSTRAINT facility_candidate_review_events_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES discovery_private.facility_candidates(id),
  CONSTRAINT facility_candidate_review_events_matched_residencial_id_fkey FOREIGN KEY (matched_residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT facility_candidate_review_events_matched_facility_id_fkey FOREIGN KEY (matched_facility_id) REFERENCES elepem_core.facilities(id)
);

## ROJO

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE elepem_core.source_catalog (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  source_key text NOT NULL UNIQUE CHECK (char_length(source_key) >= 1 AND char_length(source_key) <= 200),
  display_name text NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 240),
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['official'::text, 'openstreetmap'::text, 'public_directory'::text, 'facility_website'::text, 'news'::text, 'social_public_url'::text, 'manual_referral'::text, 'legacy_app'::text, 'other'::text])),
  source_channel text NOT NULL CHECK (source_channel = ANY (ARRAY['official_sources'::text, 'public_maps'::text, 'public_social_sources'::text, 'other_public_sources'::text, 'manual_editorial'::text])),
  base_url text CHECK (base_url IS NULL OR char_length(base_url) <= 1000 AND base_url ~* '^https?://'::text),
  authority_level text NOT NULL DEFAULT 'lead'::text CHECK (authority_level = ANY (ARRAY['official_nominal'::text, 'independent_public'::text, 'lead'::text])),
  storage_policy text NOT NULL DEFAULT 'normalized_only'::text CHECK (storage_policy = ANY (ARRAY['reference_only'::text, 'normalized_only'::text, 'raw_metadata_permitted'::text])),
  source_license text CHECK (source_license IS NULL OR char_length(source_license) <= 160),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT source_catalog_pkey PRIMARY KEY (id)
);
CREATE TABLE elepem_core.organizations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  organization_key text NOT NULL UNIQUE CHECK (char_length(organization_key) >= 1 AND char_length(organization_key) <= 240),
  legal_name text NOT NULL CHECK (char_length(legal_name) >= 1 AND char_length(legal_name) <= 300),
  organization_type text NOT NULL DEFAULT 'unknown'::text CHECK (organization_type = ANY (ARRAY['company'::text, 'association'::text, 'foundation'::text, 'public_body'::text, 'person_sole_trader'::text, 'unknown'::text])),
  lifecycle_status text NOT NULL DEFAULT 'current'::text CHECK (lifecycle_status = ANY (ARRAY['current'::text, 'historical'::text, 'inactive'::text, 'unknown'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE elepem_core.facilities (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_key text NOT NULL UNIQUE CHECK (char_length(facility_key) >= 1 AND char_length(facility_key) <= 240),
  lifecycle_status text NOT NULL DEFAULT 'current'::text CHECK (lifecycle_status = ANY (ARRAY['current'::text, 'historical'::text, 'closed'::text, 'merged'::text, 'unknown'::text])),
  review_status text NOT NULL DEFAULT 'unreviewed'::text CHECK (review_status = ANY (ARRAY['unreviewed'::text, 'needs_review'::text, 'verified'::text, 'rejected'::text])),
  publication_status text NOT NULL DEFAULT 'private'::text CHECK (publication_status = ANY (ARRAY['private'::text, 'eligible'::text, 'approved'::text, 'withdrawn'::text])),
  merged_into_facility_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  identity_status text NOT NULL DEFAULT 'confirmed_facility'::text CHECK (identity_status = ANY (ARRAY['confirmed_facility'::text, 'pending_identity_review'::text, 'duplicate'::text, 'discarded'::text])),
  registry_visibility text NOT NULL DEFAULT 'held'::text CHECK (registry_visibility = ANY (ARRAY['public'::text, 'held'::text, 'held_identity'::text, 'held_location'::text, 'archived'::text])),
  location_status text NOT NULL DEFAULT 'location_pending'::text CHECK (location_status = ANY (ARRAY['mapped'::text, 'location_pending'::text, 'location_rejected'::text])),
  registry_msp_final boolean NOT NULL DEFAULT false,
  registry_mides_social boolean NOT NULL DEFAULT false,
  primary_source_label text CHECK (primary_source_label IS NULL OR char_length(primary_source_label) >= 1 AND char_length(primary_source_label) <= 200),
  primary_source_url text CHECK (primary_source_url IS NULL OR char_length(primary_source_url) <= 1000 AND primary_source_url ~* '^https?://'::text AND primary_source_url !~* '^https?://[^/]*supabase\.co(?:/|$)'::text),
  source_link_status text NOT NULL DEFAULT 'pending'::text CHECK (source_link_status = ANY (ARRAY['verified'::text, 'pending'::text, 'unavailable'::text])),
  demo_monthly_price_uyu integer,
  demo_price_as_of date,
  demo_price_includes ARRAY NOT NULL DEFAULT '{}'::text[],
  migration_payload jsonb CHECK (migration_payload IS NULL OR jsonb_typeof(migration_payload) = 'object'::text),
  origin_candidate_id bigint,
  administrative_status text DEFAULT
CASE
    WHEN registry_msp_final THEN 'msp_habilitado'::text
    WHEN registry_mides_social THEN 'mides_certificado'::text
    ELSE 'situacion_no_confirmada'::text
END,
  is_demo boolean NOT NULL DEFAULT false,
  CONSTRAINT facilities_pkey PRIMARY KEY (id),
  CONSTRAINT facilities_origin_candidate_id_fkey FOREIGN KEY (origin_candidate_id) REFERENCES discovery_private.facility_candidates(id),
  CONSTRAINT facilities_merged_into_facility_id_fkey FOREIGN KEY (merged_into_facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE elepem_core.facility_operators (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  organization_id bigint NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type = ANY (ARRAY['operator'::text, 'owner'::text, 'manager'::text, 'license_holder'::text, 'other'::text])),
  valid_from date,
  valid_to date,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_operators_pkey PRIMARY KEY (id),
  CONSTRAINT facility_operators_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_operators_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES elepem_core.organizations(id),
  CONSTRAINT facility_operators_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_names (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 300),
  normalized_name text NOT NULL CHECK (char_length(normalized_name) >= 1 AND char_length(normalized_name) <= 300),
  name_type text NOT NULL CHECK (name_type = ANY (ARRAY['canonical'::text, 'observed'::text, 'alias'::text, 'historical'::text, 'legal'::text])),
  valid_from date,
  valid_to date,
  is_preferred boolean NOT NULL DEFAULT false,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_names_pkey PRIMARY KEY (id),
  CONSTRAINT facility_names_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_names_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_addresses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  address_line text NOT NULL CHECK (char_length(address_line) >= 1 AND char_length(address_line) <= 500),
  normalized_address text NOT NULL CHECK (char_length(normalized_address) >= 1 AND char_length(normalized_address) <= 500),
  locality text NOT NULL CHECK (char_length(locality) >= 1 AND char_length(locality) <= 160),
  department text NOT NULL CHECK (char_length(department) >= 1 AND char_length(department) <= 100),
  postal_code text CHECK (postal_code IS NULL OR char_length(postal_code) <= 20),
  address_type text NOT NULL DEFAULT 'physical'::text CHECK (address_type = ANY (ARRAY['physical'::text, 'postal'::text, 'historical'::text])),
  valid_from date,
  valid_to date,
  is_current boolean NOT NULL DEFAULT true,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT facility_addresses_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_addresses_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_contacts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  contact_type text NOT NULL CHECK (contact_type = ANY (ARRAY['phone'::text, 'email'::text, 'website'::text])),
  contact_value text NOT NULL CHECK (char_length(contact_value) >= 1 AND char_length(contact_value) <= 500),
  normalized_value text NOT NULL CHECK (char_length(normalized_value) >= 1 AND char_length(normalized_value) <= 500),
  valid_from date,
  valid_to date,
  is_current boolean NOT NULL DEFAULT true,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT facility_contacts_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_contacts_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_social_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['instagram'::text, 'facebook'::text, 'other'::text])),
  public_url text NOT NULL CHECK (char_length(public_url) <= 1000 AND public_url ~* '^https?://'::text),
  checked_at timestamp with time zone NOT NULL,
  human_note text NOT NULL CHECK (char_length(human_note) >= 1 AND char_length(human_note) <= 500),
  valid_to date,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_social_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT facility_social_accounts_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_social_accounts_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_observation_links (
  facility_id bigint NOT NULL,
  observation_id bigint NOT NULL,
  evidence_role text NOT NULL DEFAULT 'context'::text CHECK (evidence_role = ANY (ARRAY['evidence_a'::text, 'evidence_b'::text, 'context'::text, 'conflict'::text, 'historical'::text])),
  independence_key text CHECK (independence_key IS NULL OR char_length(independence_key) >= 1 AND char_length(independence_key) <= 200),
  linked_by text NOT NULL CHECK (char_length(linked_by) >= 1 AND char_length(linked_by) <= 200),
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_observation_links_pkey PRIMARY KEY (facility_id, observation_id),
  CONSTRAINT facility_observation_links_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_observation_links_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_administrative_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  authority text NOT NULL CHECK (authority = ANY (ARRAY['MSP'::text, 'MIDES'::text, 'PACP'::text, 'OTHER'::text])),
  administrative_stage text NOT NULL CHECK (administrative_stage = ANY (ARRAY['authorization_final'::text, 'historical_registration'::text, 'social_certificate'::text, 'provider_registry'::text, 'other'::text])),
  status_label text NOT NULL CHECK (char_length(status_label) >= 1 AND char_length(status_label) <= 200),
  reference_code text CHECK (reference_code IS NULL OR char_length(reference_code) <= 200),
  effective_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  observation_id bigint NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_administrative_events_pkey PRIMARY KEY (id),
  CONSTRAINT facility_administrative_events_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_administrative_events_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_capacity_observations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  places integer NOT NULL CHECK (places >= 0),
  effective_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  observation_id bigint NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_capacity_observations_pkey PRIMARY KEY (id),
  CONSTRAINT facility_capacity_observations_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_capacity_observations_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_geocodes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  address_id bigint NOT NULL,
  provider text NOT NULL CHECK (provider = ANY (ARRAY['ide_uy'::text, 'manual'::text, 'legacy'::text])),
  query_original text CHECK (query_original IS NULL OR char_length(query_original) <= 1000),
  query_normalized text CHECK (query_normalized IS NULL OR char_length(query_normalized) <= 1000),
  lat double precision NOT NULL CHECK (lat >= '-90'::integer::double precision AND lat <= 90::double precision),
  lng double precision NOT NULL CHECK (lng >= '-180'::integer::double precision AND lng <= 180::double precision),
  precision text NOT NULL CHECK ("precision" = ANY (ARRAY['puerta'::text, 'calle'::text, 'referencial'::text])),
  precision_label text NOT NULL CHECK (char_length(precision_label) >= 1 AND char_length(precision_label) <= 160),
  confidence numeric CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric),
  provider_response jsonb CHECK (provider_response IS NULL OR jsonb_typeof(provider_response) = 'object'::text AND octet_length(provider_response::text) <= 262144),
  manually_corrected boolean NOT NULL DEFAULT false,
  reviewed_by text CHECK (reviewed_by IS NULL OR char_length(reviewed_by) >= 1 AND char_length(reviewed_by) <= 200),
  checked_at timestamp with time zone NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  observation_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_geocodes_pkey PRIMARY KEY (id),
  CONSTRAINT facility_geocodes_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id),
  CONSTRAINT facility_geocodes_address_id_fkey FOREIGN KEY (address_id) REFERENCES elepem_core.facility_addresses(id),
  CONSTRAINT facility_geocodes_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES discovery_private.facility_source_observations(id)
);
CREATE TABLE elepem_core.facility_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  facility_id bigint NOT NULL,
  review_type text NOT NULL CHECK (review_type = ANY (ARRAY['identity'::text, 'evidence'::text, 'publication'::text, 'correction'::text, 'closure'::text])),
  outcome text NOT NULL CHECK (outcome = ANY (ARRAY['verified'::text, 'needs_more_evidence'::text, 'rejected'::text, 'approve_publication'::text, 'withdraw_publication'::text])),
  evidence_tier text NOT NULL CHECK (evidence_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])),
  reviewer_identifier text NOT NULL CHECK (char_length(reviewer_identifier) >= 1 AND char_length(reviewer_identifier) <= 200),
  review_note text NOT NULL CHECK (char_length(review_note) >= 3 AND char_length(review_note) <= 2000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT facility_reviews_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE elepem_core.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entity_type text NOT NULL CHECK (char_length(entity_type) >= 1 AND char_length(entity_type) <= 100),
  entity_key text NOT NULL CHECK (char_length(entity_key) >= 1 AND char_length(entity_key) <= 300),
  action text NOT NULL CHECK (char_length(action) >= 1 AND char_length(action) <= 100),
  actor_identifier text NOT NULL CHECK (char_length(actor_identifier) >= 1 AND char_length(actor_identifier) <= 200),
  before_state jsonb CHECK (before_state IS NULL OR jsonb_typeof(before_state) = 'object'::text),
  after_state jsonb CHECK (after_state IS NULL OR jsonb_typeof(after_state) = 'object'::text),
  request_id text CHECK (request_id IS NULL OR char_length(request_id) <= 200),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE elepem_core.legacy_facility_map (
  legacy_residencial_id text NOT NULL,
  facility_id bigint,
  mapping_status text NOT NULL DEFAULT 'pending'::text CHECK (mapping_status = ANY (ARRAY['mapped'::text, 'pending'::text, 'conflict'::text, 'excluded'::text])),
  match_method text CHECK (match_method IS NULL OR (match_method = ANY (ARRAY['exact_id'::text, 'exact_address'::text, 'human_review'::text]))),
  confidence numeric CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric),
  conflict_note text CHECK (conflict_note IS NULL OR char_length(conflict_note) <= 2000),
  mapped_by text CHECK (mapped_by IS NULL OR char_length(mapped_by) >= 1 AND char_length(mapped_by) <= 200),
  mapped_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT legacy_facility_map_pkey PRIMARY KEY (legacy_residencial_id),
  CONSTRAINT legacy_facility_map_legacy_residencial_id_fkey FOREIGN KEY (legacy_residencial_id) REFERENCES public.residenciales(id),
  CONSTRAINT legacy_facility_map_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE elepem_core.facility_experience_publications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL UNIQUE,
  facility_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'withdrawn'::text])),
  public_body text NOT NULL CHECK (char_length(btrim(public_body)) >= 10 AND char_length(btrim(public_body)) <= 4000),
  public_relationship text CHECK (public_relationship IS NULL OR char_length(btrim(public_relationship)) >= 1 AND char_length(btrim(public_relationship)) <= 160),
  public_period text CHECK (public_period IS NULL OR char_length(btrim(public_period)) >= 1 AND char_length(btrim(public_period)) <= 160),
  reviewer_identifier text NOT NULL CHECK (char_length(btrim(reviewer_identifier)) >= 1 AND char_length(btrim(reviewer_identifier)) <= 200),
  previewed_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  withdrawn_at timestamp with time zone,
  withdrawal_reason text CHECK (withdrawal_reason IS NULL OR char_length(btrim(withdrawal_reason)) >= 1 AND char_length(btrim(withdrawal_reason)) <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_experience_publications_pkey PRIMARY KEY (id),
  CONSTRAINT facility_experience_publications_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.intake_reports(id),
  CONSTRAINT facility_experience_publications_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
CREATE TABLE elepem_core.facility_public_profiles (
  facility_id bigint NOT NULL,
  description text NOT NULL CHECK (char_length(btrim(description)) >= 10 AND char_length(btrim(description)) <= 2000),
  image_url text NOT NULL CHECK (char_length(image_url) >= 1 AND char_length(image_url) <= 1000 AND image_url ~ '^(https?://|/)'::text),
  image_alt text NOT NULL CHECK (char_length(btrim(image_alt)) >= 5 AND char_length(btrim(image_alt)) <= 300),
  contact_phone text CHECK (contact_phone IS NULL OR char_length(btrim(contact_phone)) >= 6 AND char_length(btrim(contact_phone)) <= 24),
  contact_email text CHECK (contact_email IS NULL OR char_length(btrim(contact_email)) >= 3 AND char_length(btrim(contact_email)) <= 254),
  monthly_price_from_uyu integer NOT NULL CHECK (monthly_price_from_uyu >= 10000 AND monthly_price_from_uyu <= 10000000),
  price_as_of date NOT NULL,
  price_includes ARRAY NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT facility_public_profiles_pkey PRIMARY KEY (facility_id),
  CONSTRAINT facility_public_profiles_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES elepem_core.facilities(id)
);
