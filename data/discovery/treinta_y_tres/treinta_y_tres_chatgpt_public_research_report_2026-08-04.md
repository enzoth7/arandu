# InvestigaciÃ³n pÃºblica de ELEPEM â€” Departamento de Treinta y Tres

**Fecha:** 2026-08-04  
**Referencia histÃ³rica de cobertura:** 15 ELEPEM  
**Ãndice de exclusiÃ³n:** `known_facilities_exclusion_index_2026-08-03.json`  
**Alcance:** todo el departamento, investigado por capital, municipios, localidades y corredores.

## Resumen ejecutivo

Se estructuraron **28 registros o casos de control**:

- **0** candidatos actuales probables nuevos;
- **1** mudanzas, rebrandings o correcciones de domicilio;
- **1** pistas actuales sin direcciÃ³n exacta;
- **1** pistas que necesitan mÃ¡s evidencia;
- **6** coincidencias conocidas probables / continuidades;
- **2** coincidencias exactas conocidas;
- **12** registros histÃ³ricos sin evidencia reciente suficiente;
- **3** no elepem;
- **2** falsos positivos departamentales;

**NingÃºn registro tiene coordenadas nuevas verificadas y ninguno puede publicarse automÃ¡ticamente.**

La conclusiÃ³n principal es importante: en esta primera pasada no quedÃ³ ningÃºn `probable_new_current` con domicilio exacto. Los hallazgos mÃ¡s Ãºtiles son una posible mudanza/correcciÃ³n de Paradise, una marca actual sin direcciÃ³n exacta (Los Ãlamos), una pista sectorial de fuente Ãºnica (Las Comadres) y varias continuidades actuales que hoy no estÃ¡n representadas como entradas exactas departamentales.

## Cobertura de la base existente

El Ã­ndice nacional contiene **953 entradas**, pero solo **2** estÃ¡n etiquetadas exactamente como Treinta y Tres: Residencial DoÃ±a Aurelia y Residencial Josefa Olascoaga. TambiÃ©n existe un candidato OSM sin departamento ni direcciÃ³n que, por sus coordenadas, probablemente corresponde al Hogar de Ancianos de Santa Clara de Olimar.

La referencia departamental de **15 ELEPEM** y las **16 filas nominales** del documento histÃ³rico de 2019 son capas distintas. No se usa `15 - 2 = 13` como cantidad de establecimientos faltantes.

## ComparaciÃ³n Aderama 2026

Se revisaron las tres filas vinculadas a Treinta y Tres o detectadas como error departamental en el directorio sectorial:

| Fila | Resultado contra el Ã­ndice | ObservaciÃ³n |
|---|---|---|
| DoÃ±a Aurelia | Nombre y domicilio exactos | Control conocido. |
| Las Comadres | Sin coincidencia exacta | Una sola familia de fuente; queda `needs_more_evidence`. |
| Paradise | Sin coincidencia exacta | Aderama conserva Jacinto Trapani 1187 y â€œMontevideoâ€; las fuentes actuales indican Manuel Calleros 249, Treinta y Tres. |

## Mudanzas, rebrandings o correcciones de domicilio

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Residencial Paradise | Treinta y Tres | Manuel Calleros 249 | B | high | Candidato fuerte, pero debe resolverse como mudanza/correcciÃ³n departamental antes de crear una sede nueva. |

## Pistas actuales sin direcciÃ³n exacta

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Residencial Los Ãlamos | Treinta y Tres | Sin direcciÃ³n exacta | C | high | No asignar coordenadas del centro de Treinta y Tres. Prioridad alta para verificaciÃ³n manual en Google Maps o contacto institucional. |

## Pistas que necesitan mÃ¡s evidencia

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Las Comadres | Treinta y Tres | SimÃ³n del Pino 1482 | C | medium_low | Pista valiosa, pero no se hallÃ³ sitio, red pÃºblica, ficha cartogrÃ¡fica ni segunda fuente independiente con el mismo telÃ©fono o domicilio. |

## Coincidencias conocidas probables / continuidades

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| GeriÃ¡trico Bienestar | Treinta y Tres | SarandÃ­ 1346 | B | high | La coincidencia histÃ³rica por nombre y domicilio es fuerte; debe tratarse como continuidad probable, no como sede nueva. |
| Hogar de Ancianos de Cerro Chato | Cerro Chato | Ruta 7 km 250 | A | high | Sede fÃ­sica claramente identificada en Cerro Chato; no aparece entre las dos entradas exactas del Ã­ndice departamental. |
| Hogar de Ancianos de Santa Clara de Olimar | Santa Clara de Olimar | 19 de Abril s/n | A | high | No es un descubrimiento completamente nuevo: el Ã­ndice ya contiene un candidato OSM sin nombre/localidad. Resolver identidad y completar direcciÃ³n. |
| Hogar de Ancianos de Treinta y Tres | Treinta y Tres | JosÃ© Enrique RodÃ³ 1437 | A | high | Muy probable continuidad del registro histÃ³rico. Falta que Codex resuelva por quÃ© no quedÃ³ como entrada exacta de Treinta y Tres. |
| Hogar de Ancianos Vergara Siglo XXI | Vergara | Padrones 86 y 1322, Vergara | A | medium_high | La sede estÃ¡ confirmada en Vergara, pero no se obtuvo calle y nÃºmero verificables. No usar la direcciÃ³n del Municipio ni la sede social de la asociaciÃ³n como direcciÃ³nâ€¦ |
| Hogar El Amanecer | Treinta y Tres | Dionisio Oribe 1517 | B | high | El telÃ©fono fijo actual coincide con la nÃ³mina histÃ³rica; muy probable misma sede. |

## Coincidencias exactas conocidas

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Residencial DoÃ±a Aurelia | Treinta y Tres | Manuel Freire 1864 | A | high | Coincidencia exacta con EXC-OFFICIAL-ELP-0809; se conserva como control, no como descubrimiento. |
| Residencial Josefa Olascoaga | Treinta y Tres | Manuel Lavalleja 1063 | A | high | Coincidencia exacta con EXC-OFFICIAL-ELP-0810; no debe crear un punto nuevo. |

## Registros histÃ³ricos sin evidencia reciente suficiente

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| El Remanso | Treinta y Tres | Manuel Oribe 1310 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Hogar La Victoria | Treinta y Tres | Sin direcciÃ³n exacta | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Hogar Mi SueÃ±o | Treinta y Tres | SimÃ³n del Pino 1335 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Hogar y GuarderÃ­a GeriÃ¡trica | Treinta y Tres | Manuel Oribe 1224 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Los Abuelos | Treinta y Tres | SimÃ³n del Pino 1055 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Magdalena | Treinta y Tres | Juan Ortiz 1528 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Ramos y Rosas | Treinta y Tres | Avelino Miranda 1236 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Residencial Adulto Mayor | Treinta y Tres | Manuel MelÃ©ndez y SimÃ³n del Pino | A | high | No es candidato actual. Se conserva para evitar redescubrir la direcciÃ³n como sede vigente. |
| Residencial sin nombre â€” RamÃ³n Ortiz 315 | Treinta y Tres | RamÃ³n Ortiz 315 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Residencial sin nombre â€” Zona El Verde Alto | Treinta y Tres | Ruta 98, Zona El Verde Alto s/n | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| RincÃ³n de Luz | Treinta y Tres | Juan Antonio Lavalleja 968 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |
| Sol y Luna | Treinta y Tres | ValentÃ­n Olivera Ortiz 2008 | A | medium_high | No se encontrÃ³ evidencia pÃºblica independiente suficientemente reciente para clasificarlo como sede actual. La ausencia de evidencia no prueba cierre. |

## No ELEPEM

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Club de Abuelos Cumbre | La Charqueada | Local MEVIR | A | high | Espacio cultural y recreativo, no establecimiento de larga estadÃ­a segÃºn la descripciÃ³n pÃºblica. |
| Club RaÃ­ces | Treinta y Tres | Santiago Gadea 1181 | A | high | Club de adultos mayores con actividades recreativas; no se describe alojamiento de larga estadÃ­a. |
| Residencia Asistida Treinta y Tres | Treinta y Tres | AndrÃ©s Spikerman esquina Basilio Araujo | A | high | Dispositivo de salud/asistencia pÃºblica; no debe incorporarse automÃ¡ticamente como ELEPEM para personas mayores. |

## Falsos positivos departamentales

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Hogar de Ancianos CebollatÃ­ | Villa CebollatÃ­, Rocha | Calle del Cementerio s/n | A | high | Pertenece a Rocha y en abril de 2026 estaba en primera etapa de construcciÃ³n; no es candidato de Treinta y Tres. |
| Hogar Mi SueÃ±o â€” 33 Orientales 974 | PaysandÃº | 33 Orientales 974 | A | high | Falso positivo producido por la calle 33 Orientales y por geolocalizaciones ambiguas en resultados sociales. |

## Cobertura territorial

- **Treinta y Tres capital y periferia inmediata:** Centro, Barrio Sosa, Villa Sara, zona de Ruta 8, El Verde Alto, barrios y corredores urbanos. Se cruzaron redes pÃºblicas, directorios, nÃ³mina histÃ³rica, telÃ©fonos y domicilios. Aparecen una mudanza probable, una marca actual sin direcciÃ³n y varias continuidades histÃ³ricas.
- **Vergara y RincÃ³n:** Vergara, RincÃ³n. Se confirmÃ³ actividad actual del Hogar Vergara Siglo XXI; el domicilio fÃ­sico exacto queda pendiente porque las fuentes pÃºblicas identifican la instituciÃ³n y padrones, no calle y puerta.
- **Santa Clara de Olimar e Isla Patrulla:** Santa Clara de Olimar, Isla Patrulla, entorno de Ruta 7. Se confirmÃ³ el hogar inaugurado en 2024 y se lo relacionÃ³ con un candidato OSM ya presente en el Ã­ndice.
- **Cerro Chato y Valentines:** Cerro Chato, Valentines, corredores de rutas 7 y 19. Se confirmÃ³ el Hogar de Ancianos de Cerro Chato mediante fuentes institucionales y oficiales. No surgieron otras sedes con evidencia suficiente.
- **General Enrique MartÃ­nez / La Charqueada y este departamental:** La Charqueada, General Enrique MartÃ­nez, CebollatÃ­ limÃ­trofe, zonas rurales del este. Se separaron clubes recreativos de ELEPEM y se descartÃ³ el Hogar de Ancianos CebollatÃ­ por pertenecer a Rocha.
- **MendizÃ¡bal, MarÃ­a Albina y parajes rurales:** MendizÃ¡bal, MarÃ­a Albina, Arrocera Zapata, parajes y rutas rurales. La huella pÃºblica indexada fue muy baja. No se inventaron sedes ni ubicaciones por falta de resultados concretos.

La falta de una pista concreta en una localidad significa brecha de informaciÃ³n pÃºblica indexada, no ausencia de establecimientos.

## Google Maps

La sesiÃ³n no utilizÃ³ la clave de Google guardada en `.env`. Las pÃ¡ginas pÃºblicas de Google Maps requirieron JavaScript y no expusieron fichas completas; por eso no se capturaron `place_id`, reseÃ±as ni coordenadas nuevas. DespuÃ©s del `dry-run`, Codex puede verificar manualmente los casos que sobrevivan, especialmente Paradise, Los Ãlamos y Las Comadres.

## Archivos entregados

```text
treinta_y_tres_chatgpt_public_candidates_2026-08-04.json
treinta_y_tres_chatgpt_public_review_2026-08-04.csv
treinta_y_tres_chatgpt_public_research_report_2026-08-04.md
treinta_y_tres_chatgpt_search_log_2026-08-04.md
```

## Prompt preparado para Codex

```text
Read AGENTS.md.

Use: data/discovery/treinta_y_tres/treinta_y_tres_chatgpt_public_candidates_2026-08-04.json

Execute only the Treinta y Tres comparison and deduplication dry run.

This file was produced by ChatGPT public-web research. It is not a verified registry and nothing may be published automatically.

Baseline:
- Historical coverage reference: 15 ELEPEM.
- Historical nominal rows reviewed: 16.
- National exclusion index: 953 entries.
- Entries with department=Treinta y Tres: 2.
- One null-department OSM candidate is probably the Santa Clara de Olimar home.
- Candidate/control records in this file: 28.
- These counts describe different layers and must not be added or subtracted as current unique physical sites.

Tasks:
1. Validate the JSON schema, source URLs, dates and classifications.
2. Compare every record against normalized Supabase facilities, the exclusion index, private candidates, OSM, aliases, historical names, addresses, phones, social URLs, place IDs and existing coordinates.
3. Never merge by name alone and keep one row per physical site.
4. For Paradise, resolve Manuel Calleros 249 versus Jacinto Trapani 1187 and the incorrect Montevideo label before proposing any insert.
5. For Los Ãlamos, search for an exact physical address and determine whether â€œLos Ãlamos 2â€ represents a second site. Do not geocode a neighborhood or city centroid.
6. Keep Las Comadres private until an independent current source or human verification is obtained.
7. Link GeriÃ¡trico Bienestar and Hogar El Amanecer to their 2019 historical sites unless stronger evidence contradicts continuity.
8. Resolve the missing index representation of Hogar de Ancianos de Treinta y Tres and Hogar de Ancianos de Cerro Chato.
9. Link Hogar de Ancianos de Santa Clara de Olimar to EXC-CANDIDATE-5E1C228FD6B7EC36 if the OSM coordinates and site identity agree.
10. Keep Vergara Siglo XXI without coordinates until an exact street address is verified; padrones alone are not a geocodable door.
11. Treat all historical_only records as controls, not current candidates.
12. Discard the current Hogar Mi SueÃ±o at 33 Orientales 974 as PaysandÃº and route Hogar de Ancianos CebollatÃ­ to Rocha.
13. Exclude Residencia Asistida Treinta y Tres, Club de Abuelos Cumbre and Club RaÃ­ces from ELEPEM imports.
14. Do not call Google, Instagram, Facebook, IDE Uruguay, Overpass or other external services during this dry run.
15. Do not write to Supabase or modify the public map.
16. Return exact matches, probable matches, unmatched leads, move/rebrand cases, index corrections, historical controls, exclusions and the actions a later --apply would perform.
17. Run focused tests and git diff --check.

Stop after the dry run.
```
