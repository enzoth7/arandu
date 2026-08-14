update elepem_core.facilities
set
  migration_payload = coalesce(migration_payload, '{}'::jsonb) || jsonb_build_object(
    'retiredPrototypePricePlaceholder',
    jsonb_build_object(
      'monthlyPriceUyu', demo_monthly_price_uyu,
      'priceAsOf', demo_price_as_of,
      'priceIncludes', demo_price_includes,
      'retiredAt', now(),
      'reason', 'Replaced by explicitly labelled prototype price guidance'
    )
  ),
  demo_monthly_price_uyu = null,
  demo_price_as_of = null,
  demo_price_includes = '{}'::text[],
  updated_at = now()
where not coalesce(is_demo, false)
  and demo_monthly_price_uyu is not null;
