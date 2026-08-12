-- Flujos privados de cambio de ficha y decisiones documentales internas.
-- No modifica el padrón canónico ni crea una proyección pública.

alter table public.intake_reports
  drop constraint if exists intake_reports_current_status_check;
alter table public.intake_reports
  add constraint intake_reports_current_status_check
  check (current_status in ('draft', 'received', 'triage', 'in_review', 'contact', 'referred', 'resolved', 'closed'));

create or replace function app_private.record_intake_received()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.current_status = 'received' then
    insert into public.intake_report_events (
      report_id, status, public_title, public_description, actor
    ) values (
      new.id, 'received', 'Comunicación recibida',
      'La comunicación quedó registrada y está disponible para la revisión inicial.', 'system'
    );
  end if;
  return new;
end;
$$;

create table if not exists public.facility_document_status_reviews (
  id uuid primary key default gen_random_uuid(),
  facility_id bigint not null references elepem_core.facilities(id),
  decision text not null check (decision in ('inadequate', 'clear')),
  reason text not null check (char_length(reason) between 10 and 4000),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  created_at timestamptz not null default now()
);

create index if not exists facility_document_status_reviews_latest_idx
  on public.facility_document_status_reviews (facility_id, created_at desc);

alter table public.facility_document_status_reviews enable row level security;
revoke all on table public.facility_document_status_reviews from public, anon, authenticated;
grant select, insert on table public.facility_document_status_reviews to service_role;

create or replace function app_private.keep_facility_document_reviews_append_only()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  raise exception 'facility_document_status_reviews is append-only';
end;
$$;

revoke execute on function app_private.keep_facility_document_reviews_append_only() from public, anon, authenticated;
drop trigger if exists facility_document_status_reviews_append_only on public.facility_document_status_reviews;
create trigger facility_document_status_reviews_append_only
before update or delete on public.facility_document_status_reviews
for each row execute function app_private.keep_facility_document_reviews_append_only();

comment on table public.facility_document_status_reviews is
  'Decisiones estatales internas sobre estado documental. No mide calidad, seguridad ni condiciones de vida y no se expone en la ficha pública.';
