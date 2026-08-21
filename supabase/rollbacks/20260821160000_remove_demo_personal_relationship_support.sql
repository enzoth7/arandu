delete from public.user_facility_relationships where demo_facility_id is not null;

drop index if exists public.user_facility_relationships_demo_facility_id_idx;
drop index if exists public.user_facility_relationships_user_demo_uidx;
drop index if exists public.user_facility_relationships_user_elepem_uidx;

alter table public.user_facility_relationships
  drop constraint if exists user_facility_relationships_single_facility_check,
  drop constraint if exists user_facility_relationships_pkey,
  drop column if exists demo_facility_id,
  drop column if exists id,
  alter column elepem_id set not null,
  add constraint user_facility_relationships_pkey primary key (user_id, elepem_id);
