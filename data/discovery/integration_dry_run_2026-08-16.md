# Integración conservadora de scraping — dry run de fase A

Fecha de revalidación: 2026-08-16 (America/Montevideo)

Proyecto Supabase: `itolluaivfoxnaohbsdk` (`Alerta Mayor`)
Estado: **solo lectura; no se ejecutó ninguna escritura en base ni Storage**.

## Alcance y gate

Este documento revalida contra el esquema vivo la integración de los paquetes Canelones (2026-08-13) y Cecilia (2026-08-14). No crea candidatos, no publica establecimientos, no carga fotografías y no importa precios sin aprobación literal. La fase B debe empezar con backup lógico exacto y una nueva comprobación de fingerprint.

Frases válidas para habilitar la fase B:

- `Apruebo incluyendo los 4 precios fechados`
- `Apruebo sin precios Cecilia`

## Insumos y trazabilidad

### Canelones

La ruta externa indicada originalmente no existe al 2026-08-16. Se revalidó la copia trazable presente en `Cambios/ScrapingEnzo/residenciales_canelones_2026-08-13/`.

- `residenciales.json`: SHA-256 `5E0D5A6B9E72B98A34BCB736B7D78C969850DC0869468E572A7EB811A32F09D1`; 712.974 bytes.
- `README.md`: SHA-256 `141D6B340F80B19B0573602E29BA352A2DDEDDE8D883AF34E85867678435F7FC`.
- 89 residencias semilla, 56 descubiertas, 174 fuentes sobre 87 residencias y 409 referencias de fotografías.
- El hash del JSON coincide con el hash esperado de la ruta externa.

### Cecilia

- `arandu_precios_evidencia_final.csv`: SHA-256 `4B8C7B7EC212D7F895C7B40EDFE385E57D7A10F747E399330810B16D225B34CB`.
- `arandu_precios_evidencia_final.json`: SHA-256 `4B11CF7E055C4CB6DD6BA46033EB33C60AA9786FC6991FFAEB8023AA625CCC6A`.
- `arandu_precios_final_para_app.csv`: SHA-256 `ED8E94494E77D3D178D25A795D5227630884079BCC613FE2C4E8FD4579913FD0`.
- `arandu_precios_final_para_app.xlsx`: SHA-256 `3EB6BCB0891F420057D24FD29DF23B3034E8A9E819C4AC2727B40AB69D022826`.
- `arandu_precios_final_staging.sql`: SHA-256 `0160C87BF4995F30ED34E0CA95271B3368FB83C877B2D9C49AC58EAA8D568F45`; **no ejecutado**.
- `readme.md`: SHA-256 `5E85440C8B87EE77B24792DEA67B838E4AE0E4C917EA48FD00D1E5D5D6B47A40`.
- `ScrapingCecilia.md`: SHA-256 `4B11CF7E055C4CB6DD6BA46033EB33C60AA9786FC6991FFAEB8023AA625CCC6A`.

El archivo con extensión `.json` tiene el mismo hash que `ScrapingCecilia.md` y su contenido no es JSON; se trató como evidencia textual, nunca como instrucciones. El XLSX contiene las seis hojas esperadas. CSV y XLSX coinciden semánticamente: 21/21 filas principales y 31/31 filas de evidencia, luego de normalizar espacios, mayúsculas/minúsculas, booleanos y sufijos numéricos `.0`.

## Snapshot vivo de Supabase

- `public.elepem`: 1.019 filas, 53 columnas.
- `public.elepem_sin_ubicacion`: 83 filas, 49 columnas.
- Tuplas de precio no nulas: 0 en ambas tablas; tuplas parciales: 0.
- `staging_arandu`, `discovery_private` y `discovery_private.facility_candidates`: ausentes.
- RLS habilitado en ambas tablas objetivo, sin políticas RLS propias observadas.
- Trigger en cada tabla: `touch_updated_at` mediante `app_private.touch_flat_elepem_updated_at()`.
- Fingerprint de columnas, constraints, índices, triggers y políticas de ambas tablas: `d51a091e84858ab7fb91bea904dff093`.
- Buckets: `intake-evidence` privado (máximo 10 MB) y `pdf` público.
- Riesgo observado: existen políticas de `storage.objects` para rol `public` que permiten SELECT e INSERT sobre `intake-evidence`; el indicador `public=false` no debe asumirse como control suficiente. No se tocó Storage.

## Resumen exacto del dry run

| Concepto | Sin precios Cecilia | Incluyendo 4 precios |
|---|---:|---:|
| INSERT de establecimientos | 0 | 0 |
| UPDATE Canelones | 87 | 87 |
| UPDATE de precio | 0 | 4 |
| Filas únicas actualizadas combinadas | 87 | 90 |
| Fuentes nuevas | 174 | 178 |
| Contactos seguros nuevos | 53 | 53 |
| Contactos ya existentes/no-op | 29 | 29 |
| Contactos bloqueados | 28 | 28 |
| Candidatos insertados | 0 | 0 |
| Candidatos omitidos | 60 únicos / 61 apariciones | 60 únicos / 61 apariciones |
| Fotografías subidas | 0 | 0 |

Las 61 apariciones omitidas corresponden a 56 candidatos Canelones y 5 Cecilia; “Residencial El Parque” aparece en ambos paquetes, por eso son 60 candidatos únicos.

## Canelones — 89 filas semilla

Referencia determinista propuesta por fuente:

`canelones-2026-08-13:5e0d5a6b9e72b98a34bcb736b7d78c969850dc0869468e572a7eb811a32f09d1:<legacy_id>:<source_id>`

Mapeo de tipos: `official_registry → official`, `directory → public_directory`, `official_website → facility_website`, `press → news`.

| PK | Código vivo | legacy_id | Nombre vivo | Fuentes nuevas | Contactos seguros | Contactos bloqueados | Acción |
|---:|---|---|---|---|---:|---:|---|
| 20 | FAC-LEGACY-ELP-0003-5438DDD8DB3C4B14 | ELP-0003 | Establecimiento sin nombre publicado (034/2018) | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 21 | FAC-LEGACY-ELP-0004-EEC62519E36ECC62 | ELP-0004 | Abril | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 22 | FAC-LEGACY-ELP-0005-83AF34105B0A7FBD | ELP-0005 | ALONSO HOGAR DE ANCIANOS DRA. ROCIO STECIANO ALONSO | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 23 | FAC-LEGACY-ELP-0006-6E3F1CFA89335BAF | ELP-0006 | Altos del Pinar | 3 (src_001, src_002, src_003) | 5 | 0 | UPDATE propuesto |
| 24 | FAC-LEGACY-ELP-0007-0F0B0EE287155CBB | ELP-0007 | Biltmore | 5 (src_001, src_002, src_003, src_004, src_005) | 3 | 0 | UPDATE propuesto |
| 25 | FAC-LEGACY-ELP-0008-9602786A674FE8FA | ELP-0008 | Bonsejour La Costa | 6 (src_001, src_002, src_003, src_004, src_005, src_006) | 12 | 0 | UPDATE propuesto |
| 26 | FAC-LEGACY-ELP-0009-166B9B54E03ED552 | ELP-0009 | Calidad de Vida | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 27 | FAC-LEGACY-ELP-0010-5DDDBBACB37040F9 | ELP-0010 | La Casona | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 28 | FAC-LEGACY-ELP-0011-6028818C56BC9219 | ELP-0011 | Centro Vital | 4 (src_001, src_002, src_003, src_004) | 0 | 3 | UPDATE propuesto |
| 29 | FAC-LEGACY-ELP-0012-2B56D298C2316A63 | ELP-0012 | CENTRO VITAL | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 30 | FAC-LEGACY-ELP-0013-F1F2959AF364BC6E | ELP-0013 | Dra Teresita | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 31 | FAC-LEGACY-ELP-0014-FCC4CB2004959928 | ELP-0014 | El Bosque | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 32 | FAC-LEGACY-ELP-0015-41ED01B6D4DF92CA | ELP-0015 | El Es Mi Paz | 6 (src_001, src_002, src_003, src_004, src_005, src_006) | 2 | 1 | UPDATE propuesto |
| 33 | FAC-LEGACY-ELP-0016-68CDC0BDDE9D0387 | ELP-0016 | El Hogar | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 34 | FAC-LEGACY-ELP-0019-E46AE17AFFE94467 | ELP-0019 | El Otoñal | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 35 | FAC-LEGACY-ELP-0020-80BCF604D11FEDF4 | ELP-0020 | El Renacer | 3 (src_001, src_002, src_003) | 0 | 0 | UPDATE propuesto |
| 36 | FAC-LEGACY-ELP-0021-EF916F2CAE37CB6A | ELP-0021 | EL RENACER | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 37 | FAC-LEGACY-ELP-0024-38EB901A3CF2C124 | ELP-0024 | Establecimiento Astenkeph | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 38 | FAC-LEGACY-ELP-0025-592730C516D57E24 | ELP-0025 | Girasol | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 39 | FAC-LEGACY-ELP-0026-8F51A84180D3CF80 | ELP-0026 | GRACIAS A DIOS | 2 (src_001, src_002) | 3 | 1 | UPDATE propuesto |
| 40 | FAC-LEGACY-ELP-0027-9B25D8427C84C022 | ELP-0027 | Graciela Hernández | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 41 | FAC-LEGACY-ELP-0028-348FD93CBE1D2C61 | ELP-0028 | Hogar Ana Arriola De Ado | 5 (src_001, src_002, src_003, src_004, src_005) | 0 | 0 | UPDATE propuesto |
| 42 | FAC-LEGACY-ELP-0029-E2EEF787A24FD67A | ELP-0029 | Hogar Ana Maria Y Beatriz Izquierdo | 3 (src_001, src_002, src_003) | 0 | 0 | UPDATE propuesto |
| 43 | FAC-LEGACY-ELP-0030-A980DAC78CAD2AC0 | ELP-0030 | Hogar Ana Maria y Beatriz IZQUIERDO / Susana Izquierdo | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 44 | FAC-LEGACY-ELP-0031-ED0F0B9FFDDC8075 | ELP-0031 | HOGAR DE ANCIANOS DRA. ROCIO STECIANO | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 45 | FAC-LEGACY-ELP-0032-6739A3CA551578D4 | ELP-0032 | Hogar Intergeneracional De Pando | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 46 | FAC-LEGACY-ELP-0033-37E55E3B86BDED85 | ELP-0033 | HOGAR De Ancianos PUGA SORIA | 2 (src_001, src_002) | 0 | 0 | UPDATE propuesto |
| 47 | FAC-LEGACY-ELP-0034-2C131A7206EBDB7D | ELP-0034 | Hogar de Ancianos San Antonio | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 48 | FAC-LEGACY-ELP-0036-804A5D43730D5EE0 | ELP-0036 | Hogar Maranata | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 49 | FAC-LEGACY-ELP-0038-CD01F108CA02F2EC | ELP-0038 | Hogar Máximo Cenoz Hita | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 50 | FAC-LEGACY-ELP-0039-E46F458A1FA5EE79 | ELP-0039 | Residencial La Familia | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 51 | FAC-LEGACY-ELP-0040-EF52A5740A8B7D53 | ELP-0040 | Hogar Tapia | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 52 | FAC-LEGACY-ELP-0041-000D6554FD4258D3 | ELP-0041 | JACARANDA | 2 (src_001, src_002) | 2 | 0 | UPDATE propuesto |
| 53 | FAC-LEGACY-ELP-0042-DF71EAC0626E40F7 | ELP-0042 | LA AURORA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 54 | FAC-LEGACY-ELP-0045-E127E8EEBDBB3250 | ELP-0045 | LA CAROLINA | 2 (src_001, src_002) | 0 | 3 | UPDATE propuesto |
| 55 | FAC-LEGACY-ELP-0046-CA86CB19F6FD69E8 | ELP-0046 | LA CASA NARANJA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 56 | FAC-LEGACY-ELP-0047-C5A21E35C1EFBEED | ELP-0047 | LA ESPERANZA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 57 | FAC-LEGACY-ELP-0048-2D20813D86F4F23D | ELP-0048 | La Estancia Hotel Residencial | 7 (src_001, src_002, src_003, src_004, src_005, src_006, src_007) | 1 | 0 | UPDATE propuesto |
| 58 | FAC-LEGACY-ELP-0049-69E6FC51CD807CAE | ELP-0049 | La Familia | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 59 | FAC-LEGACY-ELP-0050-C5982492DEEC827C | ELP-0050 | La Posada | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 60 | FAC-LEGACY-ELP-0051-4610FB1E2D8F1473 | ELP-0051 | La Quinta | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 61 | FAC-LEGACY-ELP-0053-18C7E07265E470E1 | ELP-0053 | LA SOÑADA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 62 | FAC-LEGACY-ELP-0054-236FC8BD762F8822 | ELP-0054 | La Tacuara | 2 (src_001, src_002) | 2 | 0 | UPDATE propuesto |
| 63 | FAC-LEGACY-ELP-0055-35E9A3FBB6509030 | ELP-0055 | LOS LAGOS | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 64 | FAC-LEGACY-ELP-0056-F35989C075D724E7 | ELP-0056 | Luz Del Sol | 5 (src_001, src_002, src_003, src_004, src_005) | 0 | 3 | UPDATE propuesto |
| 65 | FAC-LEGACY-ELP-0058-04FCAE3D89A54217 | ELP-0058 | MALLET | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 66 | FAC-LEGACY-ELP-0059-AD3543D4D2CD9395 | ELP-0059 | Mi Lugar | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 67 | FAC-LEGACY-ELP-0060-E5ECCF9A47D4EF81 | ELP-0060 | Mi Sueño | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 68 | FAC-LEGACY-ELP-0061-832704BFDD4B4794 | ELP-0061 | MIS CONSENTIDOS | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 69 | FAC-LEGACY-ELP-0062-06DC857CD9C15044 | ELP-0062 | NOA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 70 | FAC-LEGACY-ELP-0063-9F05930A7FA976C4 | ELP-0063 | NUEVO AMANECER | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 71 | FAC-LEGACY-ELP-0064-1BEC0DD0F246B044 | ELP-0064 | Pinares | 3 (src_001, src_002, src_003) | 0 | 0 | UPDATE propuesto |
| 72 | FAC-LEGACY-ELP-0065-5BCFE471BF09053C | ELP-0065 | PINARES | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 73 | FAC-LEGACY-ELP-0066-0571A6D622ACA084 | ELP-0066 | PRIMAVERA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 74 | FAC-LEGACY-ELP-0068-1A770D97D4059AEA | ELP-0068 | PROCURA RESIDENCIAL EX BELLA ESTDIA | 2 (src_001, src_002) | 1 | 1 | UPDATE propuesto |
| 75 | FAC-LEGACY-ELP-0069-F9333523C753C566 | ELP-0069 | Residencial Del Lago | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 76 | FAC-LEGACY-ELP-0070-386F31ED04B70FF0 | ELP-0070 | Residencia Puentecasa | 4 (src_001, src_002, src_003, src_004) | 8 | 0 | UPDATE propuesto |
| 77 | FAC-LEGACY-ELP-0071-34450F5EC982C3C1 | ELP-0071 | Residencial Brasil | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 78 | FAC-LEGACY-ELP-0072-36CD754A5EC67680 | ELP-0072 | Residencial El Gaucho | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 79 | FAC-LEGACY-ELP-0073-FCA2E4DB4C105B4C | ELP-0073 | Residencial El Ibirapitá | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 80 | FAC-LEGACY-ELP-0074-9ABE55D723D4CB2E | ELP-0074 | Residencial Solís | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 81 | FAC-LEGACY-ELP-0075-D24E0B7334363D22 | ELP-0075 | Residencial En Flia | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 82 | FAC-LEGACY-ELP-0076-3EB23407EF8DCC79 | ELP-0076 | Residencial Estrella | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 83 | FAC-LEGACY-ELP-0077-97ED84EC84AA7ED5 | ELP-0077 | Residencial Hogar San Vicente de Paul | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 84 | FAC-LEGACY-ELP-0078-FDF35F91FD850AFD | ELP-0078 | Residencial Jardines de Neptunia | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 85 | FAC-LEGACY-ELP-0079-C37C4FB92BE9BE58 | ELP-0079 | Residencial Las Tres Marias | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 86 | FAC-LEGACY-ELP-0080-053C6EFDF115C782 | ELP-0080 | Residencial Las Tres Marías | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 87 | FAC-LEGACY-ELP-0081-A6FEBBAA5B82A032 | ELP-0081 | Residencial Margarita Susana Rodriguez Llull | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 88 | FAC-LEGACY-ELP-0082-E1FF8E3E82044750 | ELP-0082 | Residencial Maria Bacelar | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 89 | FAC-LEGACY-ELP-0083-E08F6830376576C0 | ELP-0083 | Residencial Mi Sueño | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 90 | FAC-LEGACY-ELP-0084-A8FD3CB4EF514F8E | ELP-0084 | Residencial Olimpo | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 91 | FAC-LEGACY-ELP-0086-0211EE004313F86B | ELP-0086 | Residencial Romanela | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 92 | FAC-LEGACY-ELP-0087-B01460CB368D2247 | ELP-0087 | Residencial Senescentis II | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 93 | FAC-LEGACY-ELP-0088-B7FCAAEF19E8FF32 | ELP-0088 | Residencial Sol y Aire | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 94 | FAC-LEGACY-ELP-0089-B035726733B56B8B | ELP-0089 | Residencial Sol y Aire | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 95 | FAC-LEGACY-ELP-0090-F7F06503E5098D4A | ELP-0090 | SOLYMAR | 2 (src_001, src_002) | 6 | 0 | UPDATE propuesto |
| 96 | FAC-LEGACY-ELP-0091-83847C93A376C0F4 | ELP-0091 | SAN CONO | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 97 | FAC-LEGACY-ELP-0092-659F60900D60E0E8 | ELP-0092 | Senescentis Ii | 4 (src_001, src_002, src_003, src_004) | 0 | 0 | UPDATE propuesto |
| 98 | FAC-LEGACY-ELP-0094-4A330A3829F82596 | ELP-0094 | SOL DE ATLÀNTIDA | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 99 | FAC-LEGACY-ELP-0096-C9BAF4690DC19E1B | ELP-0096 | Solange Alejandra Amaya | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 100 | FAC-LEGACY-ELP-0097-EB91C9983B560C55 | ELP-0097 | Taita Guazú | 1 (src_001) | 0 | 0 | UPDATE propuesto |
| 733 | FAC-LEGACY-MSP24-166-385A3FED68F2D9DF | MSP24-166 | La Bonne Vie | 3 (src_001, src_002, src_003) | 0 | 3 | UPDATE propuesto |
| 734 | FAC-LEGACY-MSP24-167-AC35210625FE2694 | MSP24-167 | Seniority Magna | 4 (src_001, src_002, src_003, src_004) | 2 | 4 | UPDATE propuesto |
| 735 | FAC-LEGACY-MSP24-168-417BC7C33AFFB8F6 | MSP24-168 | Residencial Primavera | 2 (src_001, src_002) | 0 | 2 | UPDATE propuesto |
| 736 | FAC-LEGACY-MSP24-169-E9DA0C1CBF11911B | MSP24-169 | En Familia | 3 (src_001, src_002, src_003) | 1 | 4 | UPDATE propuesto |
| 737 | FAC-LEGACY-MSP24-170-B1591D79C0ADFBE3 | MSP24-170 | La Rochelle | 4 (src_001, src_002, src_003, src_004) | 3 | 2 | UPDATE propuesto |
| 785 | FAC-LEGACY-MSPREG24-012-F1E0950A9E83CD40 | MSPREG24-012 | Solana | 1 (src_001) | 2 | 1 | UPDATE propuesto |
| 786 | FAC-LEGACY-MSPREG24-013-6BD2A843D798B064 | MSPREG24-013 | El Naranjo | 0 () | 0 | 0 | sin cambio |
| 787 | FAC-LEGACY-MSPREG24-014-05C411B012994DFC | MSPREG24-014 | Hogar Huellas | 0 () | 0 | 0 | sin cambio |

Resultado: los 89 `legacy_id` emparejan exactamente una fila viva y 89 PK distintas. Las 174 referencias propuestas están ausentes actualmente. `MSPREG24-013` y `MSPREG24-014` son las dos únicas filas sin cambio.

### Contactos seguros propuestos

- `ELP-0006`: emails `admaltosdelpinar@hotmail.com`, `info@altosdelpinar.com.uy`; web `https://www.altosdelpinar.com.uy/`; teléfonos `+59826967222`, `+59895572136`.
- `ELP-0007`: email `sanchezdie@hotmail.com`; web `http://residencialbiltmore.com.uy`; teléfono `+59897304574`.
- `ELP-0008`: emails `bonsejour@bonsejour.uy`, `info@bonsejour.com.uy`, `info@bonsejour.uy`; Facebook `https://facebook.com/BonSejour-Hotel-Residencial-104270191678206`; Instagram `https://instagram.com/bonsejour.residencial/`; WhatsApp `https://wa.me/+59899210870`; web `https://www.bonsejour.uy/bonsejour-ciudad-de-la-costa`; teléfonos `+59826001772`, `+59891034918`, `+59892004620`, `+59894753004`, `+59899210870`.
- `ELP-0015`: WhatsApp `https://wa.me/59895023228?text=Desde%20Guía Móvil 1122`; teléfono `+59895023228`.
- `ELP-0026`: teléfonos `+59843727341`, `+59899027729`, `+59899694858`.
- `ELP-0041`: teléfonos `+59898361050`, `+59899365009`.
- `ELP-0048`: web `https://laestanciaresidencial.com/`.
- `ELP-0054`: web `http://www.latacuararesidencial.com.uy`; teléfono `+59826982021`.
- `ELP-0068`: teléfono `+59826817832`.
- `ELP-0070`: email `geriatricopuentecasa@gmail.com`; Instagram `https://www.instagram.com/residencialpuentecasa/`; WhatsApp `https://wa.me/59899974902`; webs `https://www.residencialpuentecasa.com` y `https://www.residencialvillapuente.com/`; teléfonos `+59843717818`, `+59898576861`, `+59899974902`.
- `ELP-0090`: email `residencialsolymaruy@gmail.com`; Facebook `https://www.facebook.com/ResidencialSolymar`; Instagram `https://www.instagram.com/residencialsolymar/`; teléfonos `+59826958570`, `+59826965758`, `+59899125907`.
- `MSP24-167`: Facebook `https://www.facebook.com/senioritymagna` y web `https://residencialmagnaseniority.com/landing-consultas/`.
- `MSP24-169`: teléfono `+59891478410`.
- `MSP24-170`: email `zmipeixoto@gmail.com`; Facebook La Rochelle; teléfono `+59899751800`.
- `MSPREG24-012`: teléfonos `+59843753861`, `+59895055590`.

Total: 113 elementos crudos → 110 valores normalizados únicos → 53 anexos seguros, 29 no-op y 28 bloqueados. La detección final busca teléfonos dentro de celdas vivas concatenadas y reclasifica Facebook, Instagram y WhatsApp a sus arrays semánticos.

### Contactos bloqueados

- `ELP-0011`, `ELP-0045` y `ELP-0056`: email compartido `soniadearmas5@gmail.com` y teléfonos `+59898780144`, `+59899911276`.
- `ELP-0015`, `ELP-0026`, `ELP-0068` y `MSPREG24-012`: enlace genérico compartido `wa.link/eg6lfo`.
- `MSP24-166`: `reslabonnevie@gmail.com`, `+59826989926`, `+59895394278` ya asociados a PK 805.
- `MSP24-167`: `magnacoordinacion@gmail.com`, `+59826002601`, `+59826003938`, `+59898434382` en PK 803/807.
- `MSP24-168`: `+59823653941`, `+59892244302` en PK 19.
- `MSP24-169`: `natiajv@hotmail.com`, `+59823622190`, `+59899658237`, `+59899685065` en PK 803/41.
- `MSP24-170`: `wa.link/eg6lfo` y `+59826824963` en PK 806.

No se propone fusión de identidades. Una fila puede recibir sus valores seguros aunque otros valores de esa misma fila queden bloqueados.

## Canelones — 56 descubiertos

Criterio conservador: coincidencia exacta de teléfono/email/URL, o dirección normalizada exacta más localidad. Todo candidato se omite aunque exista una relación probable/posible.

| ID candidato | Nombre paquete | Clasificación | Relación viva / acción |
|---|---|---|---|
| WEB-26EB87E2DD | Residencial Las Calandrias | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-506DF0EC0B | Vila de Rosa | probable (señal fuerte) | PK 1013 · FAC-CANDIDATE-71 · Vila de Rosa |
| WEB-3CD22AD103 | Achiras | probable (señal fuerte) | PK 940 · FAC-CANDIDATE-70 · Achiras |
| WEB-D719237F2B | El Hogar | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-D8BA8ED85B | Kairos 1 | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-04BAA81D89 | Kairos 2 | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-71EDB2071B | La Macarena | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-790C2A8E53 | LA MAISONETTE | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-B2CAA47A0A | La oliva | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-841830BF64 | La Rosada | probable (señal fuerte) | PK 930 · FAC-CANDIDATE-52 · La Rosada |
| WEB-2BC23D6D50 | Hogar San Blas | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-CAD740E554 | Altos de la Paz | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-E6DA09D530 | Residencial El Parque | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-4FF89C9223 | RESIDENCIAL EN LAS PIEDRAS | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-9B6116FF00 | RESIDENCIAL ABU | probable (señal fuerte) | PK 906 · FAC-CANDIDATE-96 · Residencial Abu |
| WEB-52075E418C | ALTA GRACIA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-8C8BF63875 | RESIDENCIAL BOUTIQUE COLIBRI | probable (señal fuerte) | PK 1012 · FAC-CANDIDATE-58 · Colibrí |
| WEB-CB672739C0 | Brisas del Mar | probable (señal fuerte) | PK 968 · FAC-CANDIDATE-103 · Brisas del Mar |
| WEB-5FA200D5E4 | CASA HOGAR LAS LUNAS | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-E810BA9F60 | CASONA DE RETIRO | probable (señal fuerte) | PK 920 · FAC-CANDIDATE-51 · Casona Retiro |
| WEB-138B7F5E2C | HOGAR CERVIERI | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-FB70955484 | HOGAR CIELITO | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-94620C345A | RESIDENCIAL DE ANCIANOS SALINAS | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-D15D892F56 | El Bienestar Hogar Canelones | probable (señal fuerte) | PK 928 · FAC-CANDIDATE-47 · Bienestar |
| WEB-285B84CD01 | RESIDENCIAL ESPERANZA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-DA9201D1A8 | RESIDENCIAL ESPERANZA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-324D0DCA05 | EUBLANA RESIDENCIAL | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-F90C6D1CBA | GENESIS HOGAR FEMENINO | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-B4B56A78B4 | Golden Age Residencial | probable (señal fuerte) | PK 991 · FAC-CANDIDATE-49 · Golden Age |
| WEB-3B394470B1 | RESIDENCIAL GUGA | probable (señal fuerte) | PK 946 · FAC-CANDIDATE-78 · Residencial Guga |
| WEB-B343C7CB80 | RESIDENCIAL HILOS PLATEADOS | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-C37BF3D7E6 | HOSTERIA LUZ MARINA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-588E92AABA | RESIDENCIAL JACARANDÁ | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-A303D7574F | LA CASA DE MAMA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-6F997C0C8F | HOGAR LA FAMILIA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-AC237D6F94 | RESIDENCIAL LA FAMILIA | probable | PK 69 · ELP-0062 · NOA · dirección/localidad compatibles |
| WEB-89E8F0B809 | RESIDENCIAL LO DE MAMÁ | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-5C6B80D8CC | RESIDENCIAL LO DE MAMA 2 | probable (señal fuerte) | PK 1079 · FAC-CANDIDATE-54 · Lo de Mamá 2 |
| WEB-280005A351 | LOS AÑOS DORADOS | posible | PK 40 · ELP-0027 · Graciela Hernández · dirección parcial |
| WEB-C5873075B7 | HOGAR RESIDENCIAL Mª CRISTINA | probable (señal fuerte) | PK 947 · FAC-CANDIDATE-80 · María Cristina |
| WEB-BD057900CE | MI NUEVA FAMILIA | probable (señal fuerte) | PK 1078 · FAC-CANDIDATE-57 · Mi Nueva Familia |
| WEB-6C184E58FB | HOGAR MI SUEÑO | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-D1F1A2877A | NUESTRO HOGAR | probable | PK 787 · MSPREG24-014 · Hogar Huellas · dirección/localidad compatibles |
| WEB-C729C8F8D7 | Residencial Nuestro Mundo | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-E406F39AA5 | Residencial Nuevo Vivir | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-419073D4F7 | PHOENIX RESIDENCIAL | probable (señal fuerte) | PK 942 · FAC-CANDIDATE-74 · Phoenix |
| WEB-F8A28EFF42 | Residencial Reina de las Flores | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-6CCA000AFF | RESIDENCIAL RENACER | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-00AE588DB0 | RESIDENCIA SALINAS | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-A9759E666B | RESIDENCIAL SAN BAUTISTA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-1327E582DF | SAN CONO | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-AB0299884E | SAN PABLO | probable (señal fuerte) | PK 948 · FAC-CANDIDATE-82 · San Pablo |
| WEB-14ADFF357C | RESIDENCIAL SHANGRILA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-E4CF604A63 | RESIDENCIAL VIATA DEMNA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-E2A6A37A50 | RESIDENCIAL VIDAL Y CIA | sin match suficiente | nuevo/no vinculado; omitir |
| WEB-8BED0E6C1B | RESIDENCIAL ZAFIROS | sin match suficiente | nuevo/no vinculado; omitir |

Distribución: 17 probables, 1 posible y 38 sin match suficiente. Que un código vivo empiece por `FAC-CANDIDATE` no se interpreta como estado de cola: esas filas ya están en la tabla pública.

## Fotografías Canelones

- 409 referencias JSON y 409 archivos únicos en disco.
- Faltantes, huérfanos, hashes distintos, tamaños distintos, dimensiones distintas, MIME distinto y errores de lectura: 0.
- Las 409 tienen `license=unknown` y `people_review_status=not_reviewed`.
- Autorizadas para subir: 0. Todas se omiten.

El directorio `fotos/` ya estaba sin seguimiento en Git antes de esta tarea; no se modificó, eliminó ni añadió al índice.

## Cecilia — 21 filas principales

| PK | Código vivo | Establecimiento | Estado paquete | Fecha fuente | Mín. UYU | Máx. UYU (no importable) | Evidencia | Acción |
|---:|---|---|---|---|---:|---:|---|---|
| 23 | FAC-LEGACY-ELP-0006-6E3F1CFA89335BAF | Altos del Pinar | historical | 2012-05-15 | 35000 | 80000 | BASE-020 \| BASE-021 | omitir: histórico |
| 57 | FAC-LEGACY-ELP-0048-2D20813D86F4F23D | La Estancia Hotel Residencial | current_dated | 2026-05-03 | 85000 | 135000 | BASE-001 \| BASE-002 | precio elegible, condicionado a aprobación |
| 97 | FAC-LEGACY-ELP-0092-659F60900D60E0E8 | Senescentis II | current_undated | Sin fecha visible | 42500 | 42500 | BASE-010 | omitir: sin fecha ISO real |
| 199 | FAC-LEGACY-ELP-0225-1E6FEE63E2AC3E6B | La Candelaria | historical | 2020-11-16 | 80000 | 120000 | BASE-014 | omitir: histórico |
| 610 | FAC-LEGACY-MSP24-043-F296BAA525093376 | Aguas de Reposo | current_undated | Sin fecha visible | 38000 |  | BASE-008 | omitir: sin fecha ISO real |
| 605 | FAC-LEGACY-MSP24-038-EF27E2634E365AAF | Altos del Centro | current_undated | Sin fecha visible | 50000 |  | BASE-006 | omitir: sin fecha ISO real |
| 628 | FAC-LEGACY-MSP24-061-31302148B63DA6AC | Altos del Parque 1 | current_dated | 2025-04-01 | 100000 | 120000 | BASE-004 | precio elegible, condicionado a aprobación |
| 728 | FAC-LEGACY-MSP24-161-7F284E6E017823E0 | Altos del Parque 2 | current_dated | 2025-06-13 | 100000 | 100000 | BASE-005 | precio elegible, condicionado a aprobación |
| 323 | FAC-LEGACY-ELP-0427-C438EEBBD66E1884 | Hogar Amelia Ruano de Schiaffino | historical | 2019-07-21 | 35000 | 35000 | BASE-025 | omitir: histórico |
| 333 | FAC-LEGACY-ELP-0448-898D6DD9A7C54857 | Hotel Continental Senior | historical | 2016-09-11 | 35000 | 58000 | NEW-001 \| NEW-002 | omitir: histórico |
| 425 | FAC-LEGACY-ELP-0606-F6306003DF5F90F8 | Humana Residencial | historical | 2019 aprox. | 125000 | 125000 | BASE-017 | omitir: histórico |
| 678 | FAC-LEGACY-MSP24-111-D0D05002AAEC40A3 | La Maison Senior Apartments | historical | 2016-09-11 |  | 201070 | NEW-003 | omitir: histórico |
| 346 | FAC-LEGACY-ELP-0479-2A28F8D0ADC27059 | LAR - Centro | historical | 2019-07-21 | 120000 |  | BASE-023 | omitir: histórico |
| 639 | FAC-LEGACY-MSP24-072-811E25FC964E9DA9 | Los Alpes | historical | 2019-07-21 | 40000 | 40000 | BASE-024 | omitir: histórico |
| 578 | FAC-LEGACY-MSP24-011-690FB5E8DE8BD869 | Manas Home / MH Residencial | current_undated | Sin fecha visible | 65000 |  | BASE-009 | omitir: sin fecha ISO real |
| 286 | FAC-LEGACY-ELP-0350-1A44EC6E54F3F2D9 | Moirú | historical | 2021-12-24 | 45000 | 75000 | BASE-016 | omitir: histórico |
| 611 | FAC-LEGACY-MSP24-044-83322A666C272E22 | Red Bienestar | historical | 2019-07-21 | 38000 |  | BASE-022 | omitir: histórico |
| 1035 | FAC-CANDIDATE-141 | Residencial Pontevedra | current_undated | Sin fecha visible | 29000 | 29000 | BASE-011 | omitir: sin fecha ISO real |
| 695 | FAC-LEGACY-MSP24-128-0077C3F2BA4412D2 | Saniguet | current_dated | 2025-06-12 | 60000 | 80000 | BASE-003 | precio elegible, condicionado a aprobación |
| 608 | FAC-LEGACY-MSP24-041-25544A83B648E4BA | Santa Bernardita | current_undated | Sin fecha visible | 55000 |  | BASE-007 | omitir: sin fecha ISO real |
| 1084 | FAC-CANDIDATE-171 | Álamos Montevideo | historical | 2020-05-20 | 95000 |  | BASE-015 | omitir: histórico |

Los 21 códigos emparejan exactamente una fila viva y 21 PK distintas. Las 11 filas históricas y las 6 `current_undated` se omiten. `Senescentis II` queda fuera: la URL y UYU 42.500 chocan con evidencia histórica de 2020.

### Cuatro precios estructuralmente elegibles, aún no aprobados

Solo se propone `precio_desde_uyu`; los máximos se omiten porque el esquema vivo no tiene columna trazable equivalente. Todos llevarían `precio_es_demo=false`, una fuente nueva y estado de revisión aún pendiente.

| PK | Código | Desde UYU | Fecha real | Incluye | Fuente nueva |
|---:|---|---:|---|---|---|
| 57 | `FAC-LEGACY-ELP-0048-2D20813D86F4F23D` | 85.000 | 2026-05-03 | Alimentación; lavandería; enfermería; atención médica; prestaciones exigidas a un ELEPEM habilitado | `cecilia-2026-08-14:ed8e94494e77d3d178d25a795d5227630884079bcc613fe2c4e8fd4579913fd0:BASE-001` · news · Somos Uruguay |
| 628 | `FAC-LEGACY-MSP24-061-31302148B63DA6AC` | 100.000 | 2025-04-01 | array vacío | `...:BASE-004` · public_directory · Vitalence |
| 695 | `FAC-LEGACY-MSP24-128-0077C3F2BA4412D2` | 60.000 | 2025-06-12 | array vacío | `...:BASE-003` · public_directory · Vitalence |
| 728 | `FAC-LEGACY-MSP24-161-7F284E6E017823E0` | 100.000 | 2025-06-13 | array vacío | `...:BASE-005` · public_directory · Vitalence |

Estado vivo previo de las cuatro filas: monto/moneda/fecha/fuente/`incluye` vacíos y `precio_es_demo=false`; las cuatro referencias propuestas están ausentes.

### Cinco candidatos Cecilia no vinculados

`S H Residencial`, `Residencial El Parque`, `Residencial en Carrasco`, `Residencial E F` e `Iporá Boutique Care Network` no tienen coincidencia exacta viva. Todos se omiten. `Residencial El Parque` duplica la aparición Canelones `WEB-E6DA09D530`; los otros cuatro son nuevos/no vinculados.

## Condiciones antes de cualquier escritura

1. Recibir una de las dos frases literales de aprobación.
2. Crear backup lógico exacto de todas las filas objetivo y guardar hash/recuento.
3. Revalidar el fingerprint `d51a091e84858ab7fb91bea904dff093`, recuentos, tuplas de precio y referencias deterministas.
4. Ejecutar una transacción pequeña y reversible; no insertar candidatos ni tocar Storage.
5. Repetir el dry run y exigir cero cambios pendientes.
6. Ejecutar lint, build y pruebas aplicables; revisar el diff y confirmar ausencia de secretos.

## Verificación local y cierre de fase A

- `npm ci`: falló con `EPERM` porque Windows mantenía abierto `next-swc.win32-x64-msvc.node`.
- Recuperación conservadora: `npm install --ignore-scripts --no-audit --no-fund`; no cambió `package.json` ni `package-lock.json`. Persistió solo una advertencia de limpieza sobre el binario bloqueado.
- `npm run lint`: pasa.
- `npm run build`: pasa; Next.js 15.5.22 compiló y generó 40/40 páginas estáticas.
- `npm run test:discovery`: 6/6.
- `npm run test:matching`: 34/34.
- `npm run test:osm-discovery`: 7/7.
- `npm run test:flat-registry`: 34/34.
- Total de pruebas pertinentes: 81/81.
- Rechequeo Supabase a `2026-08-16 06:50:54+00`: 1.019 y 83 filas, cero tuplas de precio y cero referencias con prefijo de estos paquetes.
- No se modificó ningún archivo bajo `Base de Datos/`, no se incorporaron secretos y no hubo escrituras en Supabase ni Storage.
