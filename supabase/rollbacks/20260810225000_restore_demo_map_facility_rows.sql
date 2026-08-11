begin;

insert into arandu_demo.facilities (
  id, name, department, locality, address, description, phone, email,
  lat, lng, monthly_price_from_uyu, price_as_of, price_includes,
  image_url, image_alt, is_test, active
) values
  ('DEMO-ELEPEM-001', 'Casa Costa Serena', 'Canelones', 'Canelones (ubicación ficticia)',
   'Camino Demostración 101 (dirección ficticia)',
   'Rutinas tranquilas, talleres de huerta y espacios comunes accesibles.',
   '+598 000 001 001 (ficticio)', 'costa-serena@demo.invalid', -34.5228, -56.2778,
   78000, date '2026-08-10', array['Alojamiento', 'Cuatro comidas', 'Actividades grupales', 'Lavandería básica'],
   '/demo/elepem-costa-serena.webp', 'Imagen sintética de un acceso residencial accesible sin personas', true, true),
  ('DEMO-ELEPEM-002', 'Residencia Horizonte', 'Montevideo', 'Montevideo (ubicación ficticia)',
   'Avenida Ejemplo 2020 (dirección ficticia)',
   'Sala luminosa y propuestas ficticias de lectura, música y movimiento adaptado.',
   '+598 000 002 002 (ficticio)', 'horizonte@demo.invalid', -34.9011, -56.1645,
   92500, date '2026-08-10', array['Alojamiento', 'Alimentación', 'Enfermería de referencia', 'Actividades'],
   '/demo/elepem-horizonte.webp', 'Imagen sintética de una sala común accesible sin personas', true, true),
  ('DEMO-ELEPEM-003', 'Jardín del Litoral Demo', 'Paysandú', 'Paysandú (ubicación ficticia)',
   'Pasaje de Prueba 303 (dirección ficticia)',
   'Patio protegido y una agenda ficticia centrada en jardinería y encuentros familiares.',
   '+598 000 003 003 (ficticio)', 'jardin-litoral@demo.invalid', -32.3171, -58.0807,
   85000, date '2026-08-10', array['Alojamiento', 'Alimentación', 'Lavandería', 'Talleres de jardinería'],
   '/demo/elepem-jardin-del-prado.webp', 'Imagen sintética de un jardín residencial accesible sin personas', true, true)
on conflict (id) do nothing;

commit;
