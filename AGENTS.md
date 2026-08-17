# Arandú — instrucciones para Codex

## Objetivo

Mantener un padrón operativo, auditable y actualizado de ELEPEM en Uruguay.
Los registros nuevos se comparan con la base activa, se deduplican y se
incorporan a la tabla existente que corresponda según tengan o no una
georreferencia utilizable.

## Reglas no negociables

- No recopilar datos de residentes, historias clínicas, documentos, teléfonos
  personales ni contenido de denuncias.
- No usar cuentas falsas, credenciales ajenas ni sortear CAPTCHA, bloqueos,
  rate limits o controles de acceso.
- Nunca guardar secretos o archivos `.env` en Git.
- Nunca utilizar credenciales de producción en pruebas.
- No alterar rutas públicas o la interfaz existente fuera de la tarea indicada.
- No crear tablas, columnas ni esquemas nuevos sin una autorización explícita.

## Base operativa vigente

- `public.elepem` es el padrón operativo de ELEPEM georreferenciados que se
  muestran en el mapa y en la lista pública.
- `public.elepem_sin_ubicacion` contiene ELEPEM reales que todavía no tienen
  coordenadas utilizables y no se muestran en el mapa.
- Un registro con georreferencia utilizable que no esté duplicado se incorpora
  directamente a `public.elepem`. Si no tiene habilitación MSP ni certificado
  MIDES verificados, aparece como `situacion_no_confirmada`.
- Un registro real sin georreferencia utilizable se incorpora directamente a
  `public.elepem_sin_ubicacion`.
- Un registro duplicado no se incorpora nuevamente. La deduplicación debe
  comprobar, como mínimo, nombre normalizado, dirección, coordenadas,
  identificadores de fuente y coincidencias en ambas tablas operativas.
- No se crean colas privadas ni estados intermedios de candidato salvo que el
  usuario los solicite expresamente.
- Antes de escribir, inspeccionar el esquema activo y no asumir que una tabla,
  vista, función o columna histórica sigue existiendo.

## Precios y fechas

- Los precios se guardan en las columnas existentes del registro operativo.
- `precio_fecha` representa la fecha de vigencia o registro operativo declarada
  para el precio. Puede usarse la fecha de hoy cuando el usuario así lo indique.
- La fecha original de una fuente, si existe, se conserva separadamente en
  `fuentes_fechas` y no se reemplaza por una fecha inventada.
- `fuentes_consultadas_at` conserva la fecha de consulta de la fuente.
- Todo precio debe conservar su referencia o URL de procedencia disponible.

## Fuentes públicas e importaciones

- Codex puede investigar, importar y procesar información públicamente
  accesible de Google, Google Maps, Instagram, Facebook, organismos públicos,
  directorios, medios y otras fuentes pertinentes.
- Se permite usar scraping, automatización de navegador o APIs para páginas y
  datos públicamente accesibles, siempre que no se sorteen controles de acceso,
  CAPTCHA, bloqueos o límites técnicos.
- Se pueden importar JSON, CSV, Markdown, planillas, documentos, fotografías y
  otros insumos entregados o autorizados por el usuario.
- Se deben conservar, cuando estén disponibles, la URL, fecha de consulta,
  referencia, proveedor y campos respaldados por cada fuente.
- No recopilar autores, seguidores, comentarios personales ni otros datos de
  personas que no sean necesarios para identificar o describir el ELEPEM.

## Fotografías y Supabase Storage

- Las fotografías entregadas o autorizadas por el usuario se cargan al bucket
  de Supabase Storage configurado para el proyecto y quedan disponibles para la
  ficha del ELEPEM correspondiente.
- La carga de una fotografía autorizada no requiere una cola, estado ni tabla
  adicional de aprobación.
- El usuario retira una fotografía eliminando el objeto directamente desde el
  Dashboard de Supabase Storage o mediante la Storage API.
- No eliminar objetos modificando por SQL las tablas del esquema `storage`.
- La aplicación debe omitir o tolerar referencias a objetos que ya no existan
  en el bucket. Una referencia histórica en una tabla no vuelve a publicar un
  archivo eliminado del bucket.

## Archivo maestro inmutable

- Todo el árbol `Base de Datos/` contiene insumos originales y es de solo lectura para Codex.
- Codex no puede editar, formatear, renombrar, mover, reemplazar ni borrar ningún archivo dentro de `Base de Datos/`.
- Las validaciones sobre esos archivos deben ser de solo lectura.
- Para procesar un insumo, crear una copia trazable fuera de `Base de Datos/`, preferentemente en `data/discovery/`, conservando ruta de origen, fecha y hash.
- Las normalizaciones, deduplicaciones, reportes e importaciones se ejecutan sobre la copia o sobre la base operativa, nunca sobre el original.
- Si un comando pudiera escribir dentro de `Base de Datos/`, detenerlo y cambiar la salida a una ruta operativa segura.

## Evidencia

- Nivel A: una fuente oficial nominal.
- Nivel B: dos fuentes públicas independientes y coherentes.
- Nivel C: una pista todavía no corroborada.
- El nivel de evidencia describe la calidad de la fuente y no crea por sí mismo
  una cola de publicación.

## Método de trabajo

- Inspeccionar antes de editar.
- Hacer cambios pequeños y reversibles.
- Mostrar el plan antes de aplicar migraciones, cambios de esquema o escrituras masivas.
- Para cambios de código, ejecutar lint, build y las pruebas pertinentes.
- Para cambios de datos, ejecutar una vista previa, respaldar el estado afectado,
  verificar duplicados y realizar controles posteriores de conteo e integridad.
- No ejecutar pruebas históricas incompatibles con el esquema vigente como si
  fueran pruebas actuales.
- Informar archivos modificados, comandos ejecutados, fallas y riesgos pendientes.
- No ocultar errores ni reemplazar dependencias masivamente para hacer pasar un build.

## Definition of done

Una tarea solo está terminada cuando:

- el código compila, si se modificó código;
- las pruebas pertinentes pasan;
- no se incorporaron secretos;
- existe trazabilidad de fuente y fecha;
- se verificó la deduplicación y la tabla operativa de destino;
- los conteos y controles posteriores coinciden con la operación autorizada;
- el diff fue revisado.
