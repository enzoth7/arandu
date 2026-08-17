# Resultado de integración conservadora — fase B

Fecha: 2026-08-16 (America/Montevideo)
Proyecto Supabase: `itolluaivfoxnaohbsdk` (`Alerta Mayor`)

## Autorización recibida

La persona usuaria declaró autoridad para licenciar las 144 fotos asociadas a ELEPEM existentes, confirmó que no exponen personas sin consentimiento y autorizó su envío a revisión privada. También aprobó literalmente:

`Apruebo incluyendo los 4 precios fechados`

Después autorizó literalmente:

`Autorizo corregir las políticas de intake-evidence para hacerlo privado y luego cargar las 144 fotos a revisión.`

Se mantuvo la orden de no subir ninguno de los 56 candidatos.

## Backup y plan

- Backup lógico completo anterior a la escritura: `data/discovery/backups/integration_phase_b_2026-08-16_before.json`.
- Filas completas respaldadas: 90 de `public.elepem`.
- Tamaño: 244.500 bytes.
- SHA-256: `C9D519F66D514529BBE5E620A439B104E59987D0BF367489E592D6E2068E64BD`.
- Fingerprint previo ampliado: `22523fffba79518e72f67190cf133623`.
- Plan exacto: `data/discovery/integration_phase_b_plan_2026-08-16.json`.
- SHA-256 del plan: `567EFA38F4A8DB87A1CDF6014AB6C8B9C15C39C8EF089FF00FBA46442A12A58F`.
- Backup de bucket, políticas, objetos y conteos anterior al cambio: `data/discovery/backups/storage_intake_evidence_2026-08-16_before.json`.
- SHA-256 del backup de Storage: `CB1620D70E40EBC42242471CACDF8E90D3C0DA4298C98879258A45DB4142A1F6`.
- Plan fotográfico exacto: `data/discovery/photo_review_plan_2026-08-16.json`.
- SHA-256 del plan fotográfico: `F6754C9B4FA5D6299445D56758A790BC33D2F37CE51BE6648DB14C88D24822FF`.
- Backup previo a los expedientes de precios sin fecha: `data/discovery/backups/cecilia_undated_prices_private_review_2026-08-16_before.json`.
- SHA-256 del backup: `67CC3CB768B6846FC79EE2963DA7A3AE575736CAA33518EC3C17DE99FC29CB8D`.
- Plan de revisión privada de precios sin fecha: `data/discovery/cecilia_undated_prices_private_review_plan_2026-08-16.json`.
- SHA-256 del plan: `CC2979A54BC833A7D73361D245EC061A07054F23B058CB17C41F348AE1A82F34`.
- Resultado verificable: `data/discovery/cecilia_undated_prices_private_review_result_2026-08-16.json`.
- SHA-256 del resultado: `68B045A6E7EBA346183F596F251CF96DF35CE9C4D1D59B0BDF4C5F0EA6CEE583`.

## Escritura aplicada

La operación atómica se ejecutó a `2026-08-16T07:12:30.879447+00:00`.

- Filas actualizadas: 90.
- Referencias de fuente añadidas: 178.
- Contactos seguros añadidos: 53.
- Precios fechados añadidos: 4.
- Inserts de establecimientos: 0.
- Candidatos insertados: 0.
- Objetos de esquema, tablas, columnas, índices, triggers, funciones o buckets creados/modificados: 0.

Las fuentes Canelones usan referencias deterministas basadas en el hash del JSON. Las fuentes de precios usan referencias deterministas basadas en el hash del CSV Cecilia. Las matrices `fuentes_*` se anexaron coordinadamente.

### Precios

| PK | Código | Precio mensual UYU | Fecha | Fuente |
|---:|---|---:|---|---|
| 57 | `FAC-LEGACY-ELP-0048-2D20813D86F4F23D` | 85.000 | 2026-05-03 | Somos Uruguay |
| 628 | `FAC-LEGACY-MSP24-061-31302148B63DA6AC` | 100.000 | 2025-04-01 | Vitalence |
| 695 | `FAC-LEGACY-MSP24-128-0077C3F2BA4412D2` | 60.000 | 2025-06-12 | Vitalence |
| 728 | `FAC-LEGACY-MSP24-161-7F284E6E017823E0` | 100.000 | 2025-06-13 | Vitalence |

Solo se guardó el mínimo del rango como precio “desde”. Los máximos no tienen columna semánticamente compatible. `precio_es_demo=false` en las cuatro filas.

Los otros 17 registros del archivo no se cargaron como precios canónicos: 11 son históricos y 6 carecen de fecha en la fuente. No se inventaron fechas, no se alteró la restricción de integridad y no se etiquetaron precios históricos como actuales.

Tras la instrucción posterior de cargar los seis precios sin fecha, sus evidencias se incorporaron a revisión privada en seis expedientes `facility_change` reales (`is_demo=false`) y vinculados a las seis sedes existentes. La fecha `2026-08-16` se conservó únicamente como `receivedOn`; `priceEvidence.sourceDate` sigue en `null`, `publicPriceEligible=false` y `canonicalWrite=false`. Los seis expedientes están en estado `received`, generaron seis eventos de recepción y no crearon publicaciones. Los precios canónicos de esas sedes permanecen vacíos hasta confirmar fecha y vigencia.

## Fotografías

Se cargaron las 144 fotos autorizadas de 15 ELEPEM existentes a revisión privada.

- Fotos de candidatos excluidas: 265 de 56 candidatos.
- Expedientes privados creados y finalizados como `received`: 24.
- Adjuntos `facility_photo` registrados: 144.
- Objetos cargados en `intake-evidence`: 144.
- Bytes verificados en disco, Storage y metadatos: 33.025.950.
- Hashes locales verificados antes de cada carga: 144/144.
- Derechos y privacidad confirmados en metadatos: 144/144.
- Publicaciones creadas para estos expedientes: 0.
- Fotos proyectadas públicamente: 0.

Antes de cargar se respaldaron y retiraron exactamente las políticas `Public Select Intake Evidence` y `Public Upload Intake Evidence`. El bucket sigue con `public=false` y no quedan políticas sobre `storage.objects`. La clave publicable lista cero objetos y no puede descargar; `service_role` conserva el acceso servidor necesario.

## Verificación posterior

Rechequeo de datos a `2026-08-16T07:13:23.744107+00:00` y de fotos/Storage a `2026-08-16T07:24:59.994499+00:00`:

- Fingerprint previo a la corrección de Storage: `22523fffba79518e72f67190cf133623`.
- Fingerprint posterior comparable: `ab1b5ac830996e99505c297c20a479f7`. La única mutación estructural intencional es la retirada de las dos políticas públicas respaldadas; no cambiaron tablas, columnas, restricciones, índices ni triggers.
- `public.elepem`: 1.019 filas.
- `public.elepem_sin_ubicacion`: 83 filas.
- Fuentes esperadas presentes: 178/178; faltantes: 0.
- Contactos esperados presentes: 53/53; faltantes: 0.
- Precios exactos: 4/4; diferencias: 0.
- Evidencias de precios sin fecha en revisión privada: 6/6; eventos: 6/6.
- Fechas de fuente inventadas: 0; escrituras canónicas para esas seis evidencias: 0.
- Acceso a `intake_reports`: RLS habilitado, sin privilegio `SELECT` para `anon` ni `authenticated` y sin políticas `SELECT`.
- Filas con matrices de fuentes desalineadas: 0.
- Filas con referencias de fuente duplicadas: 0.
- Dry run pendiente: 0 fuentes, 0 contactos y 0 precios.
- Escrituras de candidatos: 0.
- Expedientes fotográficos recibidos: 24/24.
- Adjuntos fotográficos registrados: 144/144.
- Objetos fotográficos presentes: 144/144.
- Eventos de recepción: 24/24.
- Publicaciones/fotos públicas nuevas: 0/0.
- Prueba de acceso: listado anónimo 0, descarga anónima bloqueada, descarga servidor 200.

## Verificación local

- `npm run lint`: pasa.
- `npm run build`: pasa; 40/40 páginas estáticas.
- `npm run test:discovery`: 6/6.
- `npm run test:matching`: 34/34.
- `npm run test:osm-discovery`: 7/7.
- `npm run test:flat-registry`: 34/34.
- `npm run test:intake`: 13/13.
- `npm run test:institutional`: 40/40.
- Total: 134/134 pruebas pertinentes.

El asesor de seguridad de Supabase no devolvió alertas críticas ni de advertencia; informó ocho observaciones `INFO` de tablas con RLS habilitado y sin políticas, coherentes con tablas cerradas al acceso externo. Referencia del linter: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

El `npm ci` ejecutado durante la fase A falló por un binario SWC abierto en Windows. Las dependencias se restauraron con las versiones del lockfile, sin cambios en `package.json` ni `package-lock.json`.
