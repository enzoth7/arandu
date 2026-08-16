-- Group explicitly approved photo reports that belong to one review decision.
-- Existing publications remain one-publication batches; the source files stay private.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

alter table public.facility_change_publications
  add column if not exists publication_batch_id uuid;

update public.facility_change_publications
set publication_batch_id = id
where publication_batch_id is null;

alter table public.facility_change_publications
  alter column publication_batch_id set default gen_random_uuid(),
  alter column publication_batch_id set not null;

create index if not exists facility_change_publications_facility_batch_idx
  on public.facility_change_publications (
    facility_id,
    demo_facility_id,
    published_at desc,
    publication_batch_id
  );

comment on column public.facility_change_publications.publication_batch_id is
  'Groups one or more intake reports explicitly approved together for the same facility.';

commit;
