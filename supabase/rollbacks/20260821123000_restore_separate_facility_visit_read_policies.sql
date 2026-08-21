begin;

drop policy if exists "Users can read authorized visits" on public.facility_visits;

create policy "Visitors can read their own visits"
  on public.facility_visits for select to authenticated
  using (requester_user_id = (select auth.uid()));

create policy "Representatives can read visits for active memberships"
  on public.facility_visits for select to authenticated
  using (exists (
    select 1 from public.facility_memberships membership
    join public.institutional_accounts account on account.user_id = membership.user_id
    where membership.user_id = (select auth.uid())
      and membership.elepem_id = facility_visits.facility_id
      and membership.status = 'active' and account.status = 'active'
      and account.role = 'facility_representative'
      and (membership.valid_until is null or membership.valid_until > now())
  ));

commit;
