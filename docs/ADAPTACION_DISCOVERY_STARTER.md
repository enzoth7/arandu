# Adaptación del starter de descubrimiento

Fecha de revisión: 2026-08-02.

## Alcance

El archivo `public/arandu-discovery-starter.patch` se utilizó solamente
como referencia de diseño. No se aplicó porque parte de una versión anterior de
`package.json` y propone un segundo esquema de candidatos incompatible con el
repositorio actual.

La adaptación conserva estas decisiones:

- separar candidatos del padrón público;
- comparar nombre, dirección, localidad, departamento y coordenadas;
- mantener los resultados como sugerencias para revisión humana;
- conservar fuente y fecha de consulta;
- no publicar candidatos automáticamente.

## Contrato vigente

El mapa público obtiene sus registros de `public.residenciales`. La cola
privada existente es `public.residencial_discovery_candidates`, cuyos IDs usan
el formato `RDC-` seguido de 16 caracteres hexadecimales.

El starter proponía tablas paralelas llamadas `facility_candidates`,
`facility_source_observations`, `facility_candidate_sources` y
`facility_external_ids`, con IDs UUID. Ningún script adaptado presupone que
esas tablas existan.

Los estados automáticos del matching local usan el contrato actual:

- `new_candidate`;
- `possible_match`;
- `probable_match`.

No equivalen a decisiones humanas ni a evidencia A o B.

## Utilitario local

`scripts/match-facility-candidates.mjs` compara un archivo local de candidatos
contra un archivo local del padrón. No abre conexiones de red ni de base de
datos y rechaza expresamente `--apply`.

Ejemplo:

```powershell
node scripts/match-facility-candidates.mjs `
  --input ruta\candidates.json `
  --existing data\discovery\residenciales-live-2026-08-02.json `
  --out scratch\candidate-matches.json
```

El archivo de salida incluye hasta tres coincidencias sugeridas por candidato,
las métricas del matching y `requiresHumanReview: true`. No contiene una orden
de publicación ni escribe en Supabase.

## Fuentes permitidas

- Nivel A: fuente oficial nominal, validada por una persona.
- Nivel B: dos fuentes públicas independientes y coherentes, validadas por una
  persona.
- Nivel C: pista sin corroborar; permanece privada.

OpenStreetMap puede generar pistas con atribución ODbL, pero sus etiquetas no
prueban que un lugar sea un ELEPEM ni que esté activo. Google se limita a un
`place_id` vinculado manualmente y un enlace externo. De Instagram y Facebook
solo corresponde conservar URL pública, fecha de consulta y observación humana
breve.

No se guardan reseñas, autores, fotografías, teléfonos personales, datos de
residentes, historias clínicas, documentos ni contenido de denuncias.

## Cambios deliberadamente no portados

- la migración `20260801090000_discovery_and_review_signals.sql`;
- las tablas `facility_*` y `review_*` propuestas por esa migración;
- API y componentes que dependían de esas tablas;
- Places UI Kit y cualquier visualización embebida de reseñas de Google;
- clientes que contacten IDE, Overpass, Google u otros servicios;
- scripts de entrenamiento o taxonomías basadas en relatos/reseñas;
- comandos que escriban en Supabase o modifiquen datos productivos.

Una futura migración deberá ampliar el esquema vigente en vez de crear una cola
paralela. Antes de aplicarla se requiere plan, SQL de reversión, prueba sin
credenciales productivas y verificación explícita de que solo evidencia A/B
revisada puede llegar al mapa público.
