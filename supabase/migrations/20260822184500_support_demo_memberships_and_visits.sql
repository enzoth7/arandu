begin;

-- 1. Modificar facility_memberships para soportar demo_facility_id
alter table public.facility_memberships
  drop constraint facility_memberships_pkey,
  alter column elepem_id drop not null,
  add column id uuid not null default gen_random_uuid(),
  add column demo_facility_id text references arandu_demo.facilities(id) on delete cascade,
  add constraint facility_memberships_pkey primary key (id),
  add constraint facility_memberships_single_facility_check check (
    (elepem_id is not null)::integer + (demo_facility_id is not null)::integer = 1
  );

create unique index facility_memberships_user_elepem_uidx
  on public.facility_memberships (user_id, elepem_id)
  where elepem_id is not null;

create unique index facility_memberships_user_demo_uidx
  on public.facility_memberships (user_id, demo_facility_id)
  where demo_facility_id is not null;

create index facility_memberships_demo_facility_id_idx
  on public.facility_memberships (demo_facility_id)
  where demo_facility_id is not null;

comment on column public.facility_memberships.demo_facility_id is
  'Test-only relationship owner. Mutually exclusive with elepem_id and never part of the public ELEPEM registry.';

-- 2. Modificar facility_visits para soportar demo_facility_id
alter table public.facility_visits
  alter column facility_id drop not null,
  add column demo_facility_id text references arandu_demo.facilities(id) on delete cascade,
  add constraint facility_visits_single_facility_check check (
    (facility_id is not null)::integer + (demo_facility_id is not null)::integer = 1
  );

create index facility_visits_demo_facility_id_idx
  on public.facility_visits (demo_facility_id)
  where demo_facility_id is not null;

commit;
