-- Private, sandbox-only channel metadata for the Arandú WhatsApp intake.
-- This migration does not expose data, publish candidates, or forward reports.

create table public.intake_channel_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.intake_reports(id) on delete cascade,
  source text not null check (source = 'whatsapp_sandbox'),
  external_account_id text not null check (char_length(external_account_id) between 1 and 100),
  external_inbox_id text not null check (char_length(external_inbox_id) between 1 and 100),
  external_conversation_id text not null check (char_length(external_conversation_id) between 1 and 100),
  external_contact_id text not null check (char_length(external_contact_id) between 1 and 100),
  external_message_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(external_message_ids) = 'array' and jsonb_array_length(external_message_ids) <= 100),
  phone_hash text not null check (phone_hash ~ '^[a-f0-9]{64}$'),
  reporter_display_name text check (reporter_display_name is null or char_length(reporter_display_name) between 1 and 160),
  consent_mode text not null check (consent_mode in ('Confidencial', 'Con identidad registrada')),
  consent_notice_version text not null check (char_length(consent_notice_version) between 1 and 80),
  consented_at timestamptz not null,
  retention_due_at timestamptz not null,
  retention_status text not null default 'pending'
    check (retention_status in ('pending', 'deleted', 'error')),
  retention_attempted_at timestamptz,
  retention_error_code text check (retention_error_code is null or char_length(retention_error_code) <= 120),
  sandbox_purge_due_at timestamptz not null,
  is_sandbox boolean not null default true check (is_sandbox),
  created_at timestamptz not null default now()
);

create index intake_channel_links_retention_idx
  on public.intake_channel_links (retention_status, retention_due_at);
create index intake_channel_links_sandbox_purge_idx
  on public.intake_channel_links (sandbox_purge_due_at) where is_sandbox;

create table public.intake_ingestion_requests (
  idempotency_key text primary key check (char_length(idempotency_key) between 16 and 200),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  report_id uuid not null unique references public.intake_reports(id) on delete cascade,
  external_event_id text not null check (char_length(external_event_id) between 1 and 200),
  created_at timestamptz not null default now()
);

-- n8n Postgres Chat Memory expects id, session_id and message. created_at is
-- deliberately added so the sandbox conversation can be purged after 24 h.
create table public.alerta_mayor_whatsapp_sandbox_memory (
  id bigserial primary key,
  session_id varchar(255) not null
    check (session_id like 'am:sandbox:memory:%'),
  message jsonb not null,
  created_at timestamptz not null default now()
);

create index alerta_mayor_whatsapp_memory_session_idx
  on public.alerta_mayor_whatsapp_sandbox_memory (session_id, id desc);
create index alerta_mayor_whatsapp_memory_retention_idx
  on public.alerta_mayor_whatsapp_sandbox_memory (created_at);

alter table public.intake_report_attachments
  add column sha256_hex text check (sha256_hex is null or sha256_hex ~ '^[a-f0-9]{64}$'),
  add column source_channel text check (source_channel is null or source_channel in ('web', 'whatsapp_sandbox')),
  add column source_message_id text check (source_message_id is null or char_length(source_message_id) <= 100),
  add column validation_status text not null default 'signature_validated'
    check (validation_status in ('signature_validated', 'rejected', 'pending_malware_scan'));

create schema if not exists app_private;

create or replace function app_private.enforce_intake_attachment_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.report_id::text, 0));
  if (select count(*) from public.intake_report_attachments where report_id = new.report_id) >= 5 then
    raise exception 'intake attachment limit exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function app_private.enforce_intake_attachment_limit() from public, anon, authenticated;

create trigger intake_report_attachments_limit
before insert on public.intake_report_attachments
for each row execute function app_private.enforce_intake_attachment_limit();

alter table public.intake_channel_links enable row level security;
alter table public.intake_ingestion_requests enable row level security;
alter table public.alerta_mayor_whatsapp_sandbox_memory enable row level security;

revoke all on table public.intake_channel_links from public, anon, authenticated;
revoke all on table public.intake_ingestion_requests from public, anon, authenticated;
revoke all on table public.alerta_mayor_whatsapp_sandbox_memory from public, anon, authenticated;
revoke all on sequence public.alerta_mayor_whatsapp_sandbox_memory_id_seq from public, anon, authenticated;
grant all on table public.intake_channel_links to service_role;
grant all on table public.intake_ingestion_requests to service_role;

create policy "No direct access to intake channel links"
on public.intake_channel_links for all to anon, authenticated
using (false) with check (false);

create policy "No direct access to intake ingestion requests"
on public.intake_ingestion_requests for all to anon, authenticated
using (false) with check (false);

create policy "No direct access to sandbox chat memory"
on public.alerta_mayor_whatsapp_sandbox_memory for all to anon, authenticated
using (false) with check (false);

comment on table public.intake_channel_links is
  'Private sandbox transport metadata. It must never be used to publish or automatically determine a facility status.';
comment on column public.intake_channel_links.phone_hash is
  'Peppered correlation hash; never a substitute for explicit contact consent.';
comment on table public.alerta_mayor_whatsapp_sandbox_memory is
  'Temporary n8n conversational memory for fictitious WhatsApp sandbox sessions. Purge after 24 hours; never use as the final case record.';
