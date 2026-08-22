begin;

-- Add resident/family name columns directly to user_facility_relationships
alter table public.user_facility_relationships
  add column if not exists first_name text,
  add column if not exists last_name text;

comment on column public.user_facility_relationships.first_name is
  'First name of the resident or family member requesting or holding the relationship.';
comment on column public.user_facility_relationships.last_name is
  'Last name of the resident or family member requesting or holding the relationship.';

-- Backfill names from user_profiles
update public.user_facility_relationships r
set
  first_name = p.first_name,
  last_name = p.last_name
from public.user_profiles p
where p.user_id = r.user_id;

commit;
