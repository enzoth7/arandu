begin;

drop trigger if exists intake_report_attachments_set_facility_name on public.intake_report_attachments;
drop trigger if exists facility_change_publication_photos_set_facility_name on public.facility_change_publication_photos;
drop function if exists app_private.set_intake_attachment_facility_name();
drop function if exists app_private.set_facility_change_photo_name();
drop index if exists public.intake_report_attachments_facility_name_idx;
drop index if exists public.facility_change_publication_photos_facility_name_idx;
alter table public.intake_report_attachments drop column if exists facility_name;
alter table public.facility_change_publication_photos drop column if exists facility_name;

commit;
