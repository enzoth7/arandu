# ArandÃº â€” base final de precios para revisar e incorporar

**Corte de investigaciÃ³n:** 2026-08-14  
**Promociones incluidas:** No  
**Contacto directo realizado:** No  
**Cambios en GitHub, Vercel o Supabase:** Ninguno

## Conteos

- 21 residenciales de ArandÃº con alguna tarifa pÃºblica.
- 10 con tarifa actual, reciente o todavÃ­a visible.
- 11 con tarifa Ãºnicamente histÃ³rica.
- 26 registros de precios conciliados.
- 5 precios pÃºblicos pendientes de conciliaciÃ³n.
- 0 promociones incluidas.

## Archivo principal

`arandu_precios_final_para_app.csv` tiene una fila por residencial y es el archivo recomendado
para preparar la integraciÃ³n.

Las filas histÃ³ricas tienen:

- `include_in_main_price_filter = false`
- `display_mode = historical_reference`

Por tanto, no deberÃ­an alimentar el filtro principal de precios sin una decisiÃ³n
explÃ­cita.

## Moneda

La moneda de visualizaciÃ³n es UYU.

- Los valores en UYU se conservan sin conversiÃ³n.
- Los valores `UYU_INFERRED` se conservan, pero tienen confianza menor.
- Los valores en USD se convierten con la cotizaciÃ³n BCU del 2026-07-28:
  USD 1 = UYU 40.214.
- Los precios histÃ³ricos no se actualizaron por IPC.

## Excel

`arandu_precios_final_para_app.xlsx` incluye:

- Resumen
- Para_importar
- Evidencia_26
- Pendientes_5
- Parametros
- Metodologia

La columna `review_status` permite marcar:

- pending
- approved
- rejected
- needs_research

## SQL

`arandu_precios_final_staging.sql` crea solo tablas en `staging_arandu`. No modifica tablas
canÃ³nicas de ArandÃº.

## Advertencia recomendada

> Precio mensual orientativo obtenido de fuentes pÃºblicas. Puede estar
> desactualizado y variar segÃºn habitaciÃ³n, autonomÃ­a, dependencia, servicios,
> insumos y disponibilidad. No constituye una cotizaciÃ³n.