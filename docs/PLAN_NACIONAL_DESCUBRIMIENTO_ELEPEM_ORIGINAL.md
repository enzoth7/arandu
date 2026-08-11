# Plan maestro nacional de descubrimiento y normalización de ELEPEM
## ChatGPT Plus/Pro + Codex + Google Maps + fuentes públicas

**Proyecto:** Arandú
**Fecha del plan:** 2026-08-02  
**Versión:** 2 — Supabase como fuente operativa única de verdad  
**Archivo de referencia para Codex:** `docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md`

---

## 1. Objetivo

Descubrir, departamento por departamento, establecimientos de larga estadía para personas mayores que:

- parecen funcionar actualmente;
- tienen alguna huella pública verificable;
- no aparecen ya en las fuentes nominales públicas cargadas;
- no aparecen ya en la app;
- no aparecen ya entre los puntos de OpenStreetMap;
- no aparecen ya en la cola privada de candidatos;
- no son alias, mudanzas, sedes, nombres anteriores o duplicados de un establecimiento conocido.

Cada hallazgo nuevo debe entrar primero a una cola privada de revisión. Ningún hallazgo se publica automáticamente.

Antes de continuar con nuevos departamentos, la aplicación y la base deben reorganizarse para que **Supabase sea la fuente operativa única de verdad**: la app, la deduplicación, el índice de exclusión, la revisión y las importaciones deben leer y escribir sobre una estructura normalizada, trazable y segura. Los archivos originales seguirán conservándose como evidencia y respaldo, pero no como bases paralelas que compitan con Supabase.

La frase aceptada para un candidato visible en una capa de revisión es:

> **Pista pública pendiente de verificación**

Nunca debe etiquetarse automáticamente como ilegal, clandestino, irregular, no habilitado, inseguro o cerrado.

---

## 2. Estado actual del proyecto

Este plan parte de que ya existen:

- tablas privadas de candidatos y observaciones;
- importadores y normalizadores;
- descubrimiento mediante OpenStreetMap;
- aproximadamente 30 puntos provenientes de OSM;
- matching y deduplicación conservadora;
- cola de revisión;
- archivos de investigación de Paysandú;
- archivos de investigación de Artigas;
- fuentes públicas MSP, MIDES, PACP e históricas;
- una app pública que no debe modificarse automáticamente.

La geocodificación defensiva mediante IDE Uruguay todavía está pendiente.

Actualmente parte de la información está distribuida entre Supabase, archivos CSV/JSON/PDF, exportaciones locales y candidatos de OSM. Esta versión del plan agrega una migración gradual para consolidar esa información en Supabase sin romper la aplicación ni perder las fuentes originales.

---

## 3. Correcciones incorporadas

### 3.1. No se utilizará la API oficial de Instagram

No se implementará:

- Instagram Graph API;
- Business Discovery;
- tokens de Meta;
- login de Meta;
- revisión de una app de Meta;
- un proveedor de Meta en el código.

La investigación de Instagram y Facebook será realizada fuera del repositorio, en conversaciones de ChatGPT Plus o Pro, usando búsqueda web y deep research sobre contenido público accesible o indexado.

### 3.2. ChatGPT hace la investigación; Codex hace la ingeniería

**ChatGPT Plus/Pro hace:**

- investigación pública por departamento;
- búsqueda de perfiles y publicaciones públicas indexadas;
- búsqueda en Instagram y Facebook públicos;
- búsqueda en Google Maps o resultados públicos de Google cuando sean accesibles;
- búsquedas en español y portugués;
- medios locales;
- directorios;
- sitios web;
- avisos;
- fuentes oficiales;
- búsqueda inversa por teléfono, dirección, correo, usuario y nombre;
- producción de JSON, CSV, informe y registro de búsqueda.

**Codex hace:**

- inspección del repositorio;
- exportación de la app;
- índice nacional de exclusión;
- validación de archivos;
- normalización;
- deduplicación;
- matching explicable;
- importación en modo simulación;
- escritura en la cola privada después de aprobación;
- verificación controlada de `place_id`;
- geocodificación mediante IDE Uruguay;
- pruebas;
- revisión de seguridad;
- presentación de puntos después de revisión.

### 3.3. ChatGPT no es una API invocable desde el repositorio

Codex no debe intentar llamar automáticamente a la suscripción ChatGPT Plus/Pro.

El traspaso es deliberadamente explícito:

1. La persona solicita a ChatGPT la investigación de un departamento.
2. ChatGPT entrega archivos estructurados.
3. La persona copia esos archivos a `data/discovery/`.
4. Codex los valida, compara e importa.

No se necesita una OpenAI API key para esta investigación manual en ChatGPT.

### 3.4. Se utilizará la clave de Google Maps existente en `.env`

La clave existente podrá utilizarse para una herramienta local y controlada de verificación exacta de lugares.

No se escribirá el valor de la clave en este archivo, en prompts, logs, diffs, capturas, reportes o commits.

Nombre recomendado para una clave de servidor:

```dotenv
GOOGLE_MAPS_API_KEY=valor_solo_en_el_archivo_local
```

Codex debe inspeccionar el nombre real ya existente y reutilizarlo cuando sea seguro. No debe renombrarlo ni duplicarlo sin necesidad.

La clave no autoriza scraping de la interfaz de Google Maps ni una descarga masiva nacional.

El uso aceptado será:

- verificar un candidato ya descubierto;
- buscar su `place_id`;
- abrir la ficha exacta;
- guardar el `place_id`, la fecha y la persona que verificó;
- descartar la respuesta temporal de Google después de la revisión.

No se almacenarán desde Google como datos canónicos:

- reseñas;
- autores;
- ratings;
- cantidad de reseñas;
- fotos;
- horarios;
- teléfonos;
- coordenadas para mostrarlas sobre un mapa no Google;
- nombres y direcciones obtenidos masivamente;
- respuestas crudas permanentes de Places.

Los nombres, direcciones y teléfonos canónicos deben provenir de fuentes independientes permitidas.

---

## 4. Reglas generales

### 4.1. Datos y privacidad

No recopilar:

- nombres de residentes;
- historias clínicas;
- documentos de identidad;
- información médica;
- comentarios personales;
- fotografías de residentes;
- seguidores;
- listas de amigos;
- credenciales;
- cookies;
- tokens de sesión;
- contenido privado;
- denuncias completas con datos personales.

Sí se puede conservar:

- nombre comercial público;
- dirección comercial pública;
- teléfono comercial público;
- sitio web;
- URL pública de Instagram o Facebook;
- nombre de la página o cuenta;
- fecha de observación;
- observación factual breve;
- enlace a una publicación pública cuando sea evidencia necesaria;
- fuente y limitaciones.

### 4.2. No evasión

No usar:

- Selenium o Playwright para iniciar sesión en Instagram o Facebook;
- cuentas falsas;
- proxies rotativos;
- evasión de CAPTCHA;
- bypass de bloqueos;
- sesiones robadas;
- cookies de usuarios;
- automatización de login;
- perfiles privados;
- técnicas para evitar límites o controles de acceso.

### 4.3. Separación administrativa

Mantener como hechos diferentes:

- habilitación final de MSP;
- certificado social de MIDES;
- registro histórico ante MSP;
- PACP;
- certificado histórico;
- aparición en una lista municipal;
- presencia social;
- publicidad;
- actividad reciente;
- denuncia o incidente.

Nunca reducir todo a un campo booleano `habilitado=true/false`.

La ausencia de una lista no prueba:

- cierre;
- ilegalidad;
- falta de registro;
- falta de autorización;
- mala calidad;
- riesgo.

### 4.4. Unidad física

La unidad es la sede física.

- Un operador con dos domicilios equivale a dos establecimientos.
- Dos cuentas sociales para una sede pueden ser una sola entidad.
- Dos nombres en una dirección pueden ser alias, rebranding, sucesión o reutilización del inmueble.
- Un nombre genérico nunca alcanza para fusionar.
- Una mudanza no debe borrar la dirección histórica.
- Un registro histórico debe impedir que se lo redescubra como completamente nuevo, pero no debe aparecer como actual sin evidencia.

---

## 5. Supabase como fuente operativa única de verdad

### 5.1. Qué significa “fuente única de verdad”

Después de completar la migración:

- la aplicación leerá los establecimientos desde Supabase;
- Codex comparará candidatos contra Supabase;
- el índice nacional de exclusión se generará desde Supabase;
- las decisiones humanas, alias, fuentes, teléfonos, direcciones y estados quedarán en Supabase;
- los JSON y CSV departamentales serán insumos de importación y snapshots auditables, no bases maestras paralelas;
- los PDF, CSV y páginas originales seguirán conservándose como evidencia documental inmutable;
- ningún dato canónico perderá su procedencia.

“Fuente única de verdad” no significa borrar los archivos originales. Significa que Supabase contiene la representación operativa normalizada que usa el sistema, mientras los archivos y URLs conservan la evidencia de donde provino cada observación.

### 5.2. Principios obligatorios del modelo

1. **Una fila de establecimiento representa una sede física.**
2. **Una organización u operador puede administrar varias sedes.**
3. **Los alias y nombres históricos no se guardan como establecimientos nuevos.**
4. **Las observaciones originales no se sobrescriben.**
5. **Los valores canónicos se seleccionan mediante revisión y mantienen trazabilidad.**
6. **Los estados administrativos se almacenan como hechos separados y fechados.**
7. **Los datos actuales e históricos se distinguen explícitamente.**
8. **No se guardan varios teléfonos, correos, nombres o URLs concatenados en una sola celda.**
9. **No se crean columnas “por si algún día sirven”.** Toda columna debe tener una función, un escritor y un lector identificados.
10. **Los campos centrales no se esconden en JSONB.** JSONB puede usarse para payloads crudos o metadatos variables, pero nombres, direcciones, teléfonos, fuentes, estados y relaciones deben ser consultables y estar normalizados.
11. **No se borra ni modifica destructivamente la estructura actual hasta terminar el backfill, la reconciliación y el cambio de lectura de la app.**
12. **Toda migración debe ser reversible, repetible y probada primero fuera de producción.**

### 5.3. Modelo lógico objetivo

Los nombres son orientativos. Codex debe reutilizar las tablas existentes cuando ya representen correctamente el mismo concepto y debe evitar crear duplicados semánticos.

#### `facilities`

Una fila por sede física.

Debe contener solamente identidad y estado operativo de alto nivel, por ejemplo:

```text
id
canonical_display_name
lifecycle_status
review_status
public_eligible
public_status
created_at
updated_at
merged_into_facility_id
```

No debe contener teléfonos concatenados, múltiples direcciones, listas de fuentes ni todas las redes sociales en columnas sueltas.

#### `organizations`

Operadores, asociaciones, empresas, congregaciones o instituciones responsables.

#### `facility_operators`

Relación histórica y actual entre una sede física y sus operadores.

```text
facility_id
organization_id
relationship_type
valid_from
valid_to
source_observation_id
review_status
```

#### `facility_names`

Todos los nombres observados.

```text
facility_id
name_raw
name_normalized
name_type
valid_from
valid_to
is_current_selected
source_observation_id
reviewed_by
reviewed_at
```

Tipos sugeridos:

```text
canonical
trade_name
legal_name
alias
historical_name
social_profile_name
source_typo
```

#### `facility_addresses`

Cada dirección observada por separado.

```text
facility_id
address_raw
street_normalized
door_number
unit_or_detail
locality_id
department_id
postal_code
valid_from
valid_to
address_status
is_current_selected
source_observation_id
manual_verification_status
```

Una dirección histórica nunca debe reemplazar silenciosamente a la actual.

#### `facility_contacts`

Teléfonos, WhatsApp, correos y sitios web como registros separados.

```text
facility_id
contact_type
value_raw
value_normalized
is_public_business_contact
valid_from
valid_to
is_current_selected
source_observation_id
reliability
```

Tipos sugeridos:

```text
phone
whatsapp
email
website
```

El valor crudo se conserva. El valor normalizado se usa para matching. Un teléfono sospechoso de extracción desplazada no puede transformarse en clave fuerte.

#### `facility_social_accounts`

```text
facility_id
platform
public_url
handle
page_or_account_name
valid_from
valid_to
verification_status
source_observation_id
```

Plataformas posibles:

```text
instagram
facebook
other_public_social
```

#### `source_catalog`

Catálogo de fuentes: MSP, MIDES, PACP, OSM, sitio propio, Instagram, Facebook, directorio, medio local, investigación ChatGPT, sugerencia ciudadana y otras.

#### `source_runs`

Cada importación o investigación ejecutada.

```text
id
source_id
run_type
started_at
finished_at
retrieved_at
input_file
input_hash
status
created_by
```

#### `source_observations`

Observación inmutable de una fila, ficha, perfil, publicación o documento.

```text
id
source_run_id
source_record_key
source_url
source_date
retrieved_at
record_hash
observed_data
raw_metadata
storage_permission
```

`observed_data` y `raw_metadata` pueden usar JSONB para preservar el material original, pero los hechos aceptados deben pasar a tablas tipadas y relacionadas.

#### `facility_observation_links`

Vincula una observación con una sede y registra si el vínculo está confirmado, sugerido o rechazado.

#### `facility_administrative_events`

Hechos administrativos separados y fechados.

```text
facility_id
authority
event_type
status_or_result
valid_from
valid_to
source_observation_id
review_status
```

Ejemplos de `event_type`:

```text
msp_final_authorization
mides_social_certificate
msp_registration
pacp_reference
historical_certificate
municipal_reference
inspection_event
closure_event
```

La ausencia de un evento no se convierte en un estado negativo.

#### `facility_external_ids`

```text
facility_id
provider
external_id
external_url
verified_at
verified_by
verification_status
```

Proveedores posibles:

```text
google_place
osm_node
osm_way
osm_relation
other_directory
```

Para Google, conservar únicamente lo permitido por este plan.

#### `facility_geocodes`

```text
facility_id
address_id
latitude
longitude
geocode_source
query_raw
query_normalized
confidence
method
retrieved_at
is_selected
manual_correction
reviewed_by
reviewed_at
raw_response
```

No sobrescribir coordenadas revisadas. `raw_response` solo se conserva cuando la fuente y su política lo permiten.

#### `facility_candidates`

Pistas todavía no convertidas en establecimiento canónico.

#### `facility_candidate_sources`

Fuentes asociadas a un candidato antes de resolver su identidad.

#### `facility_candidate_matches`

Tres o más coincidencias sugeridas, con componentes de puntaje explicables y decisión humana.

#### `facility_reviews`

Decisiones humanas, notas, correcciones y justificación.

#### `audit_log`

Historial de cambios relevantes: quién, cuándo, qué cambió, valor anterior, valor nuevo y motivo.

### 5.4. Vistas y contratos para que la app no se rompa

Codex debe crear una capa de compatibilidad antes de cambiar la aplicación.

Vistas o endpoints recomendados:

```text
facilities_current_internal
facilities_public_approved
known_facilities_exclusion_view
residenciales_legacy_compat
```

- `facilities_current_internal`: vista interna consolidada para revisión y matching.
- `facilities_public_approved`: únicamente sedes aprobadas para exposición pública.
- `known_facilities_exclusion_view`: todos los actuales, históricos y candidatos que no deben volver a presentarse como completamente nuevos.
- `residenciales_legacy_compat`: conserva temporalmente las columnas que la app actual espera mientras se migra el frontend y el backend.

La app no debe consultar directamente tablas de observaciones crudas.

### 5.5. Seguridad y RLS

- Las tablas operativas, candidatas, observaciones, revisiones y auditoría deben negar acceso anónimo por defecto.
- La clave `service_role` nunca puede llegar al navegador.
- El mapa público solo puede leer una vista o endpoint explícitamente aprobado.
- Las acciones internas deben validar autenticación y rol en el servidor.
- Toda escritura importante debe quedar auditada.
- Codex debe probar acceso anónimo, acceso autenticado autorizado y acceso autenticado no autorizado.
- Si el proyecto usa un esquema privado, verificar que no esté expuesto por la API de Supabase.
- Si se mantienen tablas en `public`, aplicar RLS deny-by-default y políticas explícitas mínimas.

### 5.6. Diccionario de datos obligatorio

Codex debe crear un diccionario donde cada columna indique:

```text
table_name
column_name
data_type
nullable
default_value
purpose
allowed_values
source_of_truth
written_by
read_by
publicly_exposed
retention_rule
index_or_constraint
migration_origin
```

Una columna no se aprueba si no se puede explicar:

- para qué existe;
- quién la escribe;
- quién la lee;
- cómo se valida;
- si puede exponerse;
- de qué fuente procede.

Las columnas actuales aparentemente sin uso no se eliminan de inmediato. Primero se documentan sus consumidores reales, se migra su información y recién después se propone su deprecación.

### 5.7. Migración sin romper la aplicación

La migración debe realizarse por etapas:

1. Inventario de tablas, vistas, funciones, políticas, triggers, índices y consultas de la app.
2. Backup y exportación verificable.
3. Diseño y aprobación del modelo objetivo.
4. Creación de nuevas tablas al lado de las actuales.
5. Backfill idempotente con tabla de correspondencia entre IDs anteriores y nuevos.
6. Informe de reconciliación y conflictos.
7. Capa de compatibilidad para mantener funcionando la app.
8. Cambio gradual de lecturas.
9. Cambio gradual de escrituras o dual-write temporal cuando realmente exista un flujo de escritura antiguo.
10. Pruebas de aplicación, RLS, matching, mapa y rollback.
11. Corte definitivo solo con aprobación humana.
12. Deprecación posterior; nunca eliminar tablas o columnas antiguas en la misma migración del corte.

No se ejecuta una migración destructiva en producción desde una única instrucción general.

### 5.8. Criterios de aceptación de Supabase

La fase de normalización se considera terminada únicamente cuando:

- cada sede física tiene un ID estable;
- todos los registros anteriores tienen una correspondencia o un conflicto documentado;
- no existen teléfonos, correos o URLs múltiples concatenados en los campos canónicos;
- alias y nombres históricos están separados;
- operadores y sedes están separados;
- direcciones actuales e históricas están separadas;
- las etapas administrativas están separadas;
- toda fuente tiene URL o referencia, fecha y procedencia;
- los candidatos siguen siendo privados;
- la app funciona leyendo desde Supabase;
- el índice de exclusión se genera desde Supabase;
- las políticas RLS pasan las pruebas;
- las filas huérfanas son cero;
- los IDs duplicados son cero;
- los conteos por departamento están reconciliados o explicados;
- existe rollback probado;
- ninguna tabla antigua fue eliminada sin aprobación explícita.

---

# PASO A PASO

## Paso 0. Guardar este plan y enseñárselo a Codex

Guardar este archivo en:

```text
docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md
```

Agregar en el `AGENTS.md` raíz:

```md
- Antes de cualquier tarea de descubrimiento, importación, Google Places,
  Instagram, Facebook, matching o geocodificación, leer:
  docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md
```

No pedirle a Codex que ejecute todo el plan de una sola vez.

---

## Paso 1. Actualizar las reglas de `AGENTS.md`

Reemplazar la regla demasiado amplia:

```md
- No scrapear Google Maps, Instagram ni Facebook.
```

por este bloque:

```md
## Investigación pública y reparto de tareas

- Codex no hará scraping directo de la interfaz de Google Maps, Instagram ni Facebook.
- Codex no iniciará sesión ni automatizará login en Instagram o Facebook.
- No se usará la API oficial de Instagram o Facebook en este proyecto.
- La investigación pública de Instagram, Facebook, Google Maps, medios,
  directorios y otras fuentes será realizada en ChatGPT Plus/Pro fuera del
  repositorio.
- Codex sí puede importar archivos JSON, CSV y Markdown preparados por ChatGPT
  y conservar sus URLs, fechas, observaciones factuales y limitaciones.
- Codex no descargará masivamente publicaciones, comentarios, fotografías,
  seguidores, historiales de cuentas ni datos personales.
- La clave de Google Maps almacenada localmente podrá usarse únicamente para
  verificación controlada de candidatos y obtención de place_id.
- No se usará Google Places para construir automáticamente la base nacional,
  copiar masivamente fichas ni generar coordenadas para el mapa de Arandú.
- De Google solo se conservará de forma permanente el place_id, la URL externa,
  la fecha de verificación y la identidad de la persona revisora.
- Ningún candidato se publica automáticamente.
```

### Prompt para Codex — Paso 1

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 1 of the plan.

Tasks:

1. Update AGENTS.md with the exact public-research role separation described
   in the plan.
2. Do not implement any scraper.
3. Do not call Google, Instagram, Facebook, Supabase, Overpass or IDE Uruguay.
4. Inspect .gitignore and confirm that .env, .env.local and secret variants
   are not tracked.
5. Do not print, read aloud, copy, log or expose the Google Maps key.
6. Do not modify the actual .env file.
7. Show the complete diff.
8. Run git diff --check.

Stop after Step 1.
```

### Resultado esperado

Solo se modifica:

```text
AGENTS.md
```

Y, únicamente si faltaba una regla de exclusión:

```text
.gitignore
```

---

## Paso 2. Proteger y probar la clave de Google sin exponerla

Este paso debe ejecutarse localmente desde VS Code o una terminal local.

### Reglas

- No pegar la clave en Codex.
- No subir `.env` a Git.
- No usar una variable con prefijo público para llamadas de servidor.
- No mostrar la clave en errores.
- No guardar respuestas crudas en Git.
- Limitar el número de solicitudes.
- Restringir la clave a las APIs realmente usadas.
- Aplicar una restricción de aplicación apropiada.
- Configurar alertas o límites de gasto en Google Cloud.
- Confirmar que Places API (New) esté habilitada.
- Comenzar con una sola solicitud.

### Prompt para Codex — Paso 2

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 2.

This is a local security and capability check.

1. Inspect existing environment-variable names without printing their values.
2. Confirm whether a server-only Google Maps key variable exists.
3. Confirm that the env file is ignored by Git.
4. Confirm whether the current project already has a Google Places client.
5. Do not make a live request yet.
6. Propose a one-request smoke-test command for Places API (New).
7. The smoke test must:
   - use POST;
   - read the key from the environment;
   - request the minimum field mask;
   - limit results;
   - redact the key from logs and errors;
   - write no permanent Google data;
   - have an explicit timeout.
8. Do not add the key to .env.example; add only the variable name if needed.
9. Show the diff and stop.
```

### Prueba controlada posterior

La primera prueba debe usar un establecimiento ya conocido, nunca una búsqueda nacional.

Ejemplo conceptual:

```bash
npm run google:place-smoke-test -- \
  --query "Hogar Don Martín, Nelson Cousin s/n, Baltasar Brum, Artigas" \
  --limit 1
```

La prueba debe mostrar solo:

- éxito o error;
- cantidad de resultados;
- `place_id` candidato;
- ningún secreto.

---

## Paso 3. Auditar la aplicación y Supabase sin modificar nada

Este paso es de lectura solamente. Su objetivo es saber exactamente qué existe hoy y qué partes de la app todavía dependen de archivos locales o estructuras antiguas.

### Salidas obligatorias

```text
docs/data/SUPABASE_CURRENT_STATE_AUDIT.md
docs/data/SUPABASE_DEPENDENCY_MAP.md
docs/data/SUPABASE_EXISTING_COLUMN_USAGE.csv
```

### El informe debe cubrir

- tablas, columnas, tipos, claves y restricciones;
- vistas, funciones, triggers e índices;
- políticas RLS y roles;
- migraciones existentes;
- consultas de frontend, backend, scripts y funciones serverless;
- archivos JSON/CSV que todavía alimentan la app;
- datos que están fuera de Supabase;
- tablas o columnas duplicadas semánticamente;
- columnas siempre nulas o aparentemente no usadas;
- campos multivaluados concatenados;
- IDs actuales y su estabilidad;
- dependencias que podrían romperse;
- procesos de escritura existentes;
- fuentes de datos reales del mapa público y la cola privada;
- backup y rollback disponibles;
- brechas frente al modelo del apartado 5.

### Prompt para Codex — Paso 3

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 3: audit the current application and Supabase data model.

This is strictly read-only.

Do not modify files except the three requested audit outputs.
Do not apply migrations.
Do not write to Supabase.
Do not change RLS.
Do not change the app.
Do not contact Google, Instagram, Facebook, Overpass or IDE Uruguay.
Do not print secrets.

Inspect:

- all Supabase migrations and schema definitions;
- current tables, views, functions, triggers, indexes and RLS policies when
  read access is available;
- every frontend, backend, script and edge-function query;
- every local JSON, CSV or generated file used at runtime;
- current public.residenciales behavior;
- candidate, observation, external-id and OSM flows;
- all existing IDs and relationships.

Create:

1. docs/data/SUPABASE_CURRENT_STATE_AUDIT.md
2. docs/data/SUPABASE_DEPENDENCY_MAP.md
3. docs/data/SUPABASE_EXISTING_COLUMN_USAGE.csv

For every existing column identify its real writers and readers. Mark unknown
usage as unknown; do not invent a consumer.

Report what is currently outside Supabase and what must be migrated.
Report all risks that could break the current app.

Run git diff --check and stop after Step 3.
```

---

## Paso 4. Diseñar el modelo normalizado y el diccionario de datos

Codex debe traducir el modelo lógico del apartado 5 al estado real del repositorio. No debe crear una tabla nueva cuando ya exista una equivalente útil.

### Salidas obligatorias

```text
docs/data/SUPABASE_TARGET_MODEL.md
docs/data/SUPABASE_COLUMN_DICTIONARY.csv
docs/data/SUPABASE_MIGRATION_PLAN.md
docs/data/SUPABASE_SCHEMA_DIAGRAM.md
```

Además debe preparar, pero no aplicar:

```text
supabase/migrations/TIMESTAMP_normalized_facility_model.sql
supabase/migrations/TIMESTAMP_normalized_facility_model_rollback.sql
```

### Prompt para Codex — Paso 4

```text
Read AGENTS.md, docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md and all Step 3
outputs.

Execute only Step 4: design the normalized Supabase target model and migration.

Do not apply SQL.
Do not write to Supabase.
Do not alter the application runtime.
Do not remove existing tables or columns.

Requirements:

- Supabase becomes the operational source of truth.
- One facility row per physical site.
- Separate organizations/operators from facilities.
- Separate names, addresses, contacts, social accounts, source observations,
  administrative events, external IDs, geocodes, candidates, matches,
  reviews and audit history.
- Preserve raw observations and provenance.
- Preserve current and historical values separately.
- No multi-value canonical text fields.
- No speculative columns.
- Every proposed column must appear in the data dictionary with purpose,
  writer, reader, validation, exposure and retention.
- Reuse existing semantically correct tables where possible.
- Add indexes, foreign keys, uniqueness rules and checks deliberately.
- Deny anonymous access to operational/private tables.
- Provide a public approved view and a legacy compatibility view.
- Provide idempotent forward SQL and explicit rollback SQL.
- Include an old-to-new field mapping and table mapping.
- Include a phased backfill and cutover plan.

Create the four documentation outputs and migration drafts.

Run SQL/static validation where available and git diff --check.
Stop after Step 4.
```

---

## Paso 5. Crear el modelo paralelo y hacer el backfill en un entorno de prueba

No ejecutar primero en producción. Crear las nuevas estructuras al lado de las actuales y cargar copias reconciliables.

### Salidas de control

```text
data/migration/facility_id_mapping_FECHA.csv
data/migration/supabase_backfill_conflicts_FECHA.csv
data/migration/supabase_backfill_audit_FECHA.md
data/migration/supabase_reconciliation_FECHA.json
```

### Reglas de backfill

- idempotente;
- no sobrescribir observaciones originales;
- preservar IDs antiguos en una tabla de mapeo;
- no fusionar automáticamente casos ambiguos;
- no mover un candidato a público;
- conservar registros históricos;
- separar teléfonos contaminados por extracción;
- mantener origen y fecha de cada valor;
- producir conteos antes y después;
- registrar huérfanos, duplicados y conflictos;
- rollback probado en el entorno de prueba.

### Prompt para Codex — Paso 5

```text
Read AGENTS.md, docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md and the approved
Step 3 and Step 4 outputs.

Execute only Step 5.

Implement the approved side-by-side normalized schema and backfill tooling.

Apply only to the explicitly configured local, test or staging Supabase
project. Never assume that a connected project is non-production. Before any
apply, show the project identifier without secrets and require an explicit
confirmation that it is the test target.

Do not drop or rename current production tables.
Do not switch the application yet.
Do not publish candidates.

Backfill from:

- current Supabase operational tables;
- current app exports;
- official normalized CSV inputs;
- source observations;
- OSM records and candidates;
- Paysandú and Artigas research files;
- existing aliases, historical records and external IDs.

Create stable old-to-new mappings and reconciliation outputs.
Flag all ambiguous entity merges for human review.

Test forward migration, repeat execution, rollback and re-apply in the test
environment.

Return exact row counts, conflicts, orphan counts, duplicate counts, RLS test
results and rollback results.
Stop after Step 5.
```

---

## Paso 6. Cambiar la aplicación para que lea y escriba en Supabase normalizado

Este es el corte funcional. Debe realizarse con una capa de compatibilidad y sin borrar la estructura anterior.

### Objetivos

- el mapa público lee `facilities_public_approved` o un endpoint equivalente;
- la cola interna lee las tablas normalizadas;
- matching y exclusión usan `known_facilities_exclusion_view`;
- nuevas importaciones escriben observaciones y candidatos normalizados;
- los archivos locales dejan de ser dependencias de runtime;
- las funciones antiguas siguen funcionando temporalmente mediante una vista o adaptador;
- ninguna ruta pública obtiene acceso a datos privados.

### Prompt para Codex — Paso 6

```text
Read AGENTS.md, docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md and all approved
Supabase audit, model and backfill outputs.

Execute only Step 6 in a test/staging environment first.

Migrate application reads and writes to the normalized Supabase model using a
compatibility layer.

Requirements:

- keep the old tables intact;
- create or use facilities_public_approved for the public map;
- create or use facilities_current_internal for internal workflows;
- create or use known_facilities_exclusion_view for matching;
- preserve legacy response shapes through a compatibility view or adapter;
- update runtime code that still reads local JSON/CSV files;
- no service-role key in browser code;
- RLS deny-by-default for private data;
- no automatic publication;
- temporary dual-write only if a real old write path exists and with tests;
- add feature flags or a reversible switch for the cutover;
- provide rollback instructions;
- verify map counts, department counts, candidate counts and representative
  facility records before and after;
- run end-to-end, RLS, lint, build and unit tests.

Do not delete or deprecate old tables in this step.
Do not switch production until the user explicitly approves the test report.
Stop after Step 6.
```

### Puerta de aprobación antes de continuar

No avanzar al índice nacional ni a nuevos departamentos hasta que:

- la app funcione contra el modelo normalizado;
- Supabase contenga todos los datos operativos conocidos;
- los archivos locales ya no sean requeridos en runtime;
- el diccionario de datos esté completo;
- las políticas RLS hayan sido probadas;
- el backfill esté reconciliado;
- los conflictos importantes estén documentados;
- el rollback esté probado;
- producción haya sido migrada solo con aprobación explícita.

---

## Paso 7. Crear el índice nacional de exclusión

Después del corte normalizado, construir un índice de todo lo conocido. La fuente operativa principal debe ser Supabase; los archivos originales se usan para comprobar procedencia y detectar omisiones, no como una base paralela.

### Entradas obligatorias

```text
data/reference/elepem_publicos_v01.csv
data/reference/registros_fuente_v01.csv
data/reference/ELEPEM_HABILITADOS_JUNIO_2026.pdf
```

Además:

- vista normalizada `known_facilities_exclusion_view` o equivalente;
- exportación actual de `public.residenciales` únicamente para reconciliación;
- `facility_candidates`;
- `facility_source_observations`;
- `facility_external_ids`;
- OSM actual;
- candidatos OSM;
- investigación de Paysandú;
- investigación de Artigas;
- alias, nombres históricos y relaciones ya revisadas.

### Salidas

```text
data/exclusion/known_facilities_exclusion_index_FECHA.json
data/exclusion/known_facilities_exclusion_conflicts_FECHA.csv
data/exclusion/known_facilities_exclusion_audit_FECHA.md
```

### El índice debe incluir

- sede física;
- nombre canónico provisional;
- nombres observados;
- alias;
- nombres históricos;
- departamento;
- localidad;
- direcciones;
- teléfonos con fuente y confiabilidad;
- correos;
- dominios;
- URLs sociales;
- `place_id` ya conocido;
- identificadores OSM;
- coordenadas existentes;
- fuentes;
- fechas;
- estado temporal;
- conflictos;
- posibles mudanzas;
- posibles rebrandings;
- motivos de exclusión.

### Prompt para Codex — Paso 7

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 7: build the provisional national exclusion index.

Use all known official, historical, app, OSM, Paysandú and Artigas inputs.

Rules:

- Do not search the web.
- Do not call Google, Instagram, Facebook, Overpass or IDE Uruguay.
- Do not modify Supabase.
- Do not modify public.residenciales.
- Do not publish candidates.
- Never merge by name alone.
- Keep each physical address separate.
- Keep historical entries in the exclusion index.
- Preserve administrative stages separately.
- Flag PDF extraction contamination.
- Treat every ambiguous merge as human review required.

Create:

1. data/exclusion/known_facilities_exclusion_index_FECHA.json
2. data/exclusion/known_facilities_exclusion_conflicts_FECHA.csv
3. data/exclusion/known_facilities_exclusion_audit_FECHA.md

Validate JSON parsing, unique exclusion_id values, source provenance and counts
by department.

Run focused tests and git diff --check.

Stop after Step 7.
```

---

## Paso 8. Terminar la geocodificación con IDE Uruguay

Implementar el paso pendiente antes de publicar nuevas pistas.

### Reglas

Geocodificar únicamente:

- direcciones obtenidas de fuentes independientes;
- candidatos deduplicados;
- sedes actuales probables;
- calles y puertas razonablemente completas.

No geocodificar:

- registros históricos destinados a archivo;
- direcciones conflictivas;
- narraciones;
- denuncias;
- centroides de ciudad;
- contenido proveniente solo de Google;
- direcciones sin revisión mínima.

### Datos a guardar

- consulta original;
- consulta normalizada;
- respuesta IDE;
- resultado seleccionado;
- latitud;
- longitud;
- fecha;
- método;
- confianza;
- corrección manual;
- persona revisora.

### Prompt para Codex — Paso 8

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 8.

Implement defensive IDE Uruguay geocoding for independently sourced,
deduplicated candidate addresses.

Requirements:

- endpoint and query parameter configurable;
- timeout;
- retry with backoff;
- rate limiting;
- dry-run by default;
- fixtures in tests;
- no live requests in unit tests;
- never overwrite manually verified coordinates;
- no city-centre fallbacks;
- no Google-derived coordinates;
- preserve raw IDE response and selected result;
- confidence and manual-correction fields.

Do not geocode any live batch yet.

Run tests, lint, build and git diff --check.
Stop after Step 8.
```

---

## Paso 9. Revalidar Paysandú y Artigas contra el índice nacional

Las investigaciones ya realizadas deben compararse con el índice nuevo.

### Entradas

```text
data/discovery/instagram_paysandu_candidates_2026-08-02.json
data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json
data/exclusion/known_facilities_exclusion_index_FECHA.json
```

### Resultado

Separar:

- coincidencia exacta;
- coincidencia probable;
- nuevo probable;
- histórico;
- posible mudanza;
- dirección conflictiva;
- sin ubicación;
- falso positivo;
- servicio que no es ELEPEM.

### Prompt para Codex — Paso 9

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 9.

Re-run Paysandú and Artigas discovery files against the latest national
exclusion index, current app export, OSM records and private candidates.

Dry run only.

Do not create public points.
Do not modify public.residenciales.
Do not geocode yet.
Do not call external services.

Return:

- exact known matches;
- probable matches;
- genuinely unmatched candidates;
- possible moves and rebrands;
- shared phones;
- same-address conflicts;
- historical-only records;
- records without exact addresses;
- what would be inserted into private candidate tables.

Run tests and git diff --check.
Stop after Step 9.
```

---

## Paso 10. Investigar un departamento en ChatGPT Plus/Pro

Este paso ocurre en ChatGPT, no en Codex.

### Archivos que deben estar disponibles en el proyecto de ChatGPT

- índice nacional de exclusión más reciente;
- conflictos;
- exportación actual de la app;
- candidatos privados;
- OSM;
- tabla departamental de referencia;
- fuentes oficiales;
- investigaciones previas.

### Prompt maestro para ChatGPT

Reemplazar `[DEPARTAMENTO]`:

```text
Investiga exhaustivamente todo el departamento de [DEPARTAMENTO] para
descubrir establecimientos de larga estadía para personas mayores que no
aparezcan ya en el índice nacional de exclusión ni en la app.

No te limites a la capital ni a Instagram.

Cubrir:

- todas las ciudades, villas, pueblos, barrios y zonas suburbanas;
- Google Maps y resultados públicos asociados cuando sean accesibles;
- Instagram público e indexado;
- Facebook público e indexado;
- sitios propios;
- Linktree;
- enlaces públicos de WhatsApp Business;
- directorios;
- 1122;
- OpenStreetMap;
- Overture;
- Waze y Apple Maps cuando exista una ficha pública verificable;
- radios y medios locales;
- avisos comerciales;
- clasificados;
- anuncios de empleo;
- publicaciones de intendencias y municipios;
- iglesias, clubes, escuelas y organizaciones comunitarias;
- campañas, donaciones, eventos y actividades;
- fuentes MSP, MIDES, PACP e históricas;
- búsquedas inversas por nombre, teléfono, dirección, correo, dominio y usuario;
- variantes ortográficas;
- español y portugués cuando corresponda.

No usar la API oficial de Instagram o Facebook.
No iniciar sesión.
No acceder a perfiles privados.
No descargar masivamente publicaciones, fotos, comentarios o seguidores.
No recopilar datos de residentes.

Por cada pista:

1. Comparar con el índice de exclusión.
2. Determinar si es una sede física distinta.
3. Buscar señales de actividad de 2025 o 2026.
4. Buscar una dirección, teléfono o ubicación concreta.
5. Buscar fuentes independientes.
6. Detectar alias, mudanzas, rebranding, cadenas y reutilización de domicilio.
7. Conservar URL, fecha, afirmación observada y limitación de cada fuente.
8. No inferir estado administrativo por ausencia de una lista.

Entregar:

- [departamento]_chatgpt_public_candidates_FECHA.json
- [departamento]_chatgpt_public_review_FECHA.csv
- [departamento]_chatgpt_public_research_report_FECHA.md
- [departamento]_chatgpt_search_log_FECHA.md

Clasificar cada registro como:

- known_exact_match
- probable_known_match
- probable_new_current
- needs_more_evidence
- address_missing
- historical_only
- possible_move_or_rebrand
- false_positive
- not_elepem

No colocar coordenadas inventadas.
No declarar ilegalidad o falta de habilitación.
```

### Archivos resultantes

Copiar a:

```text
data/discovery/[departamento]/
```

---

## Paso 11. Verificación controlada con Google Maps

Google se usa después de que ChatGPT haya producido candidatos.

### Objetivo

Confirmar que una pista pública corresponde a una ficha concreta y vincular su `place_id`.

### No es objetivo

- enumerar todo Uruguay automáticamente;
- copiar la base de Google;
- importar nombres, direcciones o teléfonos como datos canónicos;
- guardar reseñas, fotos o ratings;
- geocodificar el mapa desde Places.

### Herramienta local recomendada

```text
scripts/google-place-verify.ts
```

Comando conceptual:

```bash
npm run google:verify-place -- \
  --candidate-key "..." \
  --query "nombre + dirección independiente" \
  --limit 3 \
  --dry-run
```

### Persistencia permitida

```text
candidate_key
google_place_id
google_maps_url
verification_query_hash
verified_at
verified_by
verification_status
```

### Persistencia no permitida

```text
google_raw_response
google_reviews
google_rating
google_review_count
google_photos
google_phone
google_coordinates
google_hours
```

### Prompt para Codex — Paso 11

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 11.

Implement or adapt a local controlled Google place verification tool.

Requirements:

- read the key from the existing server-only environment variable;
- never print or persist the key;
- Places API (New);
- POST requests;
- exact candidate verification only;
- dry-run by default;
- explicit --limit and --max-requests;
- timeout and retry;
- minimal field mask;
- no wildcard field mask;
- no reviews, photos, ratings, phone, hours or coordinates;
- do not persist the raw Google response;
- persist only selected place_id, external Maps URL, verification timestamp,
  reviewer and query hash;
- no nationwide enumeration;
- no automatic candidate creation;
- tests use fixtures and never call Google.

Show the diff and an exact one-record smoke-test command.
Do not run a live batch.
Stop after Step 11.
```

---

## Paso 12. Deduplicación en Codex

### Comparar cada candidato contra

- índice nacional de exclusión;
- `public.residenciales`;
- candidatos privados;
- observaciones;
- OSM;
- alias;
- direcciones;
- teléfonos;
- correos;
- dominios;
- redes;
- `place_id`;
- coordenadas existentes.

### Pesos conservadores

Mayor peso:

- misma dirección exacta;
- mismo teléfono verificado;
- mismo correo;
- mismo dominio;
- mismo `place_id`;
- coordenadas cercanas y departamento coherente.

Menor peso:

- nombre;
- palabras genéricas;
- descripciones;
- categoría.

### Reglas

- devolver tres coincidencias posibles;
- explicar cada componente;
- no fusionar automáticamente;
- una cadena puede tener varias sedes;
- una sede mudada no es automáticamente una sede nueva;
- dirección reutilizada requiere revisión;
- conflicto de departamento penaliza fuertemente;
- número contaminado por PDF no puede ser una clave fuerte.

### Prompt para Codex — Paso 12

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 12 for the selected department file.

Perform a dry-run comparison against the national exclusion index, current
app, OSM and private candidates.

Return:

- exact matches;
- probable matches;
- unmatched probable new facilities;
- historical-only records;
- possible moves or rebrands;
- same-address conflicts;
- shared-phone conflicts;
- records lacking exact location;
- false positives;
- non-ELEPEM services;
- three best match candidates with explainable score components.

Do not write to Supabase.
Do not modify the public map.
Do not call external services.
Run tests and git diff --check.
Stop after Step 12.
```

---

## Paso 13. Revisión humana y segunda investigación

La persona revisora decide:

- vincular a existente;
- mantener como probable match;
- marcar nuevo probable;
- pedir más evidencia;
- marcar histórico;
- marcar duplicado;
- descartar;
- registrar posible mudanza;
- confirmar sede separada.

Los casos ambiguos vuelven a ChatGPT para una segunda pasada focalizada:

```text
Investiga únicamente estos candidatos no resueltos de [DEPARTAMENTO].
Para cada uno, busca por teléfono exacto, dirección exacta, correos, usuarios,
nombres anteriores, publicaciones antiguas y recientes, posibles mudanzas,
cambios de operador y sedes relacionadas.

No agregues candidatos nuevos fuera de esta lista.
Entrega un informe de resolución y fuentes.
```

---

## Paso 14. Importar solamente a la cola privada

Después del `dry-run` y la revisión:

```bash
npm run db:import:social-candidates -- \
  --input data/discovery/[departamento]/[archivo].json \
  --apply
```

El nombre real del comando debe adaptarse a lo que ya existe.

### Reglas

- escribir solo en tablas privadas;
- conservar observación original;
- no sobrescribir datos verificados;
- no borrar fuentes antiguas;
- guardar auditoría;
- no modificar `public.residenciales`;
- no publicar;
- no asignar coordenadas inventadas.

---

## Paso 15. Geocodificar candidatos aceptados con IDE Uruguay

Orden:

1. nuevo probable;
2. dirección independiente;
3. deduplicación aprobada;
4. consulta IDE;
5. revisión del resultado;
6. corrección manual si corresponde;
7. guardar coordenadas y confianza.

No usar coordenadas de Google Places para el mapa no Google.

---

## Paso 16. Mostrar puntos

### Capa privada de revisión

Puede mostrar candidatos:

- C;
- sin estado administrativo confirmado;
- con coordenadas revisadas;
- con fuentes;
- con fecha;
- con advertencias.

### Mapa público

Mantener la regla existente del proyecto:

- nada automático;
- revisión humana;
- evidencia suficiente;
- autorización explícita para publicación.

### Leyenda

```text
Pista pública pendiente de verificación
```

No usar:

```text
No habilitado
Ilegal
Clandestino
Irregular
Peligroso
```

---

## Paso 17. Cerrar el departamento

Generar:

```text
data/reports/[departamento]_coverage_FECHA.md
data/reports/[departamento]_match_report_FECHA.json
data/reports/[departamento]_unresolved_FECHA.csv
```

El informe debe contener:

- localidades cubiertas;
- búsquedas ejecutadas;
- fuentes cubiertas;
- pistas brutas;
- coincidencias conocidas;
- nuevos probables;
- sin dirección;
- históricos;
- falsos positivos;
- servicios no ELEPEM;
- posibles mudanzas;
- conflictos;
- cobertura insuficiente;
- fecha de cierre provisional.

Un departamento se declara:

```text
revisado sistemáticamente
```

Nunca:

```text
completo al 100 %
```

---

## Paso 18. Orden departamental

Primero:

1. revalidar Paysandú;
2. revalidar Artigas.

Luego:

3. Rocha;
4. Soriano;
5. Rivera;
6. Treinta y Tres;
7. Lavalleja;
8. Cerro Largo;
9. San José;
10. Florida;
11. Colonia;
12. Tacuarembó;
13. Durazno;
14. Salto;
15. Río Negro;
16. Flores;
17. Maldonado;
18. Canelones;
19. Montevideo.

### Subdivisiones necesarias

**Canelones:**

- Las Piedras, La Paz y Progreso;
- Ciudad de la Costa;
- Pando y Barros Blancos;
- Costa de Oro;
- Ruta 5;
- Ruta 8;
- Santa Lucía;
- norte departamental.

**Montevideo:**

Investigar por barrio y corredores. No hacer una sola búsqueda “Montevideo”.

---

## Paso 19. Métricas nacionales

Usar la tabla departamental de 1.481 como referencia de cobertura histórica, no como una lista nominal ni como una cantidad exacta de puntos que deben existir hoy.

Registrar por departamento:

```text
referencia_total
conocidos_en_indice
pistas_brutas
exact_matches
probable_matches
probable_new
historical
without_address
false_positive
not_elepem
reviewed_and_imported
publicly_approved
```

No asumir:

```text
faltantes = referencia_total - puntos_del_mapa
```

---

## Paso 20. Pruebas al final de cada fase

Ejecutar cuando existan:

```bash
git diff --check
npm ci
npm run lint
npm run build
npm test
```

Además:

- pruebas enfocadas;
- JSON parseable;
- IDs únicos;
- ninguna clave expuesta;
- ningún `.env` versionado;
- ninguna escritura pública accidental;
- ningún `--apply` no autorizado;
- ninguna llamada real durante tests;
- ninguna coordenada inventada;
- ninguna etapa administrativa colapsada;
- ninguna publicación automática.

---

# Primer paso que debe ejecutarse ahora

1. Copiar este archivo a:

```text
docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md
```

2. Pegar en Codex:

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Execute only Step 1 of the plan.

Update the role separation rules in AGENTS.md.
Confirm that .env files are ignored.
Do not print or modify the Google key.
Do not implement a scraper.
Do not call external services.
Show the diff and run git diff --check.
Stop after Step 1.
```

3. Revisar el diff.

4. No avanzar al Paso 2 hasta que:

- la clave siga secreta;
- `.env` no esté en Git;
- `AGENTS.md` diga que ChatGPT investiga y Codex procesa;
- quede explícito que no se utilizará la API de Instagram;
- quede explícito el uso limitado de Google `place_id`.

5. Después del Paso 2, ejecutar en orden los Pasos 3, 4, 5, 6 y 7. No volver a iniciar investigaciones departamentales hasta que Supabase sea la fuente operativa normalizada y el índice nacional se genere desde allí.

---

# Definición final de responsabilidades

```text
ARCHIVOS Y FUENTES ORIGINALES
    ↓
evidencia inmutable y trazabilidad
    ↓
CODEX + SUPABASE NORMALIZADO
    ↓
fuente operativa única de verdad
    ↓
CHATGPT PLUS/PRO
    ↓
investigación pública departamental
    ↓
JSON + CSV + informe + search log
    ↓
CODEX
    ↓
validación + exclusión + deduplicación + dry-run
    ↓
GOOGLE PLACE-ID VERIFICATION
    ↓
SUPABASE: observaciones + candidatos + revisión
    ↓
IDE URUGUAY
    ↓
revisión humana
    ↓
vista pública aprobada
    ↓
mapa
```

La investigación por nuevos departamentos comienza después de completar y aprobar los Pasos 3 a 7: auditoría, diseño, backfill, corte a Supabase e índice nacional de exclusión.

Este documento es la fuente de verdad operativa para las siguientes fases.
