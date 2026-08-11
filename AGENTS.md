# Arandú — instrucciones para Codex

## Objetivo

Construir un sistema legal, auditable y conservador para descubrir posibles
ELEPEM en Uruguay, compararlos con la base existente y enviarlos a una cola
privada de revisión humana.

## Reglas no negociables

- Antes de cualquier tarea de descubrimiento, importación, Google Places,
  Instagram, Facebook, matching o geocodificación, leer:
  `docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md`
- No usar Playwright, Selenium, cuentas falsas, proxies ni automatización de login.
- No sortear CAPTCHA, bloqueos, rate limits, robots.txt ni controles de acceso.
- No copiar ni almacenar reseñas, autores, fotografías o contenido de Google.
- Google solo puede utilizarse mediante un place_id vinculado manualmente y
  un enlace externo a Google Maps.
- De Instagram y Facebook, conservar inicialmente solo URL pública, fecha de
  consulta y una observación humana breve.
- No recopilar datos de residentes, historias clínicas, documentos, teléfonos
  personales ni contenido de denuncias.
- Ningún candidato se publica automáticamente.
- Nunca guardar secretos o archivos .env en Git.
- Nunca utilizar credenciales de producción en pruebas.
- No alterar rutas públicas o la interfaz existente fuera de la tarea indicada.

## Archivo maestro inmutable

- Todo el árbol `Base de Datos/` contiene insumos originales y es de solo lectura para Codex.
- Codex no puede editar, formatear, renombrar, mover, reemplazar ni borrar ningún archivo dentro de `Base de Datos/`.
- Las validaciones sobre esos archivos deben ser de solo lectura.
- Para procesar un insumo, crear una copia trazable fuera de `Base de Datos/`, preferentemente en `data/discovery/`, conservando ruta de origen, fecha y hash.
- Las normalizaciones, deduplicaciones, reportes e importaciones se ejecutan sobre la copia o sobre la base operativa, nunca sobre el original.
- Si un comando pudiera escribir dentro de `Base de Datos/`, detenerlo y cambiar la salida a una ruta operativa segura.

## Investigación pública y reparto de tareas

- Codex no hará scraping directo de la interfaz de Google Maps, Instagram ni Facebook.
- Codex no iniciará sesión ni automatizará login en Instagram o Facebook.
- No se usará la API oficial de Instagram o Facebook en este proyecto.
- La investigación pública de Instagram, Facebook, Google Maps, medios,
  directorios y otras fuentes será realizada en ChatGPT Plus/Pro fuera del
  repositorio.
- Codex sí puede importar archivos JSON, CSV y Markdown preparados por ChatGPT
  y conservar sus URLs, fechas, observaciones factuales y limitaciones.
- Codex no descargará masivamente publicaciones, comentarios, fotografías,
  seguidores, historiales de cuentas ni datos personales.
- La clave de Google Maps almacenada localmente podrá usarse únicamente para
  verificación controlada de candidatos y obtención de place_id.
- No se usará Google Places para construir automáticamente la base nacional,
  copiar masivamente fichas ni generar coordenadas para el mapa de Arandú.
- De Google solo se conservará de forma permanente el place_id, la URL externa,
  la fecha de verificación y la identidad de la persona revisora.
- Ningún candidato se publica automáticamente.

## Evidencia

- Nivel A: una fuente oficial nominal.
- Nivel B: dos fuentes públicas independientes y coherentes.
- Nivel C: una pista todavía no corroborada.

## Método de trabajo

- Inspeccionar antes de editar.
- Hacer cambios pequeños y reversibles.
- Mostrar el plan antes de aplicar migraciones.
- Ejecutar npm ci, lint, build y pruebas disponibles.
- Informar archivos modificados, comandos ejecutados, fallas y riesgos pendientes.
- No ocultar errores ni reemplazar dependencias masivamente para hacer pasar un build.

## Definition of done

Una tarea solo está terminada cuando:
- el código compila;
- las pruebas pertinentes pasan;
- no se incorporaron secretos;
- existe trazabilidad de fuente y fecha;
- el cambio no publica candidatos automáticamente;
- el diff fue revisado.
