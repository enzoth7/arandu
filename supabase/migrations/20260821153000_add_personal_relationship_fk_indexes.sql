create index if not exists user_facility_relationships_elepem_id_idx
  on public.user_facility_relationships (elepem_id);

create index if not exists user_facility_relationships_verified_by_idx
  on public.user_facility_relationships (verified_by)
  where verified_by is not null;

