alter table public.elepem
  add column modalidades_estadia text[],
  add column habitacion_privacidad text[],
  add column entorno text[],
  add column accesibilidad_movilidad text[],
  add column cuidados_profesionales text[],
  add column vida_cotidiana_vinculos text[],
  add constraint elepem_modalidades_estadia_check check (
    modalidades_estadia is null or (
      array_position(modalidades_estadia, null) is null
      and modalidades_estadia <@ array[
        'permanente',
        'temporal_respiro',
        'centro_dia',
        'recuperacion_rehabilitacion'
      ]::text[]
    )
  ),
  add constraint elepem_habitacion_privacidad_check check (
    habitacion_privacidad is null or (
      array_position(habitacion_privacidad, null) is null
      and habitacion_privacidad <@ array[
        'habitacion_privada',
        'habitacion_compartida',
        'bano_privado',
        'bano_compartido',
        'espacio_privado_visitas_llamadas'
      ]::text[]
    )
  ),
  add constraint elepem_entorno_check check (
    entorno is null or (
      array_position(entorno, null) is null
      and entorno <@ array[
        'espacio_exterior',
        'espacios_comunes',
        'climatizacion',
        'iluminacion_natural'
      ]::text[]
    )
  ),
  add constraint elepem_accesibilidad_movilidad_check check (
    accesibilidad_movilidad is null or (
      array_position(accesibilidad_movilidad, null) is null
      and accesibilidad_movilidad <@ array[
        'acceso_sin_escalones',
        'una_planta',
        'ascensor_ayuda_escaleras',
        'circulacion_silla_ruedas',
        'bano_adaptado_barras',
        'ducha_nivel_piso',
        'llamada_dormitorio_bano',
        'camas_articuladas'
      ]::text[]
    )
  ),
  add constraint elepem_cuidados_profesionales_check check (
    cuidados_profesionales is null or (
      array_position(cuidados_profesionales, null) is null
      and cuidados_profesionales <@ array[
        'asistencia_24_horas',
        'direccion_tecnica_medica',
        'enfermeria',
        'fisioterapia',
        'nutricion',
        'psicologia',
        'trabajo_social',
        'odontologia',
        'podologia'
      ]::text[]
    )
  ),
  add constraint elepem_vida_cotidiana_vinculos_check check (
    vida_cotidiana_vinculos is null or (
      array_position(vida_cotidiana_vinculos, null) is null
      and vida_cotidiana_vinculos <@ array[
        'actividades_recreacion',
        'paseos_salidas',
        'actividad_fisica',
        'musica_arte_talleres',
        'estimulacion_cognitiva',
        'alimentacion_adaptada',
        'menu_visible',
        'visitas_amplias',
        'telefono_internet'
      ]::text[]
    )
  );

comment on column public.elepem.modalidades_estadia is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';
comment on column public.elepem.habitacion_privacidad is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';
comment on column public.elepem.entorno is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';
comment on column public.elepem.accesibilidad_movilidad is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';
comment on column public.elepem.cuidados_profesionales is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';
comment on column public.elepem.vida_cotidiana_vinculos is
  'Opciones confirmadas; NULL significa sin informacion y {} ninguna opcion verificada.';

alter table arandu_demo.facilities
  add column modalidades_estadia text[],
  add column habitacion_privacidad text[],
  add column entorno text[],
  add column accesibilidad_movilidad text[],
  add column cuidados_profesionales text[],
  add column vida_cotidiana_vinculos text[],
  add constraint demo_modalidades_estadia_check check (
    modalidades_estadia is null or (
      array_position(modalidades_estadia, null) is null
      and modalidades_estadia <@ array[
        'permanente', 'temporal_respiro', 'centro_dia', 'recuperacion_rehabilitacion'
      ]::text[]
    )
  ),
  add constraint demo_habitacion_privacidad_check check (
    habitacion_privacidad is null or (
      array_position(habitacion_privacidad, null) is null
      and habitacion_privacidad <@ array[
        'habitacion_privada', 'habitacion_compartida', 'bano_privado',
        'bano_compartido', 'espacio_privado_visitas_llamadas'
      ]::text[]
    )
  ),
  add constraint demo_entorno_check check (
    entorno is null or (
      array_position(entorno, null) is null
      and entorno <@ array[
        'espacio_exterior', 'espacios_comunes', 'climatizacion', 'iluminacion_natural'
      ]::text[]
    )
  ),
  add constraint demo_accesibilidad_movilidad_check check (
    accesibilidad_movilidad is null or (
      array_position(accesibilidad_movilidad, null) is null
      and accesibilidad_movilidad <@ array[
        'acceso_sin_escalones', 'una_planta', 'ascensor_ayuda_escaleras',
        'circulacion_silla_ruedas', 'bano_adaptado_barras', 'ducha_nivel_piso',
        'llamada_dormitorio_bano', 'camas_articuladas'
      ]::text[]
    )
  ),
  add constraint demo_cuidados_profesionales_check check (
    cuidados_profesionales is null or (
      array_position(cuidados_profesionales, null) is null
      and cuidados_profesionales <@ array[
        'asistencia_24_horas', 'direccion_tecnica_medica', 'enfermeria',
        'fisioterapia', 'nutricion', 'psicologia', 'trabajo_social',
        'odontologia', 'podologia'
      ]::text[]
    )
  ),
  add constraint demo_vida_cotidiana_vinculos_check check (
    vida_cotidiana_vinculos is null or (
      array_position(vida_cotidiana_vinculos, null) is null
      and vida_cotidiana_vinculos <@ array[
        'actividades_recreacion', 'paseos_salidas', 'actividad_fisica',
        'musica_arte_talleres', 'estimulacion_cognitiva',
        'alimentacion_adaptada', 'menu_visible', 'visitas_amplias', 'telefono_internet'
      ]::text[]
    )
  );

update arandu_demo.facilities
set
  modalidades_estadia = array[
    'permanente',
    'temporal_respiro',
    'centro_dia',
    'recuperacion_rehabilitacion'
  ],
  habitacion_privacidad = array[
    'habitacion_privada',
    'habitacion_compartida',
    'bano_privado',
    'bano_compartido',
    'espacio_privado_visitas_llamadas'
  ],
  entorno = array[
    'espacio_exterior',
    'espacios_comunes',
    'climatizacion',
    'iluminacion_natural'
  ],
  accesibilidad_movilidad = array[
    'acceso_sin_escalones',
    'una_planta',
    'ascensor_ayuda_escaleras',
    'circulacion_silla_ruedas',
    'bano_adaptado_barras',
    'ducha_nivel_piso',
    'llamada_dormitorio_bano',
    'camas_articuladas'
  ],
  cuidados_profesionales = array[
    'asistencia_24_horas',
    'direccion_tecnica_medica',
    'enfermeria',
    'fisioterapia',
    'nutricion',
    'psicologia',
    'trabajo_social',
    'odontologia',
    'podologia'
  ],
  vida_cotidiana_vinculos = array[
    'actividades_recreacion',
    'paseos_salidas',
    'actividad_fisica',
    'musica_arte_talleres',
    'estimulacion_cognitiva',
    'alimentacion_adaptada',
    'menu_visible',
    'visitas_amplias',
    'telefono_internet'
  ],
  updated_at = now()
where id = 'DEMO-ELEPEM-001'
  and active
  and is_test;
