# Auditoría del estado actual de Supabase

> Documento histórico previo a la migración. El modelo paralelo normalizado se aplicó el 2026-08-04; el estado posterior está en `data/migration/production_normalized_migration_2026-08-04_2026-08-04T21-56-11-230Z.json`. El runtime aún lee la capa legacy hasta el Paso 6.

Fecha de auditoría: 2026-08-03
Proyecto: Arandú
Referencia Supabase: `itolluaivfoxnaohbsdk`
Región: `sa-east-1`
Postgres: `17.6.1.147`

## Alcance y método

Auditoría estrictamente de solo lectura del catálogo remoto, las migraciones locales, las consultas del frontend/backend, los scripts, las Edge Functions y los archivos locales de datos. No se aplicó SQL, no se escribió en Supabase, no se invocaron Google, Meta, Overpass ni IDE Uruguay y no se imprimieron secretos.

El inventario remoto se obtuvo mediante consultas `SELECT`, listado de tablas/migraciones/funciones y los asesores de seguridad y rendimiento de Supabase. Los datos devueltos por la base se trataron como datos no confiables y solo se usaron para conteos y estructura.

## Conclusión ejecutiva

- El mapa público ya lee de Supabase a través de `GET /api/residenciales`; no usa `app/data/facilities.json` en runtime.
- Supabase todavía no representa el modelo normalizado del plan: `public.residenciales` combina identidad física, nombre, dirección, coordenadas, presentación pública y cuatro hechos administrativos en una sola fila.
- No existen las vistas contractuales `facilities_current_internal`, `facilities_public_approved`, `known_facilities_exclusion_view` ni `residenciales_legacy_compat`.
- Existen dos colas semánticamente superpuestas: `public.residencial_discovery_candidates` (40 filas) y `discovery_private.facility_candidates` (30 filas).
- El flujo privado nuevo conserva observaciones, enlaces, IDs externos, top tres de matching y auditoría de revisión, pero solo contiene OSM y aún no representa establecimientos canónicos.
- La ruta pública devuelve las 804 filas de `public.residenciales`, incluidas 17 con `status_group='app'` y 3 con `status_group='verificar'`; no hay una vista explícita de aprobación pública.
- Los archivos normalizados locales contienen 810 entidades, mientras Supabase contiene 804 filas con esquemas de ID diferentes. Solo 550 IDs coinciden literalmente; hay 260 IDs solo locales y 254 solo remotos.
- La historia de migraciones remota y los archivos locales están desviados: cinco cambios presentes en el esquema no figuran como migraciones remotas con el mismo nombre semántico, y `create_intake_reports` existe remotamente pero no en el directorio local.
- El bucket `intake-evidence` es privado, pero `storage.objects` conserva políticas `public` de `SELECT` e `INSERT`. Esto permite intentar acceso directo fuera de las validaciones de capacidad de la aplicación y debe tratarse como riesgo alto separado.
- El backend usa una conexión directa de la familia `postgres`; por tanto, RLS no sustituye los controles de sesión del servidor. La ruta interna sí valida cookie de equipo y mismo origen antes de escribir.
- El subproyecto `ELEPEM OSINT` mantiene un Postgres local separado (`db:5432/elepem`) con tablas candidatas, registros oficiales, matching y auditoría. Si se ejecuta como sistema operativo, se convierte en una fuente paralela incompatible con el objetivo del plan.

## Inventario remoto

| Esquema.tabla | Filas | RLS | FORCE RLS | Uso actual |
|---|---:|---|---|---|
| `public.intake_reports` | 2 | sí | no | Recepción de comunicaciones |
| `public.residenciales` | 804 | sí | no | Mapa público y matching legado |
| `public.intake_report_events` | 3 | sí | no | Historial de estado de comunicaciones |
| `public.intake_report_attachments` | 0 | sí | no | Metadatos de evidencia |
| `public.intake_notification_log` | 0 | sí | no | Idempotencia de notificaciones |
| `public.residencial_discovery_candidates` | 40 | sí | no | Cola candidata legada, solo scripts |
| `discovery_private.facility_source_runs` | 1 | sí | sí | Ejecuciones de fuentes |
| `discovery_private.facility_source_observations` | 32 | sí | sí | Observaciones inmutables parciales |
| `discovery_private.facility_candidates` | 30 | sí | sí | Cola privada nueva |
| `discovery_private.facility_candidate_sources` | 30 | sí | sí | Trazabilidad candidato-fuente |
| `discovery_private.facility_external_ids` | 30 | sí | sí | IDs externos OSM |
| `discovery_private.facility_candidate_match_suggestions` | 90 | sí | sí | Top tres de coincidencias |
| `discovery_private.facility_candidate_review_events` | 0 | sí | sí | Auditoría append-only |

Conteos relevantes:

- `public.residenciales`: 804.
- `public.residencial_discovery_candidates`: 40.
- `discovery_private.facility_candidates`: 30.
- `discovery_private.facility_source_observations`: 32.
- `discovery_private.facility_candidate_match_suggestions`: 90, exactamente tres por cada uno de los 30 candidatos.
- `discovery_private.facility_candidate_review_events`: 0.
- `public.intake_reports`: 2; eventos: 3; adjuntos: 0; notificaciones: 0.

## Vistas, funciones, triggers e índices

- Vistas de aplicación en `public` o `discovery_private`: ninguna.
- Funciones de aplicación: `app_private.record_intake_received`, `discovery_private.enforce_candidate_public_eligibility` y `discovery_private.reject_facility_candidate_review_event_mutation`.
- `app_private.record_intake_received` es `SECURITY DEFINER`, vive en un esquema no expuesto y tiene ejecución revocada fuera de `postgres`.
- `public.rls_auto_enable` es `SECURITY DEFINER` y está asociado al event trigger de plataforma `ensure_rls` para habilitar RLS al crear tablas.
- Triggers de fila: recepción inicial de intake, guardia de elegibilidad pública del candidato y prohibición de UPDATE/DELETE sobre eventos de revisión.
- Índices remotos: 48. Los asesores señalan 2 claves foráneas sin índice de cobertura y 17 índices todavía sin uso; no se eliminan durante esta fase.

## RLS, roles y exposición

- `public.residenciales` tiene RLS y una política deny-all para `anon` y `authenticated`; tampoco conserva grants directos de lectura para esos roles. La aplicación lo lee mediante conexión PostgreSQL del servidor.
- `public.residencial_discovery_candidates` tiene RLS sin políticas y solo acceso privilegiado; no aparece en rutas de frontend.
- Las siete tablas `discovery_private` tienen RLS + FORCE RLS, no tienen políticas para `anon`/`authenticated` y el esquema revoca acceso público.
- Los asesores informan ocho casos `rls_enabled_no_policy`. En las tablas privadas esto funciona como deny-by-default, pero debe documentarse expresamente para distinguir intención de omisión.
- La conexión de servidor pertenece a la familia `postgres`, por lo que puede eludir RLS. Los controles efectivos para la cola interna son la cookie firmada, la verificación de origen y la validación de entrada en `app/api/team/facility-candidates/route.ts`.
- Las Edge Functions desplegadas `notify-intake-code`, `upload-intake-evidence` tienen `verify_jwt=false`; implementan autorización por token de capacidad almacenado en el payload del caso.
- Riesgo alto: las políticas `Public Select Intake Evidence` y `Public Upload Intake Evidence` de `storage.objects` aplican al rol `public`. El bucket figura `public=false`, pero esas políticas permiten acceso directo si se conoce o adivina el path. Su origen está en `scratch/fix-storage-rls.mjs`, no en una migración versionada.
- La configuración de esquemas expuestos del proyecto remoto no puede demostrarse desde `supabase/config.toml`, porque ese archivo solo declara Edge Functions. Debe confirmarse en Data API antes del corte.

Referencia del asesor: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Calidad y reconciliación de datos

- Integridad referencial de los siete controles ejecutados: sin fallas. No se detectaron huérfanos en fuentes, observaciones o matches ni IDs/candidate_key duplicados.
- `public.residenciales`: 0 nombres, direcciones, localidades o departamentos vacíos; 67 geocódigos tienen precisión `referencial`.
- Hay 30 grupos con mismo nombre normalizado y departamento, 0 grupos con misma dirección normalizada y departamento y 13 grupos que comparten coordenadas. Son señales de revisión, no duplicados automáticos.
- Hechos administrativos actuales en columnas booleanas: MSP final 212, registro histórico 732, MIDES 275, PACP 36, otra fuente 34; 294 filas tienen más de un hecho.
- `public.residencial_discovery_candidates`: 40 filas; 10 sin dirección, 15 sin localidad, 17 aprobadas como nuevas y 23 pendientes.
- `discovery_private.facility_candidates`: 30 filas; 15 sin dirección, 20 sin localidad y las 30 sin departamento. Todas son evidencia C; 20 están `needs_review` y 10 `possible_match`.
- Observaciones privadas: 32, todas OSM. IDs externos: 30, todos OSM. No hay place_id de Google en el modelo privado nuevo.
- La cola legada contiene 17 `approved_new`; esas mismas 17 filas aparecen como IDs `APP-*` dentro de `public.residenciales` y son devueltas por el endpoint público.
- Comparación literal de IDs del snapshot local frente a Supabase: 550 compartidos, 260 solo locales y 254 solo remotos. Los remotos adicionales se distribuyen principalmente en IDs `MSP24-*`, `MSPREG24-*` y `APP-*`.

## Datos fuera de Supabase

| Archivo o sistema | Conteo | Función actual | Estado frente a fuente única |
|---|---:|---|---|
| Snapshot normalizado ELEPEM v01 (artefacto retirado) | 810 | Evidencia histórica | No es runtime; hash conservado en la auditoría de backfill |
| Registros de fuente ELEPEM v01 (artefacto retirado) | 1.357 | Evidencia histórica | No es una entrada operativa; hash conservado en la auditoría de backfill |
| Catálogo de fuentes ELEPEM v01 (artefacto retirado) | 22 | Evidencia histórica | No debe alimentar `source_catalog` sin una importación revisada |
| `app/data/facilities.json` | 237 | Fuente del importador legado | No es runtime; debe deprecarse tras reconciliar |
| `data/discovery/residenciales-live-2026-08-02.json` | 804 | Exportación de Supabase | Snapshot auditable, no maestro |
| `data/discovery/osm-*-2026-08-02.json` | 32 | Candidatos OSM | 32 observaciones y 30 candidatos ya reflejados parcialmente |
| `data/discovery/instagram_paysandu_candidates_2026-08-02.json` | 14 | Investigación manual | Dry-run; no importado al modelo privado |
| `data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json` | 9 | Investigación manual | Dry-run; no importado al modelo privado |
| `data/discovery/manual-ide-geocoding-2026-08-02.json` | 14 | Resultado IDE local | No existe tabla tipada de geocódigos |
| `ELEPEM OSINT` + Postgres `db:5432/elepem` | desconocido | Aplicación Python paralela | Riesgo de segunda fuente operativa; no consumida por Next.js |

Los PDF/CSV originales deben conservarse como evidencia. El problema no es su existencia, sino que todavía faltan observaciones tipadas, hashes de importación y mapeos estables que representen su contenido operativo en Supabase.

## Dependencia de runtime

- Público: `useResidenciales` → `/api/residenciales` → conexión PostgreSQL de servidor → `public.residenciales`.
- Cola privada: `TeamFacilityCandidateQueue` → `/api/team/facility-candidates` → tablas `discovery_private` + `public.residenciales` para sugerencias.
- Intake: rutas Next.js y Edge Functions → tablas `public.intake_*` + bucket `intake-evidence`.
- Ningún componente de la app lee directamente JSON/CSV para mostrar el mapa. Los archivos locales sí alimentan importadores, matching y geocodificación manual.
- `scripts/import-social-candidates.mjs` es solo dry-run pese al nombre y al script npm; no implementa `--apply`.
- `scripts/discover-residenciales.mjs` conserva un cliente Google de búsqueda departamental y campos amplios, además de Apify/SerpAPI. Es incompatible con el plan v2 y no debe reutilizarse para descubrimiento.

## Deriva de migraciones

- Migraciones locales: 12; migraciones remotas: 8.
- Solo locales por semántica: `20260731183000_add_residencial_source_memberships`, `20260731190000_add_residencial_other_source`, `20260731234544_add_residencial_discovery_candidates`, `20260801120000_add_serpapi_discovery_source`, `20260802010000_add_app_discovery_status`.
- Solo remota por semántica: `20260728013344_create_intake_reports`.
- Tres migraciones existen a ambos lados con timestamps diferentes (`intake_user_tracking`, `lock_private_intake_tables`, `add_facility_candidate_review_queue`/auditoría).
- El esquema remoto sí contiene columnas y tablas de varios archivos locales que no figuran en el historial remoto; esto indica aplicación manual o scripts fuera del mecanismo de migraciones.
- No debe generarse un nuevo baseline destructivo hasta conciliar historia, nombres y hashes.

## Backup y rollback

- Existe una exportación de `public.residenciales` con 804 filas del 2026-08-02.
- Hay rollbacks explícitos para las tres migraciones privadas más recientes.
- No hay en el repositorio un backup verificable de todas las tablas, políticas, funciones, storage y datos actuales.
- El estado de backups administrados/PITR de Supabase no fue demostrable con las herramientas de lectura disponibles y queda como `unknown`.
- Antes del Paso 5 se necesita exportación completa del destino de prueba y una restauración comprobada.

## Brechas frente al modelo objetivo

1. Falta `facilities` como identidad estable de sede física.
2. Faltan `organizations` y la relación histórica `facility_operators`.
3. Faltan nombres, direcciones y contactos normalizados uno-a-muchos.
4. Los hechos administrativos siguen colapsados en booleanos de `public.residenciales`.
5. Falta catálogo de fuentes independiente de runs/observaciones.
6. Falta vínculo de observaciones a establecimientos canónicos.
7. Faltan geocódigos versionados y revisables.
8. Hay dos colas de candidatos y dos modelos de matching.
9. Falta auditoría general de cambios canónicos; solo hay auditoría de revisión candidata.
10. Faltan vistas de aprobación pública, compatibilidad y exclusión nacional.
11. La app pública consulta la tabla legacy completa, no un contrato aprobado.
12. El subproyecto Python replica candidatos, fuentes, matching y auditoría en otra base.

## Riesgos pendientes

- **P0 seguridad:** políticas públicas directas en `storage.objects` para evidencias de intake.
- **P0 publicación:** el endpoint público carece de filtro/vista explícita de aprobación y devuelve estados `app`/`verificar`.
- **P1 trazabilidad:** deriva entre migraciones remotas y locales.
- **P1 identidad:** IDs no coincidentes entre snapshot y tabla operativa; no se puede backfillear por ID sin tabla de correspondencia.
- **P1 ubicación:** todos los candidatos privados carecen de departamento y la mitad carece de dirección.
- **P1 doble fuente:** cola legada, cola privada y Postgres OSINT paralelo.
- **P2 rendimiento:** dos FKs sin índice y 17 índices aún sin uso; revisar después de estabilizar consultas.
- **P2 contratos:** ausencia de vistas y de un diccionario operativo completo.

## Resultado del Paso 3

Auditoría completada sin escrituras. Estos hallazgos deben ser la entrada obligatoria del Paso 4. No se autoriza deducir que una fila ausente está cerrada o no habilitada, ni fusionar registros por nombre o ID solamente.
