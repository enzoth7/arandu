create index facility_price_guidance_methodology_idx
  on elepem_core.facility_price_guidance (methodology_version);
create index facility_price_guidance_primary_observation_idx
  on elepem_core.facility_price_guidance (primary_observation_id)
  where primary_observation_id is not null;
