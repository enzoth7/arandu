-- Metadata private to the intake workflow. This does not expose attachments,
-- alter the canonical ELEPEM registry, or change publication state.

alter table public.intake_report_attachments
  add column if not exists sha256_hex text,
  add column if not exists source_channel text,
  add column if not exists source_message_id text,
  add column if not exists validation_status text not null default 'signature_validated';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_sha256_hex_check') then
    alter table public.intake_report_attachments
      add constraint intake_report_attachments_sha256_hex_check
      check (sha256_hex is null or sha256_hex ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_source_channel_check') then
    alter table public.intake_report_attachments
      add constraint intake_report_attachments_source_channel_check
      check (source_channel is null or source_channel in ('web', 'whatsapp_sandbox'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_source_message_id_check') then
    alter table public.intake_report_attachments
      add constraint intake_report_attachments_source_message_id_check
      check (source_message_id is null or char_length(source_message_id) <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'intake_report_attachments_validation_status_check') then
    alter table public.intake_report_attachments
      add constraint intake_report_attachments_validation_status_check
      check (validation_status in ('signature_validated', 'rejected', 'pending_malware_scan'));
  end if;
end;
$$;
