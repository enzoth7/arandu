drop view if exists public.facility_experiences_published;
create view public.facility_experiences_published
with (security_invoker = true)
as
select
  publication.id as publication_id,
  coalesce(facility.codigo, demo.id) as facility_key,
  publication.public_body,
  publication.public_relationship,
  publication.public_period,
  publication.published_at,
  report.is_demo,
  case when report.report_payload->>'experienceKind' = 'visit' then 'visit' else 'residential' end as experience_kind
from elepem_core.facility_experience_publications publication
left join public.elepem facility on facility.id = publication.facility_id
left join arandu_demo.facilities demo on demo.id = publication.demo_facility_id
join public.intake_reports report on report.id = publication.report_id
where publication.status = 'published';
grant select on public.facility_experiences_published to anon, authenticated, service_role;

drop table if exists public.user_facility_relationships;
