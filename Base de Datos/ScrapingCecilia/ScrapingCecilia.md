Cantidad final

Van a quedar 21 residenciales con alguna información de precio conciliada con Arandú.

La distinción importante es:

10 residenciales tendrán un precio actual, reciente o todavía publicado. Estos sí aparecerán como “precio público” y participarán en los filtros por precio.
11 residenciales tendrán únicamente una referencia histórica. Se mostrarán dentro de la ficha, pero con la etiqueta “Referencia histórica” y no participarán en los filtros.
Esos 21 residenciales reúnen 26 registros de evidencia, porque algunos tienen más de una modalidad o más de una fuente.
5 casos todavía no conciliados quedarán afuera.
Las promociones no se cargarán como precios.

Por lo tanto:

Residenciales con algún dato de precio: 21.
Residenciales con precio utilizable como actual: 10.
Residenciales con precio solamente histórico: 11.

Para Enzo — incorporación de precios públicos en Arandú
Objetivo

Incorporar a Arandú la base revisada de precios de residenciales sin presentar como actuales datos históricos, sin convertir rangos en promedios y sin modificar directamente producción.

El resultado debe permitir:

Mostrar precios públicos en las fichas de los residenciales.
Diferenciar claramente precios actuales de referencias históricas.
Filtrar por precio solamente cuando el dato sea suficientemente actual.
Mantener la fuente, fecha, moneda original y nivel de confianza de cada dato.
Actualizar o corregir precios en el futuro sin tocar manualmente el código de cada tarjeta.
Resultado esperado

La base contiene:

Categoría	Cantidad
Residenciales conciliados con Arandú	21
Con precio actual, reciente o visible	10
Con precio únicamente histórico	11
Registros de evidencia conciliados	26
Casos pendientes sin conciliación	5
Promociones que deben publicarse como precio	0

Los 21 residenciales podrán mostrar una sección de precio, pero no todos se presentarán igual:

Los 10 actuales mostrarán “Precio público”.
Los 11 históricos mostrarán “Referencia histórica”.
Los cinco pendientes no se publicarán hasta que se confirme a qué residencial de Arandú corresponden.
Rama de trabajo

No trabajar directamente en main.

Crear:

cecilia/vcr1-02-precios-publicos

tomando como rama de origen:

cecilia/vcr1-01-globales

El primer pull request debe ser:

cecilia/vcr1-02-precios-publicos
        ↓
cecilia/vcr1-01-globales

No abrir todavía el PR contra main.

La rama cecilia/vcr1-01-globales ya contiene los cambios recientes de las tarjetas, incluido el tratamiento visual de residenciales que no tienen precio. Por eso es la base adecuada.

Regla principal de implementación

No guardar toda esta información únicamente en el campo actual:

precio_mensual_uyu

Ese campo admite un solo número, pero los nuevos datos pueden ser:

un precio exacto;
un rango;
un precio “desde”;
un precio máximo;
distintos precios según habitación o modalidad;
un precio actual;
una referencia histórica;
un valor en moneda extranjera convertido a pesos uruguayos.

No se deben promediar rangos.

Ejemplo incorrecto:

Fuente: $85.000–$135.000
Valor guardado: $110.000

Ejemplo correcto:

Mínimo: $85.000
Máximo: $135.000
Presentación: $85.000–$135.000 por mes
1. Archivos de datos

Incorporar en la rama:

data/prices/arandu_precios_final_para_app.csv
data/prices/arandu_precios_evidencia_final.csv

El primer archivo debe tener una fila de resumen por residencial.

El segundo debe conservar los 26 registros individuales de evidencia.

También se puede generar automáticamente:

data/prices/arandu_precios_final_para_app.json

El Excel puede mantenerse como documento de revisión humana, pero no debe ser la fuente que lea la aplicación en producción.

2. Nueva tabla en Supabase

Crear una migración nueva, sin ejecutarla todavía en producción:

supabase/migrations/XXXXXXXXXXXXXX_add_elepem_public_prices.sql

Crear la tabla:

public.elepem_precios

Campos mínimos:

id
elepem_id
record_id
price_status
price_kind
modality
original_currency
original_price_min
original_price_max
exchange_rate_to_uyu
conversion_date
normalized_price_min_uyu
normalized_price_max_uyu
source_date_text
source_year
source_label
source_url
price_confidence
match_confidence
include_in_main_price_filter
display_mode
warning
review_status
created_at
updated_at

Relación:

elepem_precios.elepem_id
→ public.elepem.id

Cada record_id debe ser único para que ejecutar dos veces el importador no duplique precios.

Estados de precio

Usar únicamente estos valores:

current_dated
current_undated
historical

Significado:

current_dated: tiene fecha y puede presentarse como precio actual o reciente.
current_undated: sigue públicamente visible, pero no tiene una fecha clara.
historical: proviene de un año anterior y no puede presentarse como tarifa vigente.
Tipos de precio
exact
range
from
up_to
range_by_modality

Ejemplos:

exact                → $70.000
range                → $70.000–$95.000
from                 → Desde $70.000
up_to                → Hasta $95.000
range_by_modality    → Compartida $70.000 / Individual $95.000
Estado de revisión
pending
approved
rejected
needs_research

Solo los registros con:

review_status = approved

podrán llegar a la aplicación pública.

3. Vista resumen para la aplicación

Crear:

public.elepem_precio_resumen

La vista debe devolver una sola fila por residencial, aunque ese residencial tenga varias evidencias.

Campos esperados:

elepem_id
precio_min_uyu
precio_max_uyu
etiqueta_precio
modalidades
estado_precio
fecha_fuente
fuente
fuente_url
confianza
incluir_en_filtro
advertencia

Ejemplo:

Residencial: La Estancia Hotel Residencial
Etiqueta: $85.000–$135.000 por mes
Modalidades: Habitación compartida / Habitación individual
Estado: current_dated
Fecha: mayo de 2026
Confianza: alta
Incluir en filtro: sí

La tarjeta utilizará la vista resumen.

La ficha detallada podrá consultar los registros individuales de elepem_precios.

4. Importador

Crear:

scripts/import-elepem-prices.mjs

Debe funcionar primero en modo simulación:

node scripts/import-elepem-prices.mjs --dry-run

La aplicación real de datos solamente debe ocurrir mediante:

node scripts/import-elepem-prices.mjs --apply

El importador debe:

Leer los CSV.
Buscar cada residencial mediante su arandu_id o código estable.
Confirmar que los 21 residenciales existan en public.elepem.
Importar exactamente 26 evidencias conciliadas.
Mantener separados los cinco registros pendientes.
Rechazar promociones.
Rechazar filas sin fuente.
Rechazar IDs inexistentes.
No duplicar un record_id ya cargado.
Generar un reporte de lo que agregaría, actualizaría, omitiría o rechazaría.

El modo --dry-run no debe realizar ninguna escritura en Supabase.

5. Cambios en los tipos de la aplicación

Modificar:

app/components/map-types.ts

Agregar un tipo equivalente a:

type FacilityPrice = {
  minUyu?: number;
  maxUyu?: number;
  displayLabel: string;
  kind:
    | "exact"
    | "range"
    | "from"
    | "up_to"
    | "range_by_modality";
  status:
    | "current_dated"
    | "current_undated"
    | "historical";
  modalities: string[];
  sourceLabel?: string;
  sourceUrl?: string;
  sourceDateText?: string;
  confidence: "high" | "medium" | "low";
  includeInMainFilter: boolean;
  warning: string;
};

Y dentro de cada Facility:

price?: FacilityPrice;

Mantener temporalmente los campos antiguos para no romper componentes que todavía dependan de monthlyPriceUyu.

No eliminar compatibilidad en el mismo cambio.

6. Capa de datos

Revisar principalmente:

lib/elepem-data-source.mjs
lib/facility-registry.ts
app/api/residenciales/route.ts

La capa de datos debe consultar:

public.elepem_precio_resumen

y devolver el precio dentro del objeto del residencial.

La lógica para decidir cómo se escribe el precio no debe quedar duplicada en cada tarjeta. El componente debe recibir una etiqueta ya preparada:

facility.price.displayLabel
7. Presentación en la tarjeta y ficha
Precio actual con fecha
$85.000–$135.000 por mes


Habitación compartida desde $85.000
Habitación individual $135.000


Precio público · mayo de 2026
Confirmar disponibilidad y condiciones
Precio visible, pero sin fecha clara
Desde $55.000 por mes


Precio público sin fecha visible
Puede estar desactualizado · confirmar
Precio histórico
Referencia histórica: $40.000 por mes
Publicado en 2019


No es una tarifa vigente

No utilizar para este caso el título:

Precio mensual

porque podría hacer creer que sigue vigente.

Residencial sin información de precio
Sin precio público disponible
Consultar directamente con el establecimiento
8. Filtros por precio

Modificar la lógica de filtros, probablemente en:

app/hooks/useFacilityFilters.ts

Bandas sugeridas:

Hasta $50.000
$50.000–$80.000
$80.000–$120.000
$120.000–$160.000
Más de $160.000
Sin precio público

Solo deben entrar al filtro los registros con:

include_in_main_price_filter = true

Eso corresponde a los 10 residenciales con precio actual, reciente o visible.

Los 11 precios históricos tendrán:

include_in_main_price_filter = false

Los históricos se mostrarán en la ficha, pero nunca deben hacer que un residencial aparezca en una búsqueda como si actualmente costara ese monto.

Cuando un precio es un rango, debe considerarse su mínimo y máximo sin convertirlo en promedio.

9. Fuente y trazabilidad

Cada precio público debe mostrar o permitir consultar:

Fuente
URL
Fecha o año
Moneda original
Conversión a UYU, cuando corresponda
Fecha de conversión
Nivel de confianza
Advertencia

Cuando el valor original no sea en pesos uruguayos:

conservar el importe original;
conservar la moneda original;
guardar el tipo de cambio utilizado;
guardar la fecha de conversión;
mostrar en la aplicación el valor normalizado en UYU;
permitir ver que se trata de una conversión.

No borrar el dato original después de convertirlo.

10. Pruebas y validaciones obligatorias

El proceso debe detenerse si no obtiene exactamente:

21 residenciales conciliados
10 con precio actual, reciente o visible
11 con precio únicamente histórico
26 registros de evidencia conciliados
5 registros pendientes separados
0 promociones publicadas como precios
0 IDs de Arandú inexistentes

También debe comprobar:

que todos los precios tengan una fuente;
que todos los rangos sigan siendo rangos;
que no se generen promedios automáticos;
que los históricos no entren al filtro;
que los cinco casos no conciliados no se publiquen;
que un residencial pueda funcionar sin precio;
que el mapa siga funcionando si falla la consulta de precios;
que ninguna URL privada o interna de Supabase llegue al navegador;
que el importador sea idempotente;
que las tarjetas funcionen correctamente en móvil;
que no se rompan los filtros y tarjetas existentes.

Agregar pruebas automáticas para el importador, la vista resumen y la lógica de filtros.

11. Orden de trabajo

En la rama nueva, separar los cambios en commits claros:

1. data: agregar base revisable de precios públicos
2. db: crear tabla y vista de precios ELEPEM
3. scripts: agregar importador con dry-run
4. types: incorporar rangos y estados de precio
5. data-source: conectar precios con el registro público
6. ui: mostrar precios actuales e históricos
7. filters: agregar bandas de precio
8. tests: validar conteos y exclusiones
9. docs: documentar metodología y actualización
12. Flujo de despliegue

Seguir este orden:

1. Crear cecilia/vcr1-02-precios-publicos desde cecilia/vcr1-01-globales
2. Agregar archivos de datos
3. Crear migración sin ejecutarla en producción
4. Crear importador
5. Ejecutar el importador en dry-run
6. Implementar tipos, capa de datos, tarjetas y filtros
7. Ejecutar pruebas
8. Abrir draft PR hacia cecilia/vcr1-01-globales
9. Revisar la vista previa de Vercel
10. Ejecutar migración e importación en staging
11. Revisar manualmente las 21 fichas
12. Corregir inconsistencias
13. Aplicar a producción únicamente después de aprobación
14. Fusionar la rama de precios en cecilia/vcr1-01-globales
15. Fusionar VCR1 completa en main más adelante
13. Lo que no hay que hacer

No:

trabajar directamente sobre main;
ejecutar la migración en producción al crearla;
guardar rangos como un precio promedio;
presentar precios históricos como vigentes;
cargar promociones como tarifas;
publicar los cinco casos pendientes;
eliminar la moneda o fuente original;
incorporar el Excel como fuente directa de producción;
reemplazar inmediatamente todos los campos antiguos;
fusionar la rama de precios directamente a main.
Criterio final de aceptación

La tarea estará terminada cuando:

21 residenciales tengan información de precio correctamente vinculada;
10 muestren precio público actual o visible;
11 muestren solamente una referencia histórica;
los históricos no intervengan en los filtros;
las 26 evidencias puedan auditarse;
cada precio conserve fuente y fecha;
los cinco pendientes sigan fuera de la publicación;
no se haya publicado ninguna promoción;
la aplicación continúe funcionando normalmente para todos los residenciales que no tienen precio.

La cifra que Enzo debe recordar es: 21 residenciales con información de precio, pero solamente 10 con precio utilizable como actual.