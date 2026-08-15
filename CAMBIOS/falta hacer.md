# Falta hacer

Solo se incluyen tareas pendientes. Cuando una quede resuelta, se puede borrar.

## Etapa 1 — Decisiones y tareas manuales

- **[FALTA]** Elegir la URL permanente de cada ELEPEM: `/elepem/[id]` o `/residencial/[slug]`.
- **[FALTA]** Decidir si Arandú seguirá como prototipo o se preparará para uso real.

## Etapa 2 — Formulario “Tengo una preocupación”

- **[PARCIAL]** Privacidad y contacto: están las tres modalidades y no hay alias, pero faltan nombre, relación, medio y horario seguro y la restricción de contacto temprano.
- **[FALTA]** Hacer que el servidor descarte siempre el contacto de una comunicación anónima y rechace modalidades inválidas.
- **[FALTA]** Exigir al menos una categoría o un relato antes de enviar.
- **[FALTA]** Reparar el correo con el código de seguimiento.
- **[FALTA]** Evitar duplicados cuando falla la carga de un adjunto después de crear el expediente.
- **[FALTA]** Agregar la advertencia de que no es un servicio de emergencia, si se aprueba.
- **[PARCIAL]** Bandejas privadas: muestran parte de la preocupación, pero faltan los nuevos datos de contacto seguro y relación.

## Etapa 3 — Ficha permanente de cada ELEPEM

- **[FALTA]** Crear la página pública individual con URL permanente, metadatos, página no encontrada y sitemap.
- **[PARCIAL]** Completar dirección, contacto verificado, tipo, capacidad, servicios, fecha y estados “Sin información verificada”.
- **[PARCIAL]** Separar y explicar correctamente habilitación MSP, certificado MIDES y situación no confirmada.
- **[FALTA]** Diferenciar datos oficiales, datos aportados por el centro y datos sin verificar.
- **[PARCIAL]** Galería: las fotos existen, pero faltan autoría, fuente, fecha, verificación y control de personas identificables.
- **[PARCIAL]** Acciones de la ficha: están experiencia y preocupación, pero faltan guía y reporte de dato incorrecto.
- **[PARCIAL]** Experiencias públicas: existe moderación, pero falta integrarlas en la ficha permanente del ELEPEM.

## Etapa 4 — Portada, mapa y listado

- **[FALTA]** Hacer que marcador, nombre, tarjeta y “Ver ficha” lleven a la misma página permanente.
- **[FALTA]** Redirigir los enlaces antiguos `?elepem=ID` a la ficha permanente.

## Etapa 5 — Datos, fuentes e imágenes

- **[PARCIAL]** Punto violeta: ya hay uno solo, pero todavía tiene precio, clasificación, descripción y ficha ficticios y puede aparecer en resultados.

## Etapa 6 — Diseño visual

- **[FALTA]** Incorporar la estrella pequeña, la trama de puntos y el tratamiento editorial de títulos.

## Etapa 7 — Operación antes de producción

- **[FALTA]** Documentar el procedimiento humano de moderación, anonimización, retiro y revocación.
- **[FALTA]** Definir retención y eliminación de contactos, relatos, respuestas y adjuntos.
- **[PARCIAL]** Los adjuntos tienen validaciones básicas, pero falta cuarentena y control antimalware.
- **[FALTA]** Validar RLS, contactos privados, moderación, publicación y retiro en un Supabase no productivo.
- **[FALTA]** Preparar autenticación, roles, responsables y soporte reales si se abandona el modo demo.
- **[PARCIAL]** Autorizaciones futuras de experiencias: se registran, pero falta decidir si algún día se ejecutarán.
- **[PARCIAL]** Publicación anonimizada: el flujo moderado existe, pero falta prepararlo para uso real y mostrarlo en la ficha permanente.

## Etapa 8 — Pruebas finales

- **[FALTA]** Ampliar pruebas de privacidad, contacto, seguimiento y adjuntos de `/preocupacion`.
- **[FALTA]** Probar la ficha permanente, redirecciones, restauración de estado y eliminación de datos ficticios.
- **[FALTA]** Revisar manualmente teclado, foco, lector de pantalla, zoom 200 % y anchos móviles y de escritorio.
- **[FALTA]** Hacer la revisión final legal, editorial y operativa.
- **[FALTA]** Ejecutar instalación reproducible, lint, pruebas, build y revisión del diff después de implementar los cambios elegidos.
