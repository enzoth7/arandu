# Residenciales de Canelones — 13/08/2026

Contenido:

- `residenciales.json`: 89 registros base de Supabase y 56 residenciales adicionales hallados en fuentes web.
- `fotos/<ID>/`: 409 imágenes descargadas, enlazadas desde el JSON mediante `local_path`.

Interpretación:

- `residences`: registros originados en `public.residenciales` de Supabase.
- `discovered_residences`: hallazgos web que no pudieron asociarse de forma segura a un ID de Supabase.
- `listed_as_habilitado_msp_june_2026`: figura en el listado MSP de junio de 2026.
- `historical_or_unverified` y `web_listing_unverified`: no prueban habilitación ni actividad vigente.
- `historical_published_unverified`: último precio público encontrado, antiguo y no confirmado como vigente.
- `consult`: la fuente indica que hay que consultar.
- `not_found`: no se encontró un precio público atribuible; no implica que no exista una cuota.

Cada contacto, precio y foto conserva sus fuentes. Las 409 fotos tienen hash SHA-256, dimensiones, tipo MIME y ruta local validados. La licencia figura como desconocida salvo indicación. Algunas imágenes pueden mostrar personas identificables; revisar derechos y consentimiento antes de reutilizarlas o publicarlas.
