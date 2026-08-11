-- Arandú: three isolated, explicitly fictitious facilities for the demo map.
-- They never enter elepem_core, public.residenciales, matching or official KPI.

begin;

create schema if not exists arandu_demo;
revoke all on schema arandu_demo from public, anon, authenticated, service_role;

create table if not exists arandu_demo.facilities (
  id text primary key,
  name text not null,
  department text not null,
  locality text not null,
  address text not null,
  description text not null,
  phone text not null,
  email text not null,
  lat double precision not null,
  lng double precision not null,
  monthly_price_from_uyu integer not null,
  price_as_of date not null,
  price_includes text[] not null default '{}',
  image_url text not null,
  image_alt text not null,
  is_test boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_facilities_reserved_id_check check (id ~ '^DEMO-ELEPEM-00[1-3]$'),
  constraint demo_facilities_department_check check (department in ('Montevideo', 'Paysandú', 'Canelones')),
  constraint demo_facilities_coordinates_check check (lat between -35.2 and -30 and lng between -58.6 and -53),
  constraint demo_facilities_price_check check (monthly_price_from_uyu between 10000 and 500000),
  constraint demo_facilities_email_check check (email like '%@demo.invalid'),
  constraint demo_facilities_image_check check (image_url like '/demo/%'),
  constraint demo_facilities_test_only_check check (is_test)
);

alter table arandu_demo.facilities enable row level security;
revoke all on table arandu_demo.facilities from public, anon, authenticated, service_role;

insert into arandu_demo.facilities (
  id, name, department, locality, address, description, phone, email,
  lat, lng, monthly_price_from_uyu, price_as_of, price_includes,
  image_url, image_alt, is_test, active
) values
  (
    'DEMO-ELEPEM-001', 'Casa Costa Serena', 'Canelones', 'Canelones (ubicación ficticia)',
    'Camino Demostración 101 (dirección ficticia)',
    'Rutinas tranquilas, talleres de huerta y espacios comunes accesibles.',
    '+598 000 001 001 (ficticio)', 'costa-serena@demo.invalid',
    -34.5228, -56.2778, 78000, date '2026-08-10',
    array['Alojamiento', 'Cuatro comidas', 'Actividades grupales', 'Lavandería básica'],
    '/demo/elepem-costa-serena.webp',
    'Imagen sintética de un acceso residencial accesible sin personas', true, true
  ),
  (
    'DEMO-ELEPEM-002', 'Residencia Horizonte', 'Montevideo', 'Montevideo (ubicación ficticia)',
    'Avenida Ejemplo 2020 (dirección ficticia)',
    'Sala luminosa y propuestas ficticias de lectura, música y movimiento adaptado.',
    '+598 000 002 002 (ficticio)', 'horizonte@demo.invalid',
    -34.9011, -56.1645, 92500, date '2026-08-10',
    array['Alojamiento', 'Alimentación', 'Enfermería de referencia', 'Actividades'],
    '/demo/elepem-horizonte.webp',
    'Imagen sintética de una sala común accesible sin personas', true, true
  ),
  (
    'DEMO-ELEPEM-003', 'Jardín del Litoral Demo', 'Paysandú', 'Paysandú (ubicación ficticia)',
    'Pasaje de Prueba 303 (dirección ficticia)',
    'Patio protegido y una agenda ficticia centrada en jardinería y encuentros familiares.',
    '+598 000 003 003 (ficticio)', 'jardin-litoral@demo.invalid',
    -32.3171, -58.0807, 85000, date '2026-08-10',
    array['Alojamiento', 'Alimentación', 'Lavandería', 'Talleres de jardinería'],
    '/demo/elepem-jardin-del-prado.webp',
    'Imagen sintética de un jardín residencial accesible sin personas', true, true
  )
on conflict (id) do update set
  name = excluded.name,
  department = excluded.department,
  locality = excluded.locality,
  address = excluded.address,
  description = excluded.description,
  phone = excluded.phone,
  email = excluded.email,
  lat = excluded.lat,
  lng = excluded.lng,
  monthly_price_from_uyu = excluded.monthly_price_from_uyu,
  price_as_of = excluded.price_as_of,
  price_includes = excluded.price_includes,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  is_test = true,
  active = true,
  updated_at = now();

comment on schema arandu_demo is 'Datos enteramente ficticios y aislados para ensayos de Arandú.';
comment on table arandu_demo.facilities is 'Tres ubicaciones ficticias para la capa violeta del mapa; no forman parte del padrón real.';

commit;
