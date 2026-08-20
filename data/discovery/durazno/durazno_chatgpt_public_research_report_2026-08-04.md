# InvestigaciÃ³n pÃºblica de ELEPEM â€” Departamento de Durazno

**Fecha:** 2026-08-04  
**Referencia histÃ³rica de cobertura:** 31 ELEPEM (2 hogares y 29 residencias)  
**Ãndice de exclusiÃ³n:** `known_facilities_exclusion_index_2026-08-03.json`  
**Alcance:** todo el departamento, investigado por capital, ciudades, villas, pueblos y corredores rurales.

## Resumen ejecutivo

Se estructuraron **32 registros o casos de control**:

- **3** candidatos actuales probables;
- **3** posibles mudanzas, rebrandings o reutilizaciones de domicilio;
- **2** coincidencias conocidas probables;
- **2** pistas actuales sin direcciÃ³n exacta;
- **1** pista que necesita mÃ¡s evidencia;
- **8** coincidencias exactas conocidas;
- **9** identidades histÃ³ricas sin evidencia actual suficiente;
- **3** registros que no deben tratarse como ELEPEM;
- **1** falso positivo departamental.

**NingÃºn registro tiene coordenadas nuevas verificadas y ninguno puede publicarse automÃ¡ticamente.**

Los candidatos mÃ¡s fuertes de esta primera pasada son **Calas Hogar**, **Residencial Shalom** y **Hogar Amaneciendo de Blanquillo**. Los tres deben pasar por el `dry-run` de Codex contra Supabase, el Ã­ndice, alias, telÃ©fonos, domicilios y candidatos privados antes de cualquier alta.

## Cobertura de la base existente

El Ã­ndice nacional contiene **953 entradas**: 898 establecimientos conocidos y 55 candidatos privados. Tiene **21 entradas etiquetadas exactamente como Durazno** â€”19 oficiales y 2 legadasâ€” y, ademÃ¡s, un candidato OSM sin departamento en Francisco Antonio Maciel 505.

La referencia departamental de **31 ELEPEM**, las 21 entradas exactas, el candidato OSM y las identidades histÃ³ricas son capas diferentes. No se usa:

```text
31 - 21 = 10 establecimientos nuevos confirmados
```

El Ãºnico conflicto exacto de Durazno en el archivo nacional corresponde a un contacto multivaluado de Tea Garden. Debe conservarse para revisiÃ³n y no usarse como clave fuerte de fusiÃ³n.

## ComparaciÃ³n Aderama 2026

Se revisÃ³ la fila departamental **Green House Country**:

| Fila | Resultado contra el Ã­ndice | ObservaciÃ³n |
|---|---|---|
| Green House Country | Misma direcciÃ³n, variante de nombre | Batalla de las Piedras 232 coincide con Green House; conservar â€œCountryâ€ como alias sectorial y revisar la diferencia de telÃ©fono. |

Aderama se utiliza como evidencia sectorial y no como conclusiÃ³n administrativa.

## Candidatos actuales probables

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Calas Hogar | Durazno | Herrera 948, esquina Baltasar Brum | B | high | Presencia pÃºblica actual, apertura declarada y sede concreta. |
| Residencial Shalom | Durazno | Zorrilla 618 | B | high | Ficha verificada con el propietario el 1 de octubre de 2025; sin coincidencia exacta en el Ã­ndice. |
| Hogar Amaneciendo | Blanquillo | Calle Artigas, frente a OSE | B | high | Inaugurado en diciembre de 2025 por una asociaciÃ³n civil; la direcciÃ³n usa referencia, no puerta. |

### Observaciones principales

- **Calas Hogar** conserva perfil pÃºblico, publicaciÃ³n de apertura y una pieza audiovisual local que lo presenta como residencia para adultos mayores.
- **Residencial Shalom** tiene una ficha comercial verificada con el propietario, direcciÃ³n y telÃ©fono concretos.
- **Hogar Amaneciendo** fue inaugurado en Blanquillo y cuenta con dos fuentes periodÃ­sticas locales que describen su funciÃ³n y ubicaciÃ³n.

## Pistas actuales sin direcciÃ³n exacta

| Establecimiento | Localidad | Evidencia | Confianza | Nota |
|---|---|---|---|---|
| Centro de Cuidados Amelia | Durazno | B | medium_high | Presencia social y contacto pÃºblico, pero sin calle y nÃºmero verificables. |
| Hogar Los Abuelos | Durazno | B | high | Aparece en fuentes oficiales y locales de 2026 como instituciÃ³n distinta, pero no se recuperÃ³ domicilio. |

No se deben asignar coordenadas del centro de Durazno.

## Pista que necesita mÃ¡s evidencia

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Nota |
|---|---|---|---|---|
| La Aurora | Durazno | Zorrilla 545, casi Rubino | C | Tiene ficha comercial con telÃ©fono, pero falta una segunda familia de fuente reciente o verificaciÃ³n humana. |

## Mudanzas, rebrandings y reutilizaciÃ³n de domicilio

| Establecimiento | DirecciÃ³n | Evidencia | Confianza | RelaciÃ³n a resolver |
|---|---|---|---|---|
| Residencial Tu Hogar | 25 de Agosto 935 | B | high | La misma puerta estÃ¡ indexada histÃ³ricamente como Residencial AÃ±os Dorados. |
| Residencial DoÃ±a InÃ©s / El Bienestar | 18 de Julio 540 | B | medium_high | Dos identidades comerciales distintas comparten la misma puerta; DoÃ±a InÃ©s ademÃ¡s aparece vinculada con Reino de las Flores. |
| Residencial Sagrada Familia HipÃ³dromo | HipÃ³dromo, frente al 1100 de la pista | B | high | El Ã­ndice y 1122 usan Sagrado CorazÃ³n; fuentes pÃºblicas de 2026 usan Sagrada Familia HipÃ³dromo. |

Estos casos deben resolverse como relaciones, no como altas automÃ¡ticas.

## Coincidencias conocidas probables

| Establecimiento | DirecciÃ³n | Evidencia | Confianza | RelaciÃ³n |
|---|---|---|---|---|
| Residencial Reino de las Flores | Wilson Ferreira Aldunate 696 | B | high | Probable variante actual de Residencial Reina de las Flores, misma puerta. |
| Hogar de Ancianos â€” pista OSM | Francisco Antonio Maciel 505 | C | medium_high | Probable relaciÃ³n con ComisiÃ³n Pro Ayuda al Anciano de Durazno en Maciel 630. |

## Coincidencias exactas conocidas

| Establecimiento | Localidad | DirecciÃ³n | Entrada del Ã­ndice | Actividad pÃºblica |
|---|---|---|---|---|
| Green House | Durazno | Batalla de las Piedras 232 | EXC-OFFICIAL-ELP-0150 | known_with_current_sector_listing |
| Hostal La Vida Es Bella | Durazno | Luis Alberto de Herrera 1118 | EXC-OFFICIAL-ELP-0152 | known_with_current_owner_verified_listing |
| ComisiÃ³n Pro Ayuda al Anciano de Durazno | Durazno | Maciel 630 | EXC-OFFICIAL-ELP-0149 | known_with_current_public_activity |
| Residencial San Cayetano | Durazno | Batalla de las Piedras y Batalla de SarandÃ­ | EXC-OFFICIAL-ELP-0162 | known_with_current_public_activity |
| Hogar de Ancianos de SarandÃ­ del YÃ­ | SarandÃ­ del YÃ­ | Av. Petrini 535 | EXC-OFFICIAL-ELP-0151 | known_index_entry |
| Residencial Don Eduardo | SarandÃ­ del YÃ­ | RincÃ³n esquina Batlle | EXC-LEGACY-MSPREG24-028 | known_with_public_presence_and_address_variants |
| Residencial Tea Garden | Durazno | Zorrilla 947 | EXC-OFFICIAL-ELP-0164 | known_index_entry_branch_review |
| Tea Garden 2 | Durazno | Penza 951 y Baltasar Brum | EXC-OFFICIAL-ELP-0165 / EXC-LEGACY-MSP24-183 | known_with_current_official_listing |

Estas filas se conservaron como controles para enlazar fuentes, completar contactos y evitar redescubrimientos. No deben crear nuevos puntos.

## Identidades histÃ³ricas sin evidencia actual suficiente

| Establecimiento | Localidad | Ãšltima evidencia | Nota |
|---|---|---|---|
| Blanca Lila | Durazno | 2023 | No importar como sede actual sin una fuente reciente independiente. |
| Residencial Dulce Hogar | Durazno | 2019 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial El Hogar del Adulto | Durazno | 2020 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial Felicia Santa Bernardina SAS | Santa Bernardina / Durazno | 2020 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial Hogar Luz del Sol | Durazno | 2018 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial Jardines del YÃ­ | SarandÃ­ del YÃ­ | 2021 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial La PensiÃ³n | SarandÃ­ del YÃ­ | 2020 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial SueÃ±o Dorado | Durazno | 2020 | Conservar para alias, mudanza o cierre histÃ³rico. |
| Residencial Tu Segundo Hogar | Durazno | 2019 | Conservar para alias, mudanza o cierre histÃ³rico. |

La ausencia de una fuente actual indexada no prueba cierre ni inexistencia; Ãºnicamente impide clasificarlas como sedes actuales.

## Falso positivo y exclusiones no ELEPEM

| Registro | Localidad | ClasificaciÃ³n | Motivo |
|---|---|---|---|
| Centro Residencial El Sauzal | Durazno | not_elepem | Centro especializado en consumo problemÃ¡tico de drogas, no ELEPEM. |
| Casa del Adulto Mayor | Durazno | not_elepem | Centro comunitario y de actividades para personas mayores, no residencia de larga estadÃ­a. |
| Residencia S.A.R.U. | Carlos Reyles | not_elepem | Residencia para jÃ³venes estudiantes rurales. |
| RincÃ³n de Luz | La Paloma, Rocha | false_positive | Resultado de la localidad homÃ³nima de Rocha, no de Durazno. |

## Cobertura territorial

La investigaciÃ³n se dividiÃ³ en cuatro Ã¡reas:

- **Ciudad de Durazno y periferia:** centro, HipÃ³dromo, Santa Bernardina y corredores suburbanos.
- **SarandÃ­ del YÃ­, Villa del Carmen, Blanquillo y este departamental.**
- **Carlos Reyles, Pueblo Centenario, Baygorria y eje de Ruta 5.**
- **La Paloma, San Jorge, norte rural y bordes con otros departamentos.**

La ausencia de una pista concreta en una localidad significa brecha de huella pÃºblica indexada, no ausencia de establecimientos.

## Google Maps y coordenadas

ChatGPT no utilizÃ³ una clave privada de Google. Se revisaron resultados y fichas pÃºblicas accesibles, pero no se guardaron coordenadas nuevas. DespuÃ©s del `dry-run`, Codex puede verificar Ãºnicamente los candidatos supervivientes y conservar `place_id`, URL externa, fecha y persona revisora.

## Archivos entregados

```text
durazno_chatgpt_public_candidates_2026-08-04.json
durazno_chatgpt_public_review_2026-08-04.csv
durazno_chatgpt_public_research_report_2026-08-04.md
durazno_chatgpt_search_log_2026-08-04.md
```

## Prompt preparado para Codex

```text
Read AGENTS.md.

Use:

data/discovery/durazno/durazno_chatgpt_public_candidates_2026-08-04.json

Execute only the Durazno comparison and deduplication dry run.

This file was produced by ChatGPT public-web research. It is not a verified
registry and nothing may be published automatically.

Baseline:

- Historical coverage reference: 31 ELEPEM (2 hogares and 29 residencias).
- National exclusion index: 953 entries.
- Known facilities: 898.
- Private candidates: 55.
- Entries with department=Durazno: 21.
- Additional null-department OSM candidate in Francisco Antonio Maciel 505:
  EXC-CANDIDATE-E02C42857758CA15.
- Candidate/control records in this file: 32.
- These counts represent different layers and must not be added or
  subtracted as current unique physical establishments.
- The national index marks PDF row-merging contamination. Contaminated
  contacts must never be strong matching keys.
- Tea Garden has one split_multivalue_contact conflict that requires review.

Tasks:

1. Validate the JSON schema, source URLs, dates and classifications.
2. Compare every record against:
   - normalized Supabase facilities and exclusion view;
   - known_facilities_exclusion_index_2026-08-03.json;
   - private candidates, observations and external IDs;
   - OSM records and candidates;
   - aliases, historical names, addresses, phones, domains, social URLs,
     place IDs and existing coordinates.
3. Never merge by name alone.
4. Keep one row per physical site. One operator may have multiple sites.
5. For every probable_new_current record, return the three best possible
   existing matches with explainable score components before proposing
   a private insert.
6. Keep needs_more_evidence and address_missing records private.
7. Do not geocode address_missing records or assign locality centroids.
8. Treat possible_move_or_rebrand as relationship reviews and preserve
   every observed name, address, source and date.
9. Do not create candidates for known_exact_match records; link or enrich
   the existing entry.
10. Resolve these high-priority relationships explicitly:
   - Calas Hogar at Herrera 948 versus all existing Herrera/Baltasar Brum
     names, phones and operators;
   - Residencial Shalom at Zorrilla 618;
   - Hogar Amaneciendo in Blanquillo;
   - Centro de Cuidados Amelia and Hogar Los Abuelos without exact address;
   - Residencial Tu Hogar versus AÃ±os Dorados at 25 de Agosto 935;
   - Residencial DoÃ±a InÃ©s versus El Bienestar at 18 de Julio 540;
   - Reino de las Flores versus Reina de las Flores at Wilson Ferreira 696;
   - Sagrada Familia HipÃ³dromo versus Sagrado CorazÃ³n;
   - OSM Maciel 505 versus ComisiÃ³n Pro Ayuda al Anciano at Maciel 630;
   - Tea Garden Zorrilla 947 versus Tea Garden/Tea Garden 2 at Penza 951;
   - Don Eduardo at RincÃ³n/Batlle versus the public Batlle 598/Alvariza
     address variant.
11. Do not convert historical_only records into current candidates without
    an independent recent source or human verification.
12. Discard RincÃ³n de Luz from Durazno scope and correct it to Rocha if it
    is stored elsewhere.
13. Exclude El Sauzal, Casa del Adulto Mayor and Residencia S.A.R.U. from
    ELEPEM import.
14. Do not call Google, Instagram, Facebook, IDE Uruguay, Overpass or any
    other external service during this dry run.
15. Do not write to Supabase.
16. Do not modify public.residenciales or the public map.
17. Return:
   - exact matches;
   - probable matches;
   - unmatched probable-new physical sites;
   - move/rebrand/address-reuse and branch cases;
   - corrections required in the exclusion index;
   - records without exact address;
   - historical-only identities;
   - false positives and non-ELEPEM exclusions;
   - inserts, links and relationship rows that a later --apply would perform.
18. Run focused tests and git diff --check.

Stop after the dry run.
```
