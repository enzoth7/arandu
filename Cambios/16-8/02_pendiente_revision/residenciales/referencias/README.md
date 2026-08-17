\# ARANDÃš â€” paquete completo de datos e investigaciÃ³n



\*\*Fecha de armado:\*\* 2026-08-16



Este paquete reÃºne todos los archivos generados en la conversaciÃ³n para:



\- Colonia

\- Canelones

\- Montevideo



\## QuÃ© contiene



1\. \*\*ImportaciÃ³n staging\*\*

&#x20;  - `arandu\_candidatos\_nuevos\_staging\_85.csv/json`

&#x20;  - `arandu\_correcciones\_staging\_143.csv/json`

&#x20;  - resumen nacional en Excel

2\. \*\*Archivos canÃ³nicos por departamento\*\*

3\. \*\*Todos los archivos originales generados\*\*, incluidos lotes, libros Excel, CSV, JSON, ZIP y vistas previas.

4\. \*\*Pendientes de Montevideo\*\*

&#x20;  - Inema Residencial

&#x20;  - UniÃ³n

&#x20;  - San Antonio



\## Conteos



\- Colonia: 63 candidatos nuevos brutos

\- Canelones: 20 candidatos nuevos brutos

\- Montevideo: 2 posibles ramas nuevas TeaGarden

\- Total: 85 candidatos nuevos brutos

\- Correcciones consolidadas: 143

\- Registros listos para integraciÃ³n directa en producciÃ³n: 0



\## CÃ³mo usarlo



\### Para revisiÃ³n tÃ©cnica o staging



Usar la carpeta `01\_IMPORTACION\_STAGING`.



Los archivos ya tienen claves Ãºnicas, departamento, domicilio, fuentes, estado de revisiÃ³n,

bloqueos y acciones recomendadas.



\### Para subir al mapa en producciÃ³n



\*\*No importar automÃ¡ticamente los 85 candidatos como puntos pÃºblicos.\*\*



Todos conservan:



\- `public\_eligible = false`

\- `ready\_for\_direct\_integration = false`

\- `apply\_now = false`

\- `contact\_attempted = false`



Antes de publicaciÃ³n hay que:



1\. resolver duplicados, aliases, sucursales y rebrandings;

2\. confirmar funcionamiento actual;

3\. obtener coordenadas exactas;

4\. comprobar quÃ© estatus administrativo puede mostrarse;

5\. revisar los casos cerrados, histÃ³ricos o sin direcciÃ³n.



\## Estado departamental



\### Colonia



Paquete consolidado de 63 candidatos. Incluye prioridades, histÃ³ricos, identidades a resolver,

un cierre documentado y correcciones sobre fichas existentes.



\### Canelones



Maestro de 89 registros: 69 casos auditados y 20 candidatos nuevos. De los 20 nuevos,

16 son sitios provisionalmente diferenciados y 4 tienen condiciÃ³n de sede sin resolver.



\### Montevideo



La lÃ­nea de base contiene 82 casos. Hay 79 auditados en los lotes incluidos y 3 pendientes.

Durante la auditorÃ­a aparecieron 2 ramas TeaGarden que no tienen coincidencia exacta en ArandÃº,

pero aÃºn requieren fuente independiente y geocÃ³digo.



\## Seguridad



Este paquete no realizÃ³ cambios en GitHub, Supabase, Vercel ni la aplicaciÃ³n.

