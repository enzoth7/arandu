# Registro operativo unificado de ELEPEM

Estado al 2026-08-10: migración aditiva, backfill, hardening de URLs y autorización explícita de candidatos geolocalizados aplicados al proyecto productivo confirmado `itolluaivfoxnaohbsdk`. El workspace usa el registro normalizado. La publicación fue una decisión manual y auditada, no una regla automática para candidatos futuros.

Respaldo previo actual: `data/migration/pre_unified_registry_2026-08-10_2026-08-10T19-45-38-873Z.json` (6.202.684 bytes; SHA-256 `4AA893002DAE080FEEDB00C8AE717E927120DEB946648F3230A515E7BA8A09F4`).

Informes de ejecución:

- `data/migration/production_unified_schema_2026-08-10_2026-08-10T21-37-02-015Z.json`;
- `data/migration/unified_registry_2026-08-10_2026-08-10T21-37-13-900Z.json`;
- `data/migration/production_unified_source_hardening_2026-08-10_2026-08-10T21-42-31-173Z.json`;
- `data/migration/production_unified_verification_2026-08-10_2026-08-10T21-44-51-663Z.json`.
- `data/migration/production_publish_all_mapped_candidates_2026-08-10_2026-08-10T22-38-43-450Z.json`.

## Decisiones cerradas

- `elepem_core.facilities` es la única tabla operativa de identidad de establecimientos.
- `public.residenciales` y `discovery_private.facility_candidates` se conservan íntegros como origen y auditoría. No se elimina ninguna fila ni columna.
- Los indicadores oficiales se congelan en `registry_msp_final` y `registry_mides_social`. El backfill exige exactamente 212 MSP y 275 MIDES.
- El estado administrativo generado es uno de `msp_habilitado`, `mides_certificado` o `situacion_no_confirmada`.
- Identidad, ubicación y visibilidad son estados independientes. Un registro sin coordenadas queda en `location_pending` y no aparece en el mapa.
- Una fuente es una URL pública original y clickeable. El nombre del JSON de importación sólo vive en `migration_payload` para trazabilidad interna.
- Los precios son ficticios, mensuales, en UYU y sólo existen para la unión MSP/MIDES. No describen precios reales ni se infieren para situación no confirmada.

## Campos añadidos

| Campo | Uso |
| --- | --- |
| `identity_status` | Identidad confirmada, pendiente, duplicada o descartada. |
| `registry_visibility` | Pública, retenida por identidad/ubicación o archivada. |
| `location_status` | Mapeada, pendiente o rechazada. |
| `registry_msp_final` | Fotografía oficial MSP congelada. |
| `registry_mides_social` | Fotografía oficial MIDES congelada. |
| `administrative_status` | Estado generado sin alterar las dos banderas oficiales. |
| `primary_source_label` | MSP, MIDES, Instagram, Facebook, sitio o directorio. |
| `primary_source_url` | Enlace público original; nunca una URL interna de Supabase. |
| `source_link_status` | Fuente verificada, pendiente o no disponible. |
| `demo_monthly_price_uyu` | Precio mensual ficticio desde, sólo MSP/MIDES. |
| `demo_price_as_of` | Fecha visible del dato ficticio. |
| `demo_price_includes` | Contenido ficticio incluido. |
| `origin_candidate_id` | Enlace reversible al candidato privado original. |
| `migration_payload` | Copia trazable del registro de origen; no se muestra al público. |

## Vistas

- `public.arandu_facilities_registry`: única lectura para los mapas público e institucional. Contiene el padrón consolidado y los candidatos geolocalizados cuya publicación fue autorizada explícitamente por el operador. Los candidatos se muestran como “Situación no confirmada”; el nivel de evidencia interno no funciona como filtro público.

Desde la decisión operativa del 10/08/2026, los candidatos con coordenadas
almacenadas pueden verse en el mapa sin exigir evidencia A/B. La evidencia no se
elimina ni se altera: sigue disponible para auditoría y depuración posterior.
Los candidatos sin coordenadas permanecen retenidos. Los hechos congelados de
MSP (212) y MIDES (275) no cambian.
- `public.arandu_facility_source_links`: una fila por fuente original; sintetiza los enlaces oficiales MSP/MIDES y conserva URLs públicas vinculadas a observaciones.
- `public.arandu_facilities_identity_queue`: pendientes de identidad o ubicación, sin publicación automática.

El runtime cambia de forma reversible con `ELEPEM_DATA_SOURCE=normalized`. El valor predeterminado continúa siendo `legacy` hasta completar el corte controlado.

## Capa de demostración del mapa

La tabla aislada `arandu_demo.facilities` se conserva para pruebas controladas,
pero quedó vacía mediante la migración
`20260810225000_remove_demo_map_facility_rows`. La página no muestra ubicaciones
demo ni altera `elepem_core.facilities`, `public.residenciales`, matching,
resultados o indicadores oficiales.

## Reconciliación esperada

| Control | Resultado esperado |
| --- | ---: |
| Registro público mapeado | 1.019 |
| MSP | 212 |
| MIDES | 275 |
| Situación no confirmada | 702 |
| Candidatos geolocalizados visibles | 145 |
| Candidatos conservados | 229 |
| Pendientes de ubicación | 83 |
| Precios demo | 317 |

La verificación comparó las 801 filas de `public.residenciales` con el respaldo previo. Ambos lados produjeron SHA-256 `7F2AF0F2751DC94DF3E25C709E11221FBC14FB23F5B6AFBDB831634B768AFB9C`, por lo que el padrón legacy no cambió.

Después de excluir correctamente las URLs internas de Supabase hay 2.274 enlaces públicos vinculados a 1.070 instalaciones. En el registro visible, 51 fichas quedan con fuente pendiente: 34 provienen de etiquetas históricas MSP sin URL original conservada y 17 de antiguas importaciones SerpApi/Google que no pueden transformarse automáticamente en enlaces públicos. No se infieren URLs.

Los 83 pendientes se mantienen en la tabla. La consulta controlada a IDE Uruguay del 2026-08-10 encontró 59 con dirección consultable: 14 coincidencias estrictas pendientes de revisión humana y 45 sin coincidencia estricta; 24 carecen de dirección suficiente. El informe está en `data/discovery/unified-location-review-2026-08-10.json` y declara cero escrituras.

## Ejecución segura

1. Ejecutar el preflight de sólo lectura: `npm run db:unify:registry -- --preflight-only`.
2. Guardar un respaldo fuera del flujo público con `npm run db:unify:backup`.
3. Aplicar `supabase/migrations/20260810183000_unify_elepem_registry.sql` al target confirmado.
4. Ejecutar el backfill con `--apply --acknowledge-project=<project-ref>`; el script crea otro respaldo antes de la transacción.
5. Verificar los conteos exactos, links de fuente, RLS y ausencia de escrituras a `public.residenciales`.
6. Activar `ELEPEM_DATA_SOURCE=normalized` sólo en el entorno aprobado.

Rollback de la autorización de visibilidad: `supabase/rollbacks/20260810233000_hold_non_verified_mapped_candidates.sql`. Restaura los estados previos desde el log append-only y retira solamente las direcciones/geocodes auxiliares creados para las 15 filas sin dirección. Rollback de esquema: `supabase/rollbacks/20260810183000_restore_split_elepem_registry.sql`.
