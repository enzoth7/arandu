alter table public.user_facility_relationships
  drop constraint user_facility_relationships_pkey,
  alter column elepem_id drop not null,
  add column id uuid not null default gen_random_uuid(),
  add column demo_facility_id text references arandu_demo.facilities(id) on delete cascade,
  add constraint user_facility_relationships_pkey primary key (id),
  add constraint user_facility_relationships_single_facility_check check (
    (elepem_id is not null)::integer + (demo_facility_id is not null)::integer = 1
  );

create unique index user_facility_relationships_user_elepem_uidx
  on public.user_facility_relationships (user_id, elepem_id)
  where elepem_id is not null;

create unique index user_facility_relationships_user_demo_uidx
  on public.user_facility_relationships (user_id, demo_facility_id)
  where demo_facility_id is not null;

create index user_facility_relationships_demo_facility_id_idx
  on public.user_facility_relationships (demo_facility_id)
  where demo_facility_id is not null;

comment on column public.user_facility_relationships.demo_facility_id is
  'Test-only relationship owner. Mutually exclusive with elepem_id and never part of the public ELEPEM registry.';
