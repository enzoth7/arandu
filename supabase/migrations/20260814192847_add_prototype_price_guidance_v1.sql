create table elepem_core.prototype_price_methodologies (
  methodology_version text primary key,
  label text not null,
  description text not null,
  reference_urls text[] not null default '{}',
  assumptions jsonb not null,
  created_at timestamptz not null default now(),
  check (char_length(methodology_version) between 3 and 120),
  check (jsonb_typeof(assumptions) = 'object')
);
alter table elepem_core.prototype_price_methodologies enable row level security;
revoke all on elepem_core.prototype_price_methodologies from anon, authenticated;

create table elepem_core.facility_price_observations (
  id bigint generated always as identity primary key,
  facility_id bigint not null references elepem_core.facilities(id) on delete cascade,
  observation_kind text not null check (observation_kind in ('public_recent','public_undated','historical')),
  modality text not null default 'Sin especificar',
  currency text not null check (currency in ('UYU','USD','UYU_INFERRED')),
  price_min numeric(12,2),
  price_max numeric(12,2),
  source_date date,
  source_year smallint check (source_year is null or source_year between 2000 and 2100),
  retrieved_at timestamptz not null default now(),
  source_label text not null,
  source_url text not null,
  raw_text text not null,
  includes text[] not null default '{}',
  confidence text not null check (confidence in ('high','medium','low')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (price_min is not null or price_max is not null),
  check (price_min is null or price_min >= 0),
  check (price_max is null or price_max >= 0),
  check (price_min is null or price_max is null or price_max >= price_min),
  check (source_url ~* '^https?://')
);
create unique index facility_price_observations_identity_idx
  on elepem_core.facility_price_observations (
    facility_id,
    source_url,
    observation_kind,
    modality,
    coalesce(source_date, date '1900-01-01'),
    coalesce(price_min, -1),
    coalesce(price_max, -1)
  );
create index facility_price_observations_facility_kind_idx
  on elepem_core.facility_price_observations (facility_id, observation_kind, active);
alter table elepem_core.facility_price_observations enable row level security;
revoke all on elepem_core.facility_price_observations from anon, authenticated;
revoke all on sequence elepem_core.facility_price_observations_id_seq from anon, authenticated;

create table elepem_core.facility_price_guidance (
  facility_id bigint primary key references elepem_core.facilities(id) on delete cascade,
  price_min_uyu integer not null,
  price_mid_uyu integer not null,
  price_max_uyu integer not null,
  guidance_type text not null check (guidance_type in ('public_recent','public_undated_context','historical_context','territorial_capacity','territorial_reference')),
  confidence text not null check (confidence in ('high','medium','low','very_low')),
  territory_tier text not null,
  capacity_adjustment_uyu integer not null default 0,
  primary_observation_id bigint references elepem_core.facility_price_observations(id) on delete set null,
  observed_reference_text text,
  methodology_version text not null references elepem_core.prototype_price_methodologies(methodology_version),
  methodology_note text not null,
  prototype_only boolean not null default true check (prototype_only = true),
  computed_at timestamptz not null default now(),
  check (price_min_uyu >= 10000),
  check (price_max_uyu >= price_min_uyu),
  check (price_mid_uyu between price_min_uyu and price_max_uyu)
);
create index facility_price_guidance_range_idx
  on elepem_core.facility_price_guidance (price_min_uyu, price_max_uyu);
create index facility_price_guidance_type_idx
  on elepem_core.facility_price_guidance (guidance_type, confidence);
alter table elepem_core.facility_price_guidance enable row level security;
revoke all on elepem_core.facility_price_guidance from anon, authenticated;

insert into elepem_core.prototype_price_methodologies (
  methodology_version, label, description, reference_urls, assumptions
) values (
  'prototype_v1_2026_08',
  'Orientación económica territorial para el prototipo Arandú',
  'Rangos mensuales orientativos en pesos uruguayos. Los precios públicos recientes prevalecen. En los demás casos se usa una banda territorial amplia, con un ajuste pequeño por capacidad cuando existe. La situación administrativa no modifica el precio.',
  array[
    'https://www.redresidenciales.uy/1045/cual-es-el-precio-mensual-de-residenciales-en-montevideo/',
    'https://somosuruguay.com.uy/sociedad/la-estancia-hotel-residencial-una-propuesta-busca-transformar-forma-cuidar-adultos-mayores-n2843/amp',
    'https://app.vitalencecare.com/VitalenceJavaEnvironment/servlet/com.vitalence.buscarcuartos',
    'https://infonegocios.biz/enfoque/costo-de-residencias-para-adultos-puede-alcanzar-los-240-000-pesos-mensuales-mujeres-constituyen-el-70'
  ],
  jsonb_build_object(
    'rounding_uyu', 5000,
    'administrative_status_modifier', false,
    'capacity_adjustments_uyu', jsonb_build_object('up_to_12', 5000, '50_to_79', -5000, '80_or_more', -10000),
    'warning', 'Estimación de prototipo; no constituye una cotización ni confirma disponibilidad.'
  )
);

with input (
  facility_key, observation_kind, modality, currency, price_min, price_max,
  source_date, source_year, source_label, source_url, raw_text, includes,
  confidence, notes
) as (
  values
  ('FAC-LEGACY-ELP-0048-2D20813D86F4F23D','public_recent','Habitación compartida','UYU',85000::numeric,null::numeric,date '2026-05-03',2026::smallint,'Somos Uruguay','https://somosuruguay.com.uy/sociedad/la-estancia-hotel-residencial-una-propuesta-busca-transformar-forma-cuidar-adultos-mayores-n2843/amp','Desde $85.000 mensuales por una plaza en habitación compartida.',array['Alojamiento','Alimentación','Lavandería','Enfermería','Atención médica']::text[],'high','Precio de partida publicado; sujeto a disponibilidad.'),
  ('FAC-LEGACY-ELP-0048-2D20813D86F4F23D','public_recent','Habitación individual','UYU',135000::numeric,135000::numeric,date '2026-05-03',2026::smallint,'Somos Uruguay','https://somosuruguay.com.uy/sociedad/la-estancia-hotel-residencial-una-propuesta-busca-transformar-forma-cuidar-adultos-mayores-n2843/amp','Habitación individual: $135.000 mensuales.',array['Alojamiento','Alimentación','Lavandería','Enfermería','Atención médica']::text[],'high','Puede variar según evaluación de ingreso y extras personales.'),
  ('FAC-LEGACY-MSP24-128-0077C3F2BA4412D2','public_recent','Habitación cuádruple','UYU',60000::numeric,80000::numeric,date '2025-06-12',2025::smallint,'Vitalence','https://app.vitalencecare.com/VitalenceJavaEnvironment/servlet/com.vitalence.buscarcuartos','Entre 60 y 80 mil UY.',array[]::text[],'high','Disponibilidad fechada; confirmar vigencia.'),
  ('FAC-LEGACY-MSP24-061-31302148B63DA6AC','public_recent','Habitación individual','UYU',100000::numeric,120000::numeric,date '2025-04-01',2025::smallint,'Vitalence','https://app.vitalencecare.com/VitalenceJavaEnvironment/servlet/com.vitalence.buscarcuartos','Entre 100 y 120 mil UY.',array[]::text[],'high','Sucursal 1 conciliada por nombre y dirección; confirmar vigencia.'),
  ('FAC-LEGACY-MSP24-161-7F284E6E017823E0','public_recent','Habitación doble','UYU',100000::numeric,100000::numeric,date '2025-06-13',2025::smallint,'Vitalence','https://app.vitalencecare.com/VitalenceJavaEnvironment/servlet/com.vitalence.buscarcuartos','100.000 UY.',array[]::text[],'high','Sucursal 2 conciliada por nombre y dirección; confirmar vigencia.'),
  ('FAC-LEGACY-MSP24-038-EF27E2634E365AAF','public_undated','Desde; modalidad no precisada','UYU',50000::numeric,null::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial_hotel/residencial-en-centro/','Desde $50.000.',array[]::text[],'medium','La página no muestra fecha de actualización.'),
  ('FAC-LEGACY-MSP24-041-25544A83B648E4BA','public_undated','Habitación privada con baño compartido','UYU',55000::numeric,null::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial_hotel/montevideo/prado/prado/santa-bernardita-0/','Desde $55.000.',array['Cuatro comidas','Lavadero','Peluquería','Manicura']::text[],'medium','La página no muestra fecha de actualización.'),
  ('FAC-LEGACY-MSP24-043-F296BAA525093376','public_undated','Desde; modalidad no precisada','UYU',38000::numeric,null::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial_hotel/montevideo/carrasco/carrasco/residencial-aguas-de-reposo/','Desde $38.000.',array['Alimentación','Enfermería','Fisioterapia','Actividades']::text[],'low','Monto probablemente histórico; no se utiliza como tarifa vigente.'),
  ('FAC-LEGACY-MSP24-011-690FB5E8DE8BD869','public_undated','Habitaciones individuales y compartidas','UYU',65000::numeric,null::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial_hotel/carrasco/residencial-manas-casa-asistida/','Desde $65.000.',array['Atención médica','Actividades','Alimentación','Enfermería']::text[],'medium','La ficha pública usa el nombre MH Residencial; sin fecha visible.'),
  ('FAC-LEGACY-ELP-0092-659F60900D60E0E8','public_undated','Modalidad no precisada','UYU_INFERRED',42500::numeric,42500::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial-hotel/canelones/ciudad-de-la-costa/senescentis-residencial/','42500.',array[]::text[],'low','La página omite símbolo y moneda; UYU se infiere por contexto.'),
  ('FAC-CANDIDATE-141','public_undated','Modalidad no precisada','UYU_INFERRED',29000::numeric,29000::numeric,null::date,null::smallint,'Red de Residenciales','https://www.redresidenciales.uy/residencial-hotel/montevideo/reducto/residencial-pontevedra/','29000.',array[]::text[],'low','La página omite símbolo y moneda; el valor parece histórico.'),
  ('FAC-LEGACY-ELP-0048-2D20813D86F4F23D','historical','Habitación compartida','UYU',75000::numeric,75000::numeric,date '2024-10-01',2024::smallint,'Forbes Uruguay','https://www.forbesuruguay.com/lifestyle/la-estancia-innovador-hotel-residencial-personas-mayores-n63389/amp','Habitación compartida: $75.000.',array[]::text[],'high','Referencia histórica sustituida por precio publicado en 2026.'),
  ('FAC-LEGACY-ELP-0048-2D20813D86F4F23D','historical','Habitación individual','UYU',100000::numeric,100000::numeric,date '2024-10-01',2024::smallint,'Forbes Uruguay','https://www.forbesuruguay.com/lifestyle/la-estancia-innovador-hotel-residencial-personas-mayores-n63389/amp','Habitación individual: alrededor de $100.000.',array[]::text[],'high','Referencia histórica sustituida por precio publicado en 2026.'),
  ('FAC-LEGACY-ELP-0225-1E6FEE63E2AC3E6B','historical','Según habitación','UYU',80000::numeric,120000::numeric,date '2020-11-16',2020::smallint,'InfoNegocios','https://infonegocios.biz/nota-principal/en-la-mansa-se-agita-la-candelaria-un-residencial-para-potenciar-el-tiempo-de-familia','Rango publicado de $80.000 a $120.000.',array[]::text[],'high','Referencia histórica; no se usa como tarifa actual.'),
  ('FAC-CANDIDATE-171','historical','Desde','UYU',95000::numeric,null::numeric,date '2020-05-20',2020::smallint,'InfoNegocios','https://infonegocios.biz/enfoque/llega-el-nuevo-residencial-alamos-un-centro-de-primer-nivel-para-adultos-mayores','Desde $95.000 por mes.',array[]::text[],'high','Referencia de lanzamiento de 2020.'),
  ('FAC-LEGACY-ELP-0350-1A44EC6E54F3F2D9','historical','Según modalidad y necesidades','UYU',45000::numeric,75000::numeric,date '2021-12-24',2021::smallint,'InfoNegocios','https://infonegocios.biz/nota-principal/moiru-quiere-romper-el-paradigma-va-por-mas-locales','Rango publicado de $45.000 a $75.000 mensuales.',array['Servicios incluidos']::text[],'high','Referencia histórica; no se usa como tarifa actual.'),
  ('FAC-LEGACY-ELP-0606-F6306003DF5F90F8','historical','Habitación individual','UYU',125000::numeric,125000::numeric,null::date,2019::smallint,'InfoNegocios','https://infonegocios.biz/un-dia-en/humana-con-su-directora-maria-methol','Habitaciones individuales alrededor de $125.000 mensuales.',array[]::text[],'medium','Fecha aproximada; referencia histórica.'),
  ('FAC-LEGACY-ELP-0448-898D6DD9A7C54857','historical','Persona autoválida','UYU',42000::numeric,42000::numeric,null::date,2020::smallint,'Red de Residenciales / El País','https://www.redresidenciales.uy/109/hoteles-para-jubilados-nueva-opcion-para-manejar-el-retiro-en-uruguay-articulo-del-diario-el-pais/','$42.000 mensuales para una persona autoválida.',array[]::text[],'medium','Referencia histórica reproducida por un directorio.'),
  ('FAC-LEGACY-MSP24-111-D0D05002AAEC40A3','historical','Según necesidades','USD',null::numeric,5000::numeric,null::date,2020::smallint,'Red de Residenciales / El País','https://www.redresidenciales.uy/109/hoteles-para-jubilados-nueva-opcion-para-manejar-el-retiro-en-uruguay-articulo-del-diario-el-pais/','Hasta USD 5.000 por mes, según necesidades.',array[]::text[],'medium','Importe máximo histórico; no se convierte automáticamente a UYU.'),
  ('FAC-LEGACY-ELP-0006-6E3F1CFA89335BAF','historical','Habitación individual','UYU',70000::numeric,80000::numeric,date '2012-05-15',2012::smallint,'El País','https://www.elpais.com.uy/informacion/residencias-vip-nuevas-tendencias-para-3%C2%AA-edad','Habitaciones individuales entre $70.000 y $80.000.',array[]::text[],'high','Referencia muy antigua; no se usa como tarifa actual.'),
  ('FAC-LEGACY-ELP-0006-6E3F1CFA89335BAF','historical','Habitación compartida','UYU',35000::numeric,35000::numeric,date '2012-05-15',2012::smallint,'El País','https://www.elpais.com.uy/informacion/residencias-vip-nuevas-tendencias-para-3%C2%AA-edad','Habitación compartida: $35.000.',array[]::text[],'high','Referencia muy antigua; no se usa como tarifa actual.'),
  ('FAC-LEGACY-MSP24-044-83322A666C272E22','historical','Mínimo; según habitación','UYU',38000::numeric,null::numeric,date '2019-07-21',2019::smallint,'El Observador','https://www.elobservador.com.uy/nota/residenciales-un-negocio-que-crece-con-tarifas-de-35-000-a-120-000-al-mes-201972132159','Tarifa mínima de $38.000.',array[]::text[],'high','Referencia histórica.'),
  ('FAC-LEGACY-ELP-0479-2A28F8D0ADC27059','historical','Desde','UYU',120000::numeric,null::numeric,date '2019-07-21',2019::smallint,'El Observador','https://www.elobservador.com.uy/nota/residenciales-un-negocio-que-crece-con-tarifas-de-35-000-a-120-000-al-mes-201972132159','Desde $120.000 podían encontrarse habitaciones.',array[]::text[],'medium','La nota menciona LAR en Buceo; conciliación prudente.'),
  ('FAC-LEGACY-MSP24-072-811E25FC964E9DA9','historical','Habitación compartida','UYU',40000::numeric,40000::numeric,date '2019-07-21',2019::smallint,'El Observador','https://www.elobservador.com.uy/nota/residenciales-un-negocio-que-crece-con-tarifas-de-35-000-a-120-000-al-mes-201972132159','Aproximadamente $40.000 por habitación compartida.',array[]::text[],'high','Referencia histórica.'),
  ('FAC-LEGACY-ELP-0427-C438EEBBD66E1884','historical','Habitación compartida para residentes privados','UYU',35000::numeric,35000::numeric,date '2019-07-21',2019::smallint,'El Observador','https://www.elobservador.com.uy/nota/residenciales-un-negocio-que-crece-con-tarifas-de-35-000-a-120-000-al-mes-201972132159','Los residentes privados pagaban $35.000.',array[]::text[],'high','Referencia histórica de un esquema mixto con convenio BPS.')
)
insert into elepem_core.facility_price_observations (
  facility_id, observation_kind, modality, currency, price_min, price_max,
  source_date, source_year, source_label, source_url, raw_text, includes,
  confidence, notes
)
select
  facility.id, input.observation_kind, input.modality, input.currency,
  input.price_min, input.price_max, input.source_date, input.source_year,
  input.source_label, input.source_url, input.raw_text, input.includes,
  input.confidence, input.notes
from input
join elepem_core.facilities as facility on facility.facility_key = input.facility_key
on conflict do nothing;

create or replace function elepem_core.refresh_prototype_price_guidance()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from elepem_core.facility_price_guidance as guidance
  where not exists (
    select 1
    from elepem_core.facilities as facility
    where facility.id = guidance.facility_id
      and facility.lifecycle_status = 'current'
      and facility.identity_status = 'confirmed_facility'
      and facility.registry_visibility = 'public'
      and facility.location_status = 'mapped'
      and not coalesce(facility.is_demo, false)
  );

  with base as (
    select
      facility.id as facility_id,
      current_address.department,
      current_address.locality,
      current_capacity.places,
      current_geocode.lng,
      lower(translate(coalesce(current_address.department, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) as department_norm,
      lower(translate(coalesce(current_address.locality, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) as locality_norm
    from elepem_core.facilities as facility
    join lateral (
      select address.department, address.locality
      from elepem_core.facility_addresses as address
      where address.facility_id = facility.id
        and address.is_current
        and address.address_type = 'physical'
      order by address.id desc
      limit 1
    ) as current_address on true
    join lateral (
      select geocode.lng
      from elepem_core.facility_geocodes as geocode
      where geocode.facility_id = facility.id and geocode.is_current
      order by geocode.id desc
      limit 1
    ) as current_geocode on true
    left join lateral (
      select capacity.places
      from elepem_core.facility_capacity_observations as capacity
      where capacity.facility_id = facility.id and capacity.is_current
      order by capacity.id desc
      limit 1
    ) as current_capacity on true
    where facility.lifecycle_status = 'current'
      and facility.identity_status = 'confirmed_facility'
      and facility.registry_visibility = 'public'
      and facility.location_status = 'mapped'
      and not coalesce(facility.is_demo, false)
  ), classified as (
    select base.*,
      case
        when department_norm = 'montevideo' and lng >= -56.15 then 'montevideo_este_costa'
        when department_norm = 'montevideo' and lng >= -56.21 then 'montevideo_central'
        when department_norm = 'montevideo' then 'montevideo_oeste_norte'
        when department_norm = 'canelones' and locality_norm = any(array['ciudad de la costa','solymar','lagomar','el pinar','shangrila','shangrilà','barra de carrasco','parque carrasco','costa','costa- solymar','lomas de solymar','solymar sur','atlantida','parque del plata','la floresta','san luis']) then 'canelones_costa'
        when department_norm = 'canelones' and locality_norm = any(array['las piedras','la paz','ciudad de la paz','pando','barros blancos','progreso','18 de mayo','colonia nicolich']) then 'canelones_metropolitano'
        when department_norm = 'maldonado' and locality_norm = any(array['punta del este','pta del este']) then 'punta_del_este'
        when department_norm = 'maldonado' and locality_norm = any(array['maldonado','piriapolis','san carlos']) then 'maldonado_urbano'
        when department_norm = 'colonia' and locality_norm = any(array['colonia del sacramento','sacramento','colonia']) then 'colonia_del_sacramento'
        when locality_norm like '%rural%' then 'localidad_pequena_rural'
        when locality_norm = any(array['artigas','canelones','melo','colonia del sacramento','durazno','trinidad','florida','minas','maldonado','paysandu','fray bentos','rivera','rocha','salto','san jose','san jose de mayo','mercedes','tacuarembo','treinta y tres']) then 'capital_departamental'
        else 'interior_urbano'
      end as territory_tier,
      case
        when department_norm = 'montevideo' and lng >= -56.15 then 70000
        when department_norm = 'montevideo' and lng >= -56.21 then 60000
        when department_norm = 'montevideo' then 50000
        when department_norm = 'canelones' and locality_norm = any(array['ciudad de la costa','solymar','lagomar','el pinar','shangrila','shangrilà','barra de carrasco','parque carrasco','costa','costa- solymar','lomas de solymar','solymar sur','atlantida','parque del plata','la floresta','san luis']) then 55000
        when department_norm = 'canelones' and locality_norm = any(array['las piedras','la paz','ciudad de la paz','pando','barros blancos','progreso','18 de mayo','colonia nicolich']) then 50000
        when department_norm = 'maldonado' and locality_norm = any(array['punta del este','pta del este']) then 75000
        when department_norm = 'maldonado' and locality_norm = any(array['maldonado','piriapolis','san carlos']) then 55000
        when department_norm = 'colonia' and locality_norm = any(array['colonia del sacramento','sacramento','colonia']) then 55000
        when locality_norm like '%rural%' then 35000
        when locality_norm = any(array['artigas','canelones','melo','colonia del sacramento','durazno','trinidad','florida','minas','maldonado','paysandu','fray bentos','rivera','rocha','salto','san jose','san jose de mayo','mercedes','tacuarembo','treinta y tres']) then 45000
        else 42000
      end as base_min_uyu,
      case
        when department_norm = 'montevideo' and lng >= -56.15 then 150000
        when department_norm = 'montevideo' and lng >= -56.21 then 130000
        when department_norm = 'montevideo' then 110000
        when department_norm = 'canelones' and locality_norm = any(array['ciudad de la costa','solymar','lagomar','el pinar','shangrila','shangrilà','barra de carrasco','parque carrasco','costa','costa- solymar','lomas de solymar','solymar sur','atlantida','parque del plata','la floresta','san luis']) then 115000
        when department_norm = 'canelones' and locality_norm = any(array['las piedras','la paz','ciudad de la paz','pando','barros blancos','progreso','18 de mayo','colonia nicolich']) then 100000
        when department_norm = 'maldonado' and locality_norm = any(array['punta del este','pta del este']) then 160000
        when department_norm = 'maldonado' and locality_norm = any(array['maldonado','piriapolis','san carlos']) then 115000
        when department_norm = 'colonia' and locality_norm = any(array['colonia del sacramento','sacramento','colonia']) then 105000
        when locality_norm like '%rural%' then 75000
        when locality_norm = any(array['artigas','canelones','melo','colonia del sacramento','durazno','trinidad','florida','minas','maldonado','paysandu','fray bentos','rivera','rocha','salto','san jose','san jose de mayo','mercedes','tacuarembo','treinta y tres']) then 95000
        else 88000
      end as base_max_uyu,
      case
        when places is not null and places <= 12 then 5000
        when places is not null and places >= 80 then -10000
        when places is not null and places >= 50 then -5000
        else 0
      end as capacity_adjustment_uyu
    from base
  ), observation_summary as (
    select
      observation.facility_id,
      min(coalesce(observation.price_min, observation.price_max)) filter (where observation.observation_kind = 'public_recent' and observation.currency = 'UYU') as recent_min,
      max(coalesce(observation.price_max, observation.price_min)) filter (where observation.observation_kind = 'public_recent' and observation.currency = 'UYU') as recent_max,
      count(*) filter (where observation.observation_kind = 'public_recent' and observation.currency = 'UYU') as recent_count,
      count(*) filter (where observation.observation_kind = 'public_undated') as undated_count,
      count(*) filter (where observation.observation_kind = 'historical') as historical_count
    from elepem_core.facility_price_observations as observation
    where observation.active
    group by observation.facility_id
  ), enriched as (
    select
      classified.*,
      coalesce(summary.recent_count, 0) as recent_count,
      coalesce(summary.undated_count, 0) as undated_count,
      coalesce(summary.historical_count, 0) as historical_count,
      summary.recent_min,
      summary.recent_max,
      primary_observation.id as primary_observation_id,
      primary_observation.raw_text as observed_reference_text
    from classified
    left join observation_summary as summary on summary.facility_id = classified.facility_id
    left join lateral (
      select observation.id, observation.raw_text
      from elepem_core.facility_price_observations as observation
      where observation.facility_id = classified.facility_id and observation.active
      order by
        case observation.observation_kind when 'public_recent' then 1 when 'public_undated' then 2 else 3 end,
        coalesce(observation.source_date, make_date(coalesce(observation.source_year, 1900), 1, 1)) desc,
        observation.id desc
      limit 1
    ) as primary_observation on true
  ), calculated as (
    select enriched.*,
      case
        when recent_count > 0 then round(recent_min / 5000.0) * 5000
        else round(greatest(35000, base_min_uyu + capacity_adjustment_uyu) / 5000.0) * 5000
      end::integer as guidance_min,
      case
        when recent_count > 0 then round(recent_max / 5000.0) * 5000
        else round(greatest(45000, base_max_uyu + capacity_adjustment_uyu) / 5000.0) * 5000
      end::integer as guidance_max
    from enriched
  )
  insert into elepem_core.facility_price_guidance (
    facility_id, price_min_uyu, price_mid_uyu, price_max_uyu,
    guidance_type, confidence, territory_tier, capacity_adjustment_uyu,
    primary_observation_id, observed_reference_text, methodology_version,
    methodology_note, prototype_only, computed_at
  )
  select
    calculated.facility_id,
    calculated.guidance_min,
    (round(((calculated.guidance_min + calculated.guidance_max) / 2.0) / 5000.0) * 5000)::integer,
    calculated.guidance_max,
    case
      when calculated.recent_count > 0 then 'public_recent'
      when calculated.undated_count > 0 then 'public_undated_context'
      when calculated.historical_count > 0 then 'historical_context'
      when calculated.places is not null then 'territorial_capacity'
      else 'territorial_reference'
    end,
    case
      when calculated.recent_count > 0 then 'high'
      when calculated.undated_count > 0 then 'low'
      when calculated.historical_count > 0 then 'low'
      when calculated.places is not null then 'low'
      else 'very_low'
    end,
    calculated.territory_tier,
    calculated.capacity_adjustment_uyu,
    calculated.primary_observation_id,
    calculated.observed_reference_text,
    'prototype_v1_2026_08',
    case
      when calculated.recent_count > 0 then 'Rango tomado de un precio público fechado; confirmar vigencia y condiciones.'
      when calculated.undated_count > 0 then 'Existe una referencia pública sin fecha. El rango mostrado es territorial y no reproduce esa cifra como tarifa actual.'
      when calculated.historical_count > 0 then 'Existe un antecedente histórico. El rango mostrado es territorial y no actualiza automáticamente el precio antiguo.'
      when calculated.places is not null then 'Estimación territorial con ajuste pequeño por capacidad informada.'
      else 'Referencia territorial amplia por falta de precio público y de capacidad informada.'
    end,
    true,
    now()
  from calculated
  on conflict (facility_id) do update set
    price_min_uyu = excluded.price_min_uyu,
    price_mid_uyu = excluded.price_mid_uyu,
    price_max_uyu = excluded.price_max_uyu,
    guidance_type = excluded.guidance_type,
    confidence = excluded.confidence,
    territory_tier = excluded.territory_tier,
    capacity_adjustment_uyu = excluded.capacity_adjustment_uyu,
    primary_observation_id = excluded.primary_observation_id,
    observed_reference_text = excluded.observed_reference_text,
    methodology_version = excluded.methodology_version,
    methodology_note = excluded.methodology_note,
    prototype_only = true,
    computed_at = now();
$$;

revoke all on function elepem_core.refresh_prototype_price_guidance() from public, anon, authenticated;

select elepem_core.refresh_prototype_price_guidance();

do $$
declare
  expected_count integer;
  actual_count integer;
begin
  select count(*) into expected_count
  from elepem_core.facilities as facility
  where facility.lifecycle_status = 'current'
    and facility.identity_status = 'confirmed_facility'
    and facility.registry_visibility = 'public'
    and facility.location_status = 'mapped'
    and not coalesce(facility.is_demo, false);

  select count(*) into actual_count
  from elepem_core.facility_price_guidance;

  if actual_count <> expected_count then
    raise exception 'Prototype price guidance incomplete: expected %, got %', expected_count, actual_count;
  end if;
end
$$;
