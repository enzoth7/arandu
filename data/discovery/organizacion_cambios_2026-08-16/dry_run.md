# Organización de Cambios — dry run ejecutado

- Fecha local de captura: 2026-08-16T22:06:29.8313759Z
- Archivos esperados por el plan: 20
- Archivos reales encontrados y reconciliados: 19
- Escrituras en Supabase: 0
- Escrituras en Base de Datos/: 0

## Snapshot vivo de Supabase

- public.elepem: 1038
- public.elepem_sin_ubicacion: 99
- ELEPEM con precio: 21
- Vínculos de fotos publicadas: 147
- Fingerprint de columnas operativas: 0380558b65e60bcd4812dbf4caf12175

## Operaciones

- Preparar 59 candidatos de descripción y fuentes, sin autorización de escritura.
- Archivar el paquete aplicado de 21 precios y separar cinco indicios sin conciliar.
- Reconstruir un ZIP limpio con 143 imágenes pendientes de derechos.
- Excluir 16 imágenes NO_SUBIR y registrar sus hashes antes de eliminar el contenedor mixto.
- Preparar 84 candidatos pendientes y excluir uno con cierre definitivo.
- Normalizar 143 correcciones sin inferir categorías ni aplicarlas.
- Eliminar el SQL que crea staging_arandu.

## Gate de futuras escrituras

Antes de cualquier escritura futura se debe repetir el snapshot, deduplicar contra ambas tablas operativas y validar fechas de fuente. Este proceso no crea tablas, columnas, esquemas, colas ni buckets.