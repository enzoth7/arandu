-- Reversible publication rollback. The canonical identity is retained so any
-- intake history or moderated experience remains referentially intact.

begin;

update elepem_core.facilities
set registry_visibility = 'held',
    publication_status = 'withdrawn',
    updated_at = now()
where facility_key = 'DEMO-ELEPEM-001'
  and is_demo = true;

commit;
