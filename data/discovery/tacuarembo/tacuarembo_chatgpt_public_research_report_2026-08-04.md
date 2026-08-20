# InvestigaciÃ³n pÃºblica de ELEPEM â€” Departamento de TacuarembÃ³

**Fecha:** 2026-08-04  
**Referencia histÃ³rica de cobertura:** 23 ELEPEM (4 hogares y 19 residencias)  
**Ãndice de exclusiÃ³n:** `known_facilities_exclusion_index_2026-08-03.json`  
**Alcance:** todo el departamento, investigado por capital, ciudades, villas, localidades y corredores rurales.

## Resumen ejecutivo

Se estructuraron **34 registros o casos de control**:

- **7** candidatos actuales probables;
- **3** posibles mudanzas, rebrandings o reutilizaciones de domicilio;
- **2** pistas actuales sin direcciÃ³n exacta;
- **1** pista que necesita mÃ¡s evidencia;
- **10** coincidencias exactas conocidas;
- **7** identidades histÃ³ricas sin evidencia actual suficiente;
- **3** registros que no deben tratarse como ELEPEM;
- **1** falso positivo departamental.

**NingÃºn registro tiene coordenadas nuevas verificadas y ninguno puede publicarse automÃ¡ticamente.**

Los candidatos mÃ¡s fuertes de esta primera pasada son **Tacuavida**, **Residencial IporÃ¡**, **Residencial Alhoa/Aloha**, **Las Mariposas Residencial Boutique**, **Residencial Vida Feliz**, **Residencial San AgustÃ­n** y **Residencial Los Jazmines**. Todos deben pasar por el `dry-run` de Codex contra Supabase, el Ã­ndice, alias, telÃ©fonos, domicilios y candidatos privados antes de cualquier alta.

## Cobertura de la base existente

El Ã­ndice nacional contiene **953 entradas**: 898 establecimientos conocidos y 55 candidatos privados. Tiene **11 entradas etiquetadas exactamente como TacuarembÃ³** y, ademÃ¡s, un candidato OSM sin departamento para San Vicente de Paul.

La referencia departamental de **23 ELEPEM**, las 11 entradas exactas, el candidato OSM y la lista nominal histÃ³rica de 2020 son capas diferentes. No se usa:

```text
23 - 11 = 12 establecimientos nuevos confirmados
```

## ComparaciÃ³n Aderama 2026

Se revisaron cuatro filas departamentales relevantes:

| Fila | Resultado contra el Ã­ndice | ObservaciÃ³n |
|---|---|---|
| Tacuavida | Sin coincidencia exacta | Candidato actual probable en Dr. ElÃ­as Abdo 259. |
| Casa Las Violetas | Coincidencia por identidad, domicilio diferente | Revisar relaciÃ³n con Residencial Las Violetas de Gral. Artigas 172. |
| Las Mariposas | Sin coincidencia exacta | Candidato actual probable en 18 de Julio 87. |
| DoÃ±a Blanca | Nombre y domicilio coinciden | Control conocido de Paso de los Toros. |

Aderama se utiliza como evidencia sectorial y no como conclusiÃ³n administrativa.

## Candidatos actuales probables

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | Nota |
|---|---|---|---|---|---|
| Tacuavida | TacuarembÃ³ | Dr. ElÃ­as Abdo 259 | B | high | Candidato fuerte sin coincidencia exacta en el Ã­ndice. Mantener separado de Tacuavida Plus hasta identificar la direcciÃ³n de la segunda sede. |
| Residencial IporÃ¡ | Balneario IporÃ¡ | Calle 9 y Calle 18 | B | high | La web declara mÃ¡s de cuatro aÃ±os de actividad. La direcciÃ³n es una intersecciÃ³n, no un nÃºmero de puerta. |
| Residencial Alhoa | TacuarembÃ³ | Treinta y Tres 164 | B | high | Conservar Alhoa y Aloha como variantes. No hay coincidencia exacta en el Ã­ndice. |
| Las Mariposas Residencial Boutique | TacuarembÃ³ | 18 de Julio 87 | B | high | Los telÃ©fonos difieren por fuente; conservar ambos hasta revisiÃ³n. |
| Residencial Vida Feliz | TacuarembÃ³ | Antonio Chiesa Olivera N.Âº 10 | B | medium_high | Candidato actual con una sola familia pÃºblica fuerte; buscar fuente independiente durante la revisiÃ³n humana. |
| Residencial San AgustÃ­n | Paso de los Toros | Paula BermÃºdez de Godoy 267 | B | high | Aparece en la fuente oficial histÃ³rica pero no en las 11 entradas departamentales del Ã­ndice. Es uno de los candidatos prioritarios del dry-run. |
| Residencial Los Jazmines | TacuarembÃ³ | Gral. Fructuoso Rivera 199 | B | medium_high | Se conserva como sede probable actual en Rivera 199, pero la relaciÃ³n con Henry Dunant 414 debe resolverse. |

### Observaciones principales

- **Tacuavida** aparece en Aderama, Instagram y un directorio cartogrÃ¡fico con el mismo domicilio y telÃ©fono.
- **Residencial IporÃ¡** mantiene un sitio propio que ubica la sede en Calle 9 y 18, Balneario IporÃ¡.
- **Alhoa/Aloha** conserva dos variantes ortogrÃ¡ficas, pero las publicaciones coinciden en Treinta y Tres 164 y el mismo telÃ©fono.
- **Las Mariposas** tiene ficha sectorial, pÃ¡gina pÃºblica y directorio independiente en 18 de Julio 87.
- **Vida Feliz** tiene una ficha comercial verificada en julio de 2026.
- **San AgustÃ­n** estaba en el acuerdo oficial histÃ³rico de 2020 y conserva ficha comercial y seÃ±al pÃºblica del operador, pero no estÃ¡ entre las 11 entradas exactas del Ã­ndice.
- **Los Jazmines** se presenta en Gral. Rivera 199, aunque fuentes anteriores la asociaron con Henry Dunant 414.

## Mudanzas, rebrandings y reutilizaciÃ³n de domicilio

| Establecimiento | Localidad | DirecciÃ³n | Evidencia | Confianza | RelaciÃ³n a resolver |
|---|---|---|---|---|---|
| Residencial Nuevo Amanecer | TacuarembÃ³ | Henry Dunant 414 | C | medium | La misma puerta fue publicada como Residencial Los Jazmines.; Los Jazmines tambiÃ©n se presenta actualmente en Gral. Fructuoso Rivera 199. |
| Casa Las Violetas | Paso de los Toros | Bulevar Artigas 152 | B | high | El Ã­ndice contiene Residencial Las Violetas en Gral. JosÃ© Gervasio Artigas 172.; Aderama 2026 publica Casa Las Violetas en Bulevar Artigas 152, Paso de los Toros. |
| Segundo Marisel | TacuarembÃ³ | Sin direcciÃ³n exacta | C | medium | El Ã­ndice contiene Residencial Maricel en 18 de Julio 848.; El Ã­ndice tambiÃ©n contiene FantasÃ­a Maricel en Manuel Ãlvarez 816.; Debe determinarse si Segundo Marisel corresponde a una de esas sedes, a una sede cerrada o a una tercera puerta. |

Los tres casos deben resolverse como relaciones, no como altas automÃ¡ticas:

1. **Nuevo Amanecer / Los Jazmines** en Henry Dunant 414.
2. **Casa Las Violetas** frente a la identidad y domicilio ya indexados.
3. **Segundo Marisel** frente a Residencial Maricel y FantasÃ­a Maricel.

## Pistas actuales sin direcciÃ³n exacta

| Establecimiento | Localidad | Evidencia | Confianza | Nota |
|---|---|---|---|---|
| Tacuavida Plus | TacuarembÃ³ | B | high | Probable segunda sede fÃ­sica, pero no geocodificable hasta obtener calle y nÃºmero. |
| Hogar de Ancianos Casa de la Caridad | Ansina | C | medium | Conservado por seÃ±al reciente, pero sin direcciÃ³n exacta ni contacto institucional. |

No se deben asignar coordenadas del centro de TacuarembÃ³ o Ansina.

## Pista que necesita mÃ¡s evidencia

| Establecimiento | Localidad | UbicaciÃ³n observada | Evidencia | Nota |
|---|---|---|---|---|
| Hogar de Ancianos de San Gregorio de Polanco | San Gregorio de Polanco | Predio lindero al Hospital de San Gregorio | B | No importar como sede actual hasta separar el hogar existente, la obra nueva y la identidad histÃ³rica Los Patitos. |

La Intendencia informÃ³ en diciembre de 2025 un convenio para ampliar el Hogar de Ancianos de San Gregorio de Polanco en un predio lindero al hospital. No se asumiÃ³ que la obra estÃ© terminada ni que el hogar sea automÃ¡ticamente la misma identidad histÃ³rica que Los Patitos.

## Coincidencias exactas conocidas

| Establecimiento | Localidad | DirecciÃ³n | Entrada del Ã­ndice | Actividad pÃºblica |
|---|---|---|---|---|
| Residencial DoÃ±a Blanca | Paso de los Toros | Wilson Ferreira 454 | EXC-OFFICIAL-ELP-0801 | known_with_current_sector_listing |
| Hogar de Ancianos San Vicente de Paul | TacuarembÃ³ | MarÃ­a Reggi, 6.Âª secciÃ³n judicial | EXC-OFFICIAL-ELP-0803 | known_with_recent_public_activity |
| ComisiÃ³n Pro Bienestar del Anciano de Paso de los Toros | Paso de los Toros | Dr. VÃ­ctor Ãlvarez MenÃ©ndez s/n | EXC-OFFICIAL-ELP-0799 | known_with_current_public_listing |
| Residencial Casa del Sol | TacuarembÃ³ | RamÃ³n GonzÃ¡lez 137 | EXC-OFFICIAL-ELP-0800 | known_with_current_public_listing |
| Residencial Dulce Hogar | TacuarembÃ³ | 18 de Julio 440 | EXC-OFFICIAL-ELP-0802 | known_index_entry |
| Residencial Justina | TacuarembÃ³ | JosÃ© Benelli 96 | EXC-OFFICIAL-ELP-0804 | known_index_entry |
| Residencial La Familia | TacuarembÃ³ | Rivera 217 | EXC-OFFICIAL-ELP-0805 | known_index_entry |
| Residencial Los Abuelos | TacuarembÃ³ | Aparicio Saravia 187 | EXC-OFFICIAL-ELP-0807 | known_index_entry |
| Residencial Maricel | TacuarembÃ³ | 18 de Julio 848 | EXC-OFFICIAL-ELP-0808 | known_index_entry |
| FantasÃ­a Maricel | TacuarembÃ³ | Manuel Ãlvarez 816 | EXC-OFFICIAL-ELP-0798 | known_index_entry |

Estas filas se conservaron como controles para enlazar fuentes, completar contactos y evitar redescubrimientos. No deben crear nuevos puntos.

## Identidades histÃ³ricas sin evidencia actual suficiente

| Establecimiento | Localidad | Ãšltima evidencia | Nota |
|---|---|---|---|
| Residencial Mis Abuelos | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Mi SueÃ±o | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Santa Isabel | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Sandra NÃºÃ±ez | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Sandra Soca | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Alma MÃ­a | TacuarembÃ³ | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |
| Residencial Los Patitos | San Gregorio de Polanco | 2020 | No importar como sede actual. Conservar para bÃºsquedas de alias, cierres, mudanzas o rebranding. |

La ausencia de una fuente actual indexada no prueba cierre ni inexistencia; Ãºnicamente impide clasificarlas como sedes actuales.

## Falso positivo y exclusiones no ELEPEM

| Registro | Localidad | ClasificaciÃ³n | Motivo |
|---|---|---|---|
| Hogar DespuÃ©s de Nosotros | Tambores | false_positive | Excluir del alta en TacuarembÃ³; revisar si ya estÃ¡ representado en PaysandÃº. |
| Hogar PsiquiÃ¡trico Los Murales | RincÃ³n de Tranqueras | not_elepem | No equiparar automÃ¡ticamente con un ELEPEM para personas mayores. |
| Servicio de InserciÃ³n Familiar Antonia AbalÃ³ | TacuarembÃ³ | not_elepem | Excluir de la importaciÃ³n ELEPEM. |
| Servicio de InserciÃ³n Familiar Rosa FÃ©lix | TacuarembÃ³ | not_elepem | Excluir de la importaciÃ³n ELEPEM. |

El Hogar DespuÃ©s de Nosotros estÃ¡ fÃ­sicamente del lado de PaysandÃº en Tambores. Los dos servicios de inserciÃ³n familiar y el hogar identificado como psiquiÃ¡trico se mantienen fuera de la importaciÃ³n ELEPEM.

## Cobertura territorial

La investigaciÃ³n se dividiÃ³ en cinco Ã¡reas:

- **Ciudad de TacuarembÃ³ y periferia:** centro, barrios, Balneario IporÃ¡ y corredores suburbanos.
- **Paso de los Toros y RincÃ³n del Bonete.**
- **San Gregorio de Polanco, Achar y oeste.**
- **Ansina, Las Toscas, CaraguatÃ¡ y noreste.**
- **Tambores, Piedra Sola, Curtina, Clara, Paso del Cerro y RincÃ³n de Tranqueras.**

La ausencia de una pista concreta en una localidad significa brecha de huella pÃºblica indexada, no ausencia de establecimientos.

## Google Maps y coordenadas

ChatGPT no utilizÃ³ una clave privada de Google. Se revisaron resultados y fichas pÃºblicas accesibles, pero no se guardaron coordenadas nuevas. DespuÃ©s del `dry-run`, Codex puede verificar Ãºnicamente los candidatos supervivientes y conservar `place_id`, URL externa, fecha y persona revisora.

## Archivos entregados

```text
tacuarembo_chatgpt_public_candidates_2026-08-04.json
tacuarembo_chatgpt_public_review_2026-08-04.csv
tacuarembo_chatgpt_public_research_report_2026-08-04.md
tacuarembo_chatgpt_search_log_2026-08-04.md
```

## Prompt preparado para Codex

```text
Read AGENTS.md.

Use:

data/discovery/tacuarembo/tacuarembo_chatgpt_public_candidates_2026-08-04.json

Execute only the TacuarembÃ³ comparison and deduplication dry run.

This file was produced by ChatGPT public-web research. It is not a verified
registry and nothing may be published automatically.

Baseline:

- Historical coverage reference: 23 ELEPEM (4 hogares and 19 residencias).
- National exclusion index: 953 entries.
- Known facilities: 898.
- Private candidates: 55.
- Entries with department=TacuarembÃ³: 11.
- Additional null-department OSM candidate for San Vicente de Paul:
  EXC-CANDIDATE-9565C76BF06202F1.
- Candidate/control records in this file: 34.
- These counts represent different layers and must not be added or
  subtracted as current unique physical establishments.
- The national index marks PDF row-merging contamination. Contaminated
  contacts must never be strong matching keys.

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
   - Tacuavida versus Tacuavida Plus;
   - Los Jazmines at Gral. Rivera 199 versus Henry Dunant 414;
   - Nuevo Amanecer versus Los Jazmines at Henry Dunant 414;
   - Casa Las Violetas at Bulevar Artigas 152 versus Residencial Las
     Violetas at Gral. Artigas 172;
   - Segundo Marisel versus Residencial Maricel and FantasÃ­a Maricel;
   - Hogar de San Gregorio versus historical Los Patitos;
   - San Vicente de Paul official entry versus the null-department OSM
     candidate.
11. Correct Hogar DespuÃ©s de Nosotros to PaysandÃº scope and do not import
    it as TacuarembÃ³.
12. Exclude the two family-insertion services and Hogar PsiquiÃ¡trico Los
    Murales from ELEPEM import.
13. Do not call Google, Instagram, Facebook, IDE Uruguay, Overpass or any
    other external service during this dry run.
14. Do not write to Supabase.
15. Do not modify public.residenciales or the public map.
16. Return:
   - exact matches;
   - probable matches;
   - unmatched probable-new physical sites;
   - move/rebrand/address-reuse and branch cases;
   - corrections required in the exclusion index;
   - records without exact address;
   - historical-only identities;
   - false positives and non-ELEPEM exclusions;
   - inserts, links and relationship rows that a later --apply would perform.
17. Run focused tests and git diff --check.

Stop after the dry run.
```
