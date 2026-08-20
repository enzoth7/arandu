# InvestigaciÃ³n pÃºblica de ELEPEM â€” Departamento de Montevideo

**Fecha:** 2026-08-04  
**Referencia histÃ³rica de cobertura:** 537 ELEPEM  
**Ãndice de exclusiÃ³n:** `known_facilities_exclusion_index_2026-08-03.json`  
**Alcance:** todo el departamento, investigado por barrios y corredores.

## Resumen ejecutivo

Se estructuraron **82 registros o casos de control**:

- **21 candidatos actuales probables**;
- **22 pistas que necesitan mÃ¡s evidencia**;
- **2 pistas sin direcciÃ³n exacta**;
- **13 posibles mudanzas, cambios de nombre, nuevas sucursales o reutilizaciones de domicilio**;
- **21 coincidencias conocidas**;
- **1 coincidencia conocida probable**;
- **2 falsos positivos departamentales**.

NingÃºn registro tiene coordenadas verificadas en este archivo y **ninguno
puede publicarse automÃ¡ticamente**.

## Cobertura de la base existente

La auditorÃ­a del proyecto registra **503 entradas con departamento
Montevideo**. Una lectura geogrÃ¡fica mÃ¡s amplia del Ã­ndice da **562
entradas**, porque incorpora casos sin departamento pero con localidad o
coordenadas montevideanas.

La referencia de **537 ELEPEM**, las 503 entradas exactas y las 562 entradas
de alcance amplio son capas distintas. No se usa:

```text
537 - 503 = 34 nuevos confirmados
```

## ComparaciÃ³n Aderama 2026

Se compararon **199 filas de Montevideo** del directorio
sectorial:

| Resultado de comparaciÃ³n | Cantidad |
|---|---:|
| Nombre y direcciÃ³n coinciden con la misma entrada | 71 |
| Nombre y direcciÃ³n existen pero apuntan a entradas distintas | 6 |
| Solo coincide exactamente el nombre | 54 |
| Solo coincide exactamente la direcciÃ³n | 19 |
| No coincide exactamente ni nombre ni direcciÃ³n | 49 |

Las 49 filas sin coincidencia exacta no se
declararon automÃ¡ticamente nuevas. Fueron investigadas y clasificadas en
candidatos, pistas, relaciones, controles o falsos positivos.

## Candidatos actuales probables

| Establecimiento | Barrio/zona | DirecciÃ³n | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Residencial Abril | Parque RodÃ³ | Juan Manuel Blanes 1037 | `probable_new_current` | B | high |
| Residencial Alma, Amor y Vida | Parque Batlle / La Blanqueada | Javier de Viana 2350 | `probable_new_current` | B | high |
| Residencial Ãmbar | Punta Gorda / Carrasco | Mariano Uriarte 6050 | `probable_new_current` | B | high |
| Casa Yordan | Carrasco / Parque Rivera | Guillermo Arrospide 5398 | `probable_new_current` | B | high |
| Centro del Adulto Mayor Carrasco | Carrasco | Almirante Harwood 6346 | `probable_new_current` | C | medium_high |
| Centro del Adulto Mayor Buceo | Buceo | Juan M. Espinosa 1369 | `probable_new_current` | C | medium_high |
| Residencial Flor de Liz | Pocitos | Bulevar EspaÃ±a 2647 | `probable_new_current` | B | high |
| Residencial Gema Juncal | ColÃ³n | CalderÃ³n de la Barca 1867 | `probable_new_current` | B | high |
| Residencial Ãndigo | Pocitos | Av. Rivera 3218 | `probable_new_current` | B | high |
| Residencial Infinito | Carrasco | Cooper 2446 | `probable_new_current` | B | high |
| Residencial JardÃ­n del Sol | La Comercial | General Pagola 2042 | `probable_new_current` | B | high |
| La Casa de San Marino | Punta Gorda | San Marino 1320 | `probable_new_current` | B | high |
| Residencial La ForÃªt - Carrasco | Carrasco | RaÃºl Montero Bustamante 6235 | `probable_new_current` | B | high |
| Residencial Los Jacintos | Carrasco | Av Gral Rivera 6269 | `probable_new_current` | B | high |
| Residencial Manantiales | La Comercial | Cagancha 2314 | `probable_new_current` | B | high |
| Residencial Mazel Tov | Pocitos / Parque Batlle | Juan RamÃ³n Gomez 2633 Bis | `probable_new_current` | B | high |
| Residencial Pontevedra | Reducto / Villa MuÃ±oz | Blandengues 1915 | `probable_new_current` | B | high |
| Hogar Santa Isabel | La Blanqueada | Luis Alberto de Herrera 2229 | `probable_new_current` | B | high |
| Residencial SueÃ±o Azul | La Blanqueada | Francisco SimÃ³n 2214 | `probable_new_current` | B | high |
| Residencial Paul Cezanne | Buceo | Comercio 1941 | `probable_new_current` | B | high |
| Residencial Santa Clara | Carrasco | Teniente NavÃ­o Mario Botto Aparicio 1754 | `probable_new_current` | B | high |

Son los candidatos mÃ¡s fuertes de la primera pasada. Aun asÃ­, Codex debe
compararlos contra Supabase, OSM, alias, telÃ©fonos y domicilios antes de
proponer un alta privada.

## Pistas que necesitan evidencia adicional o domicilio

| Establecimiento | Barrio/zona | DirecciÃ³n | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Residencial MarÃ­a Paula | Jacinto Vera | MartÃ­n C. MartÃ­nez 3013 | `needs_more_evidence` | C | medium |
| Residencial Brisas de MalvÃ­n | MalvÃ­n | HipÃ³lito Yrigoyen 1719 | `needs_more_evidence` | C | medium |
| Inema Residencial | UniÃ³n | 8 de Octubre 4094 | `needs_more_evidence` | C | medium |
| Residencial Copelia | Punta Gorda / Carrasco | Emilio Oribe 2065 | `needs_more_evidence` | C | medium |
| Cooperativa Seran | norte/oeste de Montevideo | Besnes Hirigoyen 5674 | `needs_more_evidence` | C | medium |
| Residencial Eureka | Prado / Atahualpa | Camino Castro 152 A | `needs_more_evidence` | C | medium |
| Galicia 1 | Cerro / oeste | Juan B. Viacaba 1667 | `needs_more_evidence` | C | medium |
| Galicia 2 | Cerro / oeste | Grecia 3567 | `needs_more_evidence` | C | medium |
| Amitie | â€” | Gral Felipe Fraga 2191 | `needs_more_evidence` | C | medium |
| El Naranjo | â€” | Bernardo Susviela 4221 | `needs_more_evidence` | C | medium |
| Madre Inmaculada | â€” | Juan Cabal 2281 | `needs_more_evidence` | C | medium |
| Magna Pocitos | Pocitos | Marco Bruto 1226 | `needs_more_evidence` | C | medium |
| Matildas | â€” | Colombes 1592 | `needs_more_evidence` | C | medium |
| Mamina II | â€” | Gral Fraga 2191 | `needs_more_evidence` | C | medium |
| Morena Residencia | â€” | Hermanos Ruiz 3471 | `needs_more_evidence` | C | medium |
| Pro Gente | â€” | Bulevar Artigas 2577 | `needs_more_evidence` | C | medium |
| Sully Arce | â€” | Camino Carlos LÃ³pez 8046 | `needs_more_evidence` | C | medium |
| UniÃ³n | UniÃ³n | Gobernador Viana 2475 | `needs_more_evidence` | C | medium |
| Villa Azul | â€” | Garibaldi 2584 | `needs_more_evidence` | C | medium |
| Residencial Esmeralda | Bella Vista | AgustÃ­n Musso 933 | `needs_more_evidence` | C | medium |
| Residencial Tercera Edad | Aguada | YaguarÃ³n 1958 | `needs_more_evidence` | C | medium |
| Residencial Punta Palmas | Punta Gorda | CaramurÃº 5830 | `needs_more_evidence` | C | medium_high |
| Residencial AC | Pocitos | Sin direcciÃ³n exacta | `address_missing` | C | medium |
| MoirÃº II | Prado | Sin direcciÃ³n exacta | `address_missing` | C | medium |

Los registros sin direcciÃ³n exacta no deben recibir coordenadas del centro
del barrio o de Montevideo.

## Mudanzas, rebrandings, sucursales y reutilizaciÃ³n de domicilio

| Establecimiento | Barrio/zona | DirecciÃ³n | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Casa Blanca | Pocitos | Cnel. Mora 485 | `possible_move_or_rebrand` | B | high |
| Mediterraneo II | Aguada | Avda. Agraciada 3157 | `possible_move_or_rebrand` | B | high |
| Mediterraneo Carrasco | Carrasco | Gral. NariÃ±o 1625 | `possible_move_or_rebrand` | B | medium_high |
| MOAI Centenario | Parque Batlle | Centenario 3076 | `possible_move_or_rebrand` | B | high |
| MOAI French | Carrasco | Gral. Domingo French 1726 | `possible_move_or_rebrand` | B | high |
| San Fernando Entre Amigos 2 | Carrasco | Rivera 6137 | `possible_move_or_rebrand` | C | medium_high |
| Ãlamos Montevideo | â€” | Ibiray 2398 | `possible_move_or_rebrand` | B | high |
| Casa Blanca II | â€” | Pablo de MarÃ­a 1172 | `possible_move_or_rebrand` | B | high |
| MOAI Libertad | â€” | Libertad 2840 | `possible_move_or_rebrand` | B | high |
| MOAI Rivera | â€” | Guardizabal 1634 | `possible_move_or_rebrand` | B | high |
| Residencial Vita Nuova | Punta Gorda | Palmas y OmbÃºes 5610 | `possible_move_or_rebrand` | B | high |
| MoirÃº III | Prado | Avenida Agraciada 3444 | `possible_move_or_rebrand` | B | high |
| Residencial La ForÃªt - La Blanqueada | La Blanqueada | Jaime Cibils 2824 | `possible_move_or_rebrand` | B | high |

Los casos principales incluyen Casa Blanca/Casablanca, MediterrÃ¡neo II/La
Rosaleda, las sedes MOAI, MoirÃº, Vita Nuova/Las Gardenias y La ForÃªt La
Blanqueada/Old Trafford.

## Coincidencias conocidas

| Establecimiento | Barrio/zona | DirecciÃ³n | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Centro del Adulto Mayor OmbÃº | Pocitos | Bv. EspaÃ±a 2583 | `known_exact_match` | B | high |
| Manas | Carrasco | Militon Drake 1993 | `known_exact_match` | B | high |
| Residencial MarÃ­a Gracia | CordÃ³n | Gaboto 1577 | `known_exact_match` | A | high |
| Tea Garden | Lezica | Avda. Lezica 5858 | `known_exact_match` | B | high |
| Valle Vilcabamba II | Carrasco | Fleming 1742 | `known_exact_match` | B | high |
| San Antonio | UniÃ³n | Avda 8 Octubre 4241 | `probable_known_match` | B | high |
| Altos de Boulevard | â€” | Bulevar Artigas 2188 | `known_exact_match` | B | high |
| Babel Boutique | â€” | Mariano Uriarte 6537 | `known_exact_match` | B | high |
| Bonsejour | â€” | Pedro Blanes Viale 6222 | `known_exact_match` | B | high |
| Casa del Sol 2 | â€” | Eduardo RaÃ­z 1919 | `known_exact_match` | B | high |
| Centro del Adulto Mayor Prado | â€” | Av. Agraciada 3373 | `known_exact_match` | B | high |
| Hotel Lafayette | â€” | Soriano 1170 | `known_exact_match` | B | high |
| Centro Residencial LAR | â€” | Juan M. Espinosa 1480 | `known_exact_match` | B | high |
| Las Flores 2 | â€” | Estero Bellaco 2667 | `known_exact_match` | B | high |
| London Rambla | â€” | Rambla TomÃ¡s Berreta 6885 | `known_exact_match` | B | high |
| Mediterraneo III | â€” | Joaquin Suarez 3429 | `known_exact_match` | B | high |
| Petite Home | â€” | Manuel Pintos Cardeiros 5647 | `known_exact_match` | B | high |
| San Fernando Entre Amigos | â€” | Yamandu RodrÃ­guez 1399 | `known_exact_match` | B | high |
| Valle Vilcabamba I | â€” | Copacabana 6815 | `known_exact_match` | B | high |
| Valle Vilcabamba III | â€” | Palmas y OmbÃºes 5804 | `known_exact_match` | B | high |
| Valle Vilcabamba IV | â€” | Almirante Harwood 6214 | `known_exact_match` | B | high |
| AÃ±os Royal | Carrasco | Mantua 6883 | `known_exact_match` | A | high |

Estas filas se conservan como controles para mejorar alias, domicilios y
fuentes. No deben crear puntos nuevos.

## Falsos positivos

- **Magna, Niteroi 948:** la fuente oficial la ubica en Barra de Carrasco,
  Canelones.
- **Residencial Paradise, Jacinto Trapani 1187:** la ficha pÃºblica la ubica
  en Treinta y Tres.

## Cobertura territorial

La investigaciÃ³n se dividiÃ³ en siete zonas:

- **Centro y costa central:** Ciudad Vieja, Centro, CordÃ³n, Palermo, Barrio Sur, Parque RodÃ³, Punta Carretas.
- **Pocitos, Buceo, Parque Batlle y La Blanqueada:** Pocitos, Buceo, Parque Batlle, La Blanqueada, La Comercial, Jacinto Vera.
- **MalvÃ­n, Punta Gorda y Carrasco:** MalvÃ­n, MalvÃ­n Norte, Punta Gorda, Carrasco, Carrasco Norte, BaÃ±ados de Carrasco.
- **UniÃ³n y corredores del este:** UniÃ³n, MaroÃ±as, MalvÃ­n Norte, Punta de Rieles, Villa EspaÃ±ola, ItuzaingÃ³.
- **Prado y noroeste urbano:** Prado, Atahualpa, Aires Puros, Brazo Oriental, Bella Vista, Capurro, Reducto.
- **Oeste:** La Teja, Belvedere, Paso Molino, Cerro, CasabÃ³, Pajas Blancas, Nuevo ParÃ­s.
- **Norte y periferia:** ColÃ³n, Lezica, PeÃ±arol, Sayago, Manga, Piedras Blancas, Villa GarcÃ­a, Melilla, Montevideo rural.

La ausencia de una pista concreta en un barrio significa brecha de
informaciÃ³n pÃºblica indexada, no ausencia de establecimientos.

## Google Maps

ChatGPT no utilizÃ³ la clave de Google guardada en `.env`. DespuÃ©s del
`dry-run`, Codex puede verificar candidatos concretos y conservar Ãºnicamente
`place_id`, URL externa, fecha y persona revisora.

## Archivos entregados

```text
montevideo_chatgpt_public_candidates_2026-08-04.json
montevideo_chatgpt_public_review_2026-08-04.csv
montevideo_chatgpt_public_research_report_2026-08-04.md
montevideo_chatgpt_search_log_2026-08-04.md
```

## Prompt preparado para Codex

```text
Read AGENTS.md.

Use:

data/discovery/montevideo/montevideo_chatgpt_public_candidates_2026-08-04.json

Execute only the Montevideo comparison and deduplication dry run.

This file was produced by ChatGPT public-web research. It is not a verified
registry and nothing may be published automatically.

Baseline:

- Historical coverage reference: 537 ELEPEM.
- National exclusion index: 953 entries.
- Entries with department=Montevideo: 503.
- Broader Montevideo-scoped entries, including null-department records
  identified by locality/coordinates: 562.
- Aderama 2026 rows compared: 199.
- Candidate/control records in this file: 82.
- These counts represent different layers and must not be added or
  subtracted as though they were current unique physical establishments.
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
 place IDs and existing coordinates;
   - all Aderama comparison rows embedded in the JSON.
3. Never merge by name alone.
4. Keep one row per physical site. One operator may have multiple sites.
5. For every probable_new_current record, return the three best possible
   existing matches with explainable score components before proposing
   a private insert.
6. Keep needs_more_evidence records private until an independent current
   source or human verification is obtained.
7. Do not geocode address_missing records or assign neighborhood centroids.
8. Treat possible_move_or_rebrand as relationship reviews. Preserve every
   observed name, address, source and date.
9. Do not create a candidate for known_exact_match records; link or enrich
   the existing facility/index entry.
10. Resolve these high-priority relationships explicitly:
- Casa Blanca / Casablanca / Las Abejas at Coronel Mora;
- Amitie and Mamina II sharing Gral. Felipe Fraga 2191;
- Mediterraneo II versus La Rosaleda at Agraciada 3157;
- MOAI Centenario versus Toscana at Centenario 3076;
- MOAI French versus Casa Flora at French 1726;
- MOAI Libertad at Libertad 2840;
- MOAI Rivera versus the prior identity at Guardizabal 1634;
- La ForÃªt La Blanqueada versus Old Trafford at Jaime Cibils 2824;
- Vita Nuova versus Las Gardenias at Palmas y OmbÃºes 5610;
- Ãlamos Montevideo at Ibiray 2398;
- Casa Blanca II at Pablo de MarÃ­a 1172;
- MoirÃº II, MoirÃº III and the known MoirÃº site;
- Valle Vilcabamba door and branch variants;
- San Fernando / Entre Amigos branch variants;
- Residencial AC and any existing facility sharing its phone.
11. Discard Magna Niteroi as Canelones and Paradise as Treinta y Tres.
12. Do not call Google, Instagram, Facebook, IDE Uruguay, Overpass or any
other external service during this dry run.
13. Do not write to Supabase.
14. Do not modify public.residenciales or the public map.
15. Return:
- exact matches;
- probable matches;
- unmatched probable-new sites;
- move/rebrand/address-reuse and branch cases;
- corrections required in the exclusion index;
- records without exact address;
- false positives and non-ELEPEM exclusions;
- inserts, links and relationship rows that a later --apply would perform.
16. Run focused tests and git diff --check.

Stop after the dry run.
```
