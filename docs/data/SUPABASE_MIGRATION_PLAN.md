# Plan de migración al modelo normalizado

Estado: esquema paralelo y backfill aplicados en `itolluaivfoxnaohbsdk` el 2026-08-04. Verificación SQL, RLS, rollback local e idempotencia aprobados. El runtime permanece en `legacy`; el corte de lectura corresponde al Paso 6.

Informe de ejecución: `data/migration/production_normalized_migration_2026-08-04_2026-08-04T21-56-11-230Z.json`.

## Puerta de seguridad

El proyecto conectado identificado durante la auditoría es `itolluaivfoxnaohbsdk` (`Arandú`, región `sa-east-1`) y se trató como producción. La aplicación se realizó únicamente después de la confirmación explícita del target por el responsable del proyecto.

Antes de ejecutar SQL se requiere:

1. Identificador explícito de un proyecto local, test o staging distinto o confirmación inequívoca de su naturaleza no productiva.
2. Backup lógico y exportación verificable de tablas, vistas, funciones, grants, políticas y datos de alcance.
3. Aprobación del modelo, del diccionario, del mapping y de la estrategia de rollback.
4. Credenciales de prueba; nunca credenciales de producción en tests.

La autorización general para ejecutar el plan no reemplaza esta confirmación específica exigida por el Paso 5.

## Artefactos

- Forward: `supabase/migrations/20260803042525_normalized_elepem_core_model.sql`
- Rollback: `supabase/rollbacks/20260803042525_drop_normalized_elepem_core_model.sql`
- Modelo: `docs/data/SUPABASE_TARGET_MODEL.md`
- Diccionario: `docs/data/SUPABASE_COLUMN_DICTIONARY.csv`
- Diagrama: `docs/data/SUPABASE_SCHEMA_DIAGRAM.md`

El plan original solicitaba colocar el rollback bajo `supabase/migrations`. Se conserva en `supabase/rollbacks`, siguiendo el patrón del repositorio, porque un archivo de rollback versionado como migración forward podría ejecutarse automáticamente después de crear el esquema.

## Fase A — Validación en una base desechable

1. Crear o confirmar la base local/test/staging.
2. Aplicar todas las migraciones existentes en orden.
3. Aplicar el forward nuevo una vez.
4. Verificar tablas, FK, checks, índices, triggers, RLS, grants y vistas.
5. Ejecutar de nuevo de manera controlada para comprobar idempotencia lógica. Si la herramienta no permite repetir una versión registrada, ejecutar el cuerpo en una base clonada.
6. Ejecutar el rollback explícito.
7. Confirmar que el esquema vuelve exactamente al estado previo.
8. Reaplicar el forward.

No se valida el rollback sobre el proyecto remoto actual.

## Fase B — Catálogo de fuentes y observaciones de legado

1. Crear entradas estables en `source_catalog` para cada fuente real.
2. Enlazar las corridas y observaciones existentes mediante `source_catalog_id`.
3. Crear una corrida de backfill con hash del conjunto de entrada, fecha y conteos.
4. Representar cada fila heredada mediante una observación del snapshot y conservar su `source_label`; clasificarla en `official_sources`, `public_maps`, `public_social_sources`, `other_public_sources` o `manual_editorial` solamente cuando las banderas o la etiqueta heredada lo demuestren.
5. Los registros Paysandú rotulados `SerpApi Google Maps` se normalizan como `public_maps`; la geocodificación posterior no cambia el canal de hallazgo.
6. No convertir etiquetas genéricas en fuentes inventadas. Registrar conflicto si falta URL, referencia o fecha.

## Fase C — Mapping de IDs y sedes

Para cada fila de `public.residenciales`:

1. Insertar o actualizar de forma idempotente `legacy_facility_map` por `legacy_residencial_id`.
2. Crear una sede solo cuando una dirección física sea suficientemente identificable.
3. Reutilizar una sede únicamente por ID exacto ya aprobado, dirección exacta coherente o revisión humana.
4. Nunca fusionar por nombre solo.
5. Marcar como `conflict` direcciones múltiples, coordenadas compartidas dudosas, mudanzas posibles y duplicados ambiguos.
6. Mantener `facility_id` nulo en mappings pendientes, conflictivos o excluidos.

El backfill debe producir:

- `data/migration/facility_id_mapping_FECHA.csv`
- `data/migration/supabase_backfill_conflicts_FECHA.csv`
- `data/migration/supabase_backfill_audit_FECHA.md`
- `data/migration/supabase_reconciliation_FECHA.json`

## Fase D — Valores normalizados

Para mappings aprobados:

- crear un nombre observado y, si corresponde, uno canónico preferido;
- crear una dirección física actual por valor individual;
- crear un geocódigo `legacy` conservando precisión y etiqueta;
- crear una observación de capacidad si `places` no es nulo;
- convertir cada bandera administrativa verdadera en un evento separado;
- asociar toda fila creada a su observación de origen;
- preservar `created_at` y `updated_at` cuando su significado sea confiable.

Teléfonos, correos o URLs concatenados no se separan automáticamente sin reglas verificadas. Se reportan como conflicto y cada valor aceptado ocupa una fila.

## Fase E — Reconciliar descubrimiento privado

1. Enlazar candidatos ya verificados con `resolved_facility_id` solo por decisión humana registrada.
2. Completar `facility_id` en sugerencias y eventos sin retirar los IDs heredados cuando existan; una sugerencia normalizada sin ID legado solo es válida si `facility_id` está presente.
3. Transferir un ID externo desde candidato/legado a sede únicamente si la identidad fue aprobada.
4. Mantener la restricción de propietario exclusivo del ID externo.
5. Para Google conservar solo `place_id`, URL externa, fecha e identidad revisora; no almacenar respuesta cruda.
6. Ningún `verified_new`, score alto o `public_eligible` cambia por sí mismo `publication_status`.

## Fase F — Reconciliación obligatoria

El informe debe comparar, antes y después:

- total de `public.residenciales` y total de mappings;
- mappings `mapped`, `pending`, `conflict` y `excluded`;
- sedes canónicas, nombres preferidos y direcciones físicas actuales;
- conteos por departamento;
- banderas administrativas antiguas frente a eventos nuevos;
- geocódigos por precisión y grupos de coordenadas compartidas;
- candidatos por estado y nivel de evidencia;
- IDs externos por proveedor y propietario;
- huérfanos FK;
- IDs estables duplicados;
- nombres preferidos o direcciones actuales múltiples;
- filas que aparecerían en `facilities_public_approved`.

Los criterios mínimos son cero huérfanos, cero IDs duplicados, toda fila antigua mapeada o explicada y cero candidatos publicados automáticamente.

## Fase G — Capa de compatibilidad y corte

1. En la primera aplicación, `residenciales_legacy_compat` continúa leyendo `public.residenciales`.
2. El Paso 5 prueba el backfill sin cambiar runtime.
3. El Paso 6 cambia lecturas internas a `facilities_current_internal` y matching a `known_facilities_exclusion_view`, detrás de un switch reversible.
4. Solo tras reconciliar las 21 columnas, redefinir la vista de compatibilidad sobre `facilities_public_approved` o usar un adaptador equivalente.
5. El mapa público consulta el endpoint servidor que lee la vista aprobada; no recibe acceso a tablas privadas.
6. Los archivos JSON/CSV dejan de ser runtime solo después de comprobar igualdad funcional.
7. `public.residenciales` no se renombra ni se elimina en el mismo corte.

## Pruebas requeridas

### SQL y datos

- forward, re-ejecución, rollback y reaplicación en test;
- todas las FK con índice de apoyo;
- checks de fechas, coordenadas, JSON y propietario de IDs externos;
- triggers append-only;
- trigger de publicación A/B;
- vista pública excluye C, privados, históricos e incompletos;
- vista de exclusión incluye legado no mapeado y candidatos activos;
- forma y tipos de la vista legacy coinciden con las 21 columnas actuales.

### Acceso

- `anon`: sin acceso a tablas operativas, privadas ni vistas internas;
- `authenticated` no autorizado: mismo resultado;
- rol de servidor mínimo: solo SELECT sobre las vistas necesarias y escrituras explícitas;
- `service_role`: nunca en navegador y sin acceso accidental por grants implícitos;
- esquema `elepem_core`: no incluido en schemas expuestos por Data API.

### Aplicación

- unitarias, integración, lint y build;
- conteos del mapa y por departamento;
- registros representativos de MSP, MIDES, PACP, APP y referenciales;
- cola de revisión y top-3 de matching;
- rollback del feature flag sin pérdida de datos.

## Rollback

El rollback de estructura se admite solo antes de que el modelo nuevo reciba escrituras exclusivas.

Orden:

1. Apagar el feature flag normalizado.
2. Detener importadores y revisores.
3. Exportar todas las tablas `elepem_core` y columnas de transición.
4. Confirmar que `public.residenciales` sigue íntegra y es todavía la fuente activa.
5. Ejecutar el rollback en el entorno de prueba.
6. Verificar objetos y conteos contra el snapshot previo.

Después del corte con escrituras exclusivas, el rollback debe ser lógico: volver lecturas al adaptador heredado y reconciliar datos, no borrar el esquema con `DROP`.

## Riesgos pendientes

- El proyecto remoto tiene 804 filas, mientras el export local tiene 810, con conjuntos de IDs divergentes; el literal de ID no basta para reconciliar.
- Hay 30 grupos de nombre normalizado/departamento duplicados y 13 grupos de coordenadas compartidas que requieren revisión.
- Las tablas candidatas tienen direcciones/localidades faltantes; no se pueden promover durante el backfill.
- Las migraciones locales y remotas presentan drift semántico y de timestamps.
- La aplicación usa conexión directa como un rol PostgreSQL privilegiado; debe reemplazarse por mínimo privilegio antes del corte.
- Las políticas amplias del bucket privado `intake-evidence` son un riesgo separado y no se corrigen dentro de esta migración de modelo.

## Condición de salida del Paso 5

No avanzar al corte hasta entregar los cuatro artefactos de reconciliación, resultados de RLS, conteos exactos, rollback probado y confirmación humana de que el entorno usado no es producción.
