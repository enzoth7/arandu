# Plan integrado de cambios priorizados

Arandú: ajustes seguros ahora, controles antes de Fase 2 y propuestas grandes después.

## Cómo usar este plan

Primero se realizan sólo cambios visuales o de contenido claramente seguros. Antes de ampliar la aplicación se verifican los flujos existentes. Todo lo que modifique datos, privacidad, autenticación, URLs o procesos operativos pasa a Fase 2.

**Regla de protección:** no borrar funcionalidades, enlaces, datos ni flujos actuales sólo para cumplir una sugerencia visual. Si una solicitud puede afectar información, rutas públicas, seguridad o trabajo institucional, se conserva y se analiza en Fase 2.

## 1. Para hacer hoy: ajustes visuales y de contenido de bajo riesgo

Objetivo: mejorar claridad y coherencia sin cambiar el funcionamiento existente ni publicar información nueva.

### Dirección editorial de la interfaz

**Qué se hace:** aplicar títulos azul marino con línea corta azul, estrella pequeña y trama de puntos; fondo blanco, celestes suaves, tarjetas limpias y sombras mínimas.

**Límite:** no cambiar la arquitectura de pantallas ni reemplazar componentes funcionales sólo por estilo.

### Filtros, botones y estados

**Qué se hace:** usar filtros blancos con borde azul, estado activo azul, botones principales azules y enlaces secundarios azul marino. Mostrar los tres estados institucionales con el mismo texto en contador, marcador y tarjeta.

**Límite:** el color siempre acompaña texto e icono o patrón; no se modifica aún la lógica que calcula estados.

### Fuentes y textos visibles

**Qué se hace:** mostrar las fuentes como nombres descriptivos clickeables y mejorar textos visibles que hoy confundan, sin exponer URLs largas.

**Límite:** no se agregan fuentes, datos de comparación, fotos o precios nuevos sin revisión y trazabilidad.

### Datos de demostración

**Qué se hace:** dejar claramente identificado el único punto violeta de ejemplo y reemplazar visualmente los campos no verificados por “Sin información verificada”.

**Límite:** no borrar datos ni cambiar la base operativa hoy; primero se verifica cada campo y su origen.

## 2. Antes de Fase 2: controles para no romper lo que ya existe

Objetivo: comprobar lo actual, registrar riesgos y dejar decisiones preparadas. Esta etapa no rediseña formularios ni migra datos.

### Revisión de recorridos actuales

**Qué se hace:** probar portada, mapa, listado, ficha o modal vigente, experiencia, preocupación, acceso institucional y bandejas privadas con datos de demostración.

**Límite:** sólo se corrigen regresiones comprobadas; no se sustituyen flujos por versiones nuevas sin una decisión explícita.

### Pruebas de seguridad y privacidad existentes

**Qué se hace:** comprobar validaciones de contacto, modalidades de privacidad, adjuntos, códigos de seguimiento y visibilidad de bandejas privadas.

**Límite:** las reglas nuevas de descarte de contacto, duplicados, cuarentena y antimalware se diseñan para Fase 2; no se improvisan cambios de servidor.

### Accesibilidad y respuesta móvil

**Qué se hace:** revisar teclado, foco visible, etiquetas de formulario, texto alternativo, lector de pantalla, zoom al 200 % y anchos móviles y de escritorio.

**Límite:** los hallazgos se corrigen si son visuales o de marcado local; los que requieren rediseño de flujo se reservan para Fase 2.

### Auditoría de datos ficticios y fuentes

**Qué se hace:** listar dónde siguen apareciendo precios, estrellas, reseñas, descripciones, fotos o fichas de ejemplo; confirmar fuentes y fechas de los datos visibles.

**Límite:** no importar, geocodificar ni descubrir nuevos establecimientos durante esta revisión.

### Calidad técnica

**Qué se hace:** después de cada cambio elegido, ejecutar instalación reproducible, lint, pruebas disponibles, build y revisión del diff.

**Límite:** no se reemplazan dependencias ni se ocultan errores para forzar una compilación exitosa.

### Decisiones pendientes

**Qué se hace:** dejar por escrito la URL futura (`/elepem/[id]` o `/residencial/[slug]`), el destino del prototipo (demo o uso real), el texto de emergencia y la política breve de moderación.

**Límite:** no tomar estas decisiones dentro del código ni activar comportamientos de producción hasta contar con aprobación institucional.

## 3. Fase 2: cambios grandes o con impacto técnico e institucional

Objetivo: planificar cada bloque con alcance, responsables, pruebas, criterios legales y revisión humana. No se inicia por una solicitud visual aislada.

### Ficha pública permanente y navegación

Crear páginas individuales con URL permanente, metadatos, página no encontrada, sitemap, redirección de `?elepem=ID` y restauración de filtros, scroll y mapa.

Requiere decisión de URL, diseño de rutas, pruebas de compatibilidad y plan de migración.

### Formulario de experiencias

Simplificar privacidad, contacto, autorización al ELEPEM, preguntas, símbolos de escala, confirmación y publicación moderada dentro de la futura ficha.

Requiere rediseño de datos y reglas de moderación; no se elimina ni altera el flujo actual sin pruebas de privacidad.

### Flujo de preocupaciones

Completar información de contacto seguro, validaciones de servidor, prevención de duplicados, correo de seguimiento, adjuntos y bandejas privadas.

Requiere aprobación del aviso de emergencia, definición de retención y revisión legal y operativa antes de uso real.

### Alta y área de ELEPEM

Incorporar cuenta, documentación privada, verificación, estados de revisión, actualización de ficha y recepción de mensajes autorizados.

Requiere autenticación, roles, gestión segura de documentos, moderación y responsables definidos; no se habilita en modo demo.

### Datos, imágenes y fuentes verificadas

Distinguir datos oficiales, aportados y no verificados; completar galería con autoría, fuente, fecha y verificación; incorporar sólo establecimientos con evidencia y trazabilidad.

No se automatiza descubrimiento, Google Maps, Instagram, Facebook ni publicación de candidatos. Todo candidato mantiene revisión humana.

### Operación para producción

Definir procedimiento humano de moderación, anonimización, retiro, revocación, retención y eliminación, soporte, responsables y controles de base de datos no productiva.

No se pasa de prototipo a servicio real sin revisión legal, editorial, técnica y operativa final.

## Cierre

Orden recomendado: hacer primero la sección 1; completar la sección 2 como control de seguridad; convertir cada bloque de la sección 3 en un proyecto separado de Fase 2. Así el diseño mejora hoy sin desarmar lo que ya funciona.
