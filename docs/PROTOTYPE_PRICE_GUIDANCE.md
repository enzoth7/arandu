# Orientación de precios del prototipo

## Propósito

La ruta pública `/precios` ofrece una referencia económica para las 1.019 fichas no demostrativas del padrón Arandú. No intenta presentar una cotización exacta de cada ELEPEM.

## Regla de comunicación

Todas las fichas muestran esta advertencia:

> Estimación orientativa del prototipo. No constituye una cotización ni confirma disponibilidad. Puede variar según habitación, autonomía, dependencia, servicios e insumos.

Los precios públicos, los antecedentes y las estimaciones nunca se mezclan bajo una misma etiqueta.

## Tipos de orientación

- `public_recent`: existe un precio público fechado; el rango reproduce la evidencia encontrada.
- `public_undated_context`: existe una cifra pública sin fecha, pero el rango visible sigue siendo territorial para no tratarla como tarifa vigente.
- `historical_context`: existe un antecedente antiguo, conservado como contexto, sin actualización automática.
- `territorial_capacity`: banda territorial con un ajuste pequeño por capacidad informada.
- `territorial_reference`: banda territorial amplia cuando no hay precio público ni capacidad informada.

## Metodología v1

Versión: `prototype_v1_2026_08`.

- Todos los rangos están expresados en pesos uruguayos y redondeados a UYU 5.000.
- La situación administrativa —habilitación MSP o certificado MIDES— no modifica el precio.
- Los ajustes por capacidad son deliberadamente pequeños: +UYU 5.000 hasta 12 plazas, -UYU 5.000 entre 50 y 79 plazas y -UYU 10.000 desde 80 plazas.
- Los rangos territoriales son amplios para reflejar la incertidumbre y no aparentar precisión inexistente.
- Los valores ficticios que antes ocupaban `demo_monthly_price_uyu` en fichas no demostrativas fueron retirados y conservados únicamente en `migration_payload` para auditoría.

## Cobertura inicial

Al 14 de agosto de 2026:

- 1.019 fichas con orientación.
- 4 establecimientos con precio público fechado.
- 6 con referencia pública sin fecha.
- 11 con antecedente histórico.
- 313 con estimación territorial y ajuste por capacidad.
- 685 con referencia territorial amplia.

## Fuentes de referencia

La metodología conserva las URL de cada precio localizado. Las referencias generales iniciales incluyen:

- https://www.redresidenciales.uy/1045/cual-es-el-precio-mensual-de-residenciales-en-montevideo/
- https://somosuruguay.com.uy/sociedad/la-estancia-hotel-residencial-una-propuesta-busca-transformar-forma-cuidar-adultos-mayores-n2843/amp
- https://app.vitalencecare.com/VitalenceJavaEnvironment/servlet/com.vitalence.buscarcuartos
- https://infonegocios.biz/enfoque/costo-de-residencias-para-adultos-puede-alcanzar-los-240-000-pesos-mensuales-mujeres-constituyen-el-70

## Actualización

La función interna `elepem_core.refresh_prototype_price_guidance()` recalcula las 1.019 bandas a partir del padrón vigente, las observaciones de precio y la capacidad disponible. No se expone a los roles `anon` ni `authenticated`.
