# Plan de implementación — Agente de WhatsApp de Arandú

**Estado:** sandbox técnico, inactivo y limitado a datos ficticios  
**Fecha de referencia:** 2026-08-04  
**Canal:** Chatwoot → n8n → API privada de Arandú → Supabase

## 1. Propósito y límites

El agente recibe comunicaciones ficticias sobre residenciales o ELEPEM, conduce una entrevista breve y crea un expediente privado para revisión humana. No determina responsabilidades, no confirma habilitaciones, no publica información y no deriva automáticamente a organismos.

Esta versión no está autorizada para datos reales. El saludo, el prompt, el contrato API y el registro de consentimiento usan la marca `whatsapp_sandbox`. Si una persona solicita anonimato, el agente no continúa por WhatsApp: explica que el canal revela el número y deriva a `/personas/denuncia`.

Antes de habilitar producción deben modificarse expresamente las reglas actuales del repositorio, completarse una revisión jurídica de la Ley 18.331, definir responsables humanos y retención, incorporar análisis antimalware y desplegar infraestructura estable con TLS.

## 2. Arquitectura

```text
Meta WhatsApp (número de prueba)
  → Chatwoot (bandeja y toma humana)
  → webhook firmado de Chatwoot
  → n8n (workflow inactivo de sandbox)
      → Redis (cola, debounce y consentimiento efímero, TTL 24 h)
      → PostgreSQL de Supabase (memoria conversacional temporal, TTL 24 h)
      → OpenAI (solo texto ficticio; nunca binarios ni URLs de evidencia)
      → API HMAC de Arandú
          → intake_reports
          → intake_channel_links
          → intake_ingestion_requests
          → bucket privado intake-evidence
  → código AM-... por Chatwoot
```

El workflow original de Automotora no se modifica. El nuevo export está en `n8n/workflows/arandu-whatsapp-sandbox.json`, no contiene credenciales y se mantiene `active: false`.

## 3. Secuencia conversacional

1. Presentarse como asistente virtual y advertir que es un sandbox con datos ficticios.
2. Preguntar si existe peligro inmediato. Ante respuesta afirmativa, indicar 911, Bomberos o emergencia médica, pausar el bot y solicitar intervención humana.
3. Ofrecer `Confidencial`, `Con identidad registrada` o `Anónima`.
4. Para anonimato, enviar el enlace web y cerrar el flujo de WhatsApp sin crear expediente.
5. Para las otras modalidades, registrar aceptación de la versión `whatsapp-sandbox-v2` mediante la frase exacta `ACEPTO CONFIDENCIAL` o `ACEPTO IDENTIFICADA`. n8n fija el timestamp y lo conserva en Redis durante 24 horas; el modelo no lo inventa.
6. Recoger preocupación, relato, nombre y ubicación del residencial, relación con los hechos, contacto seguro y preferencia de no contacto inicial.
7. Mostrar resumen neutral. Crear el expediente únicamente cuando el mensaje actual sea exactamente `CONFIRMO` o `CONFIRMO EL EXPEDIENTE FICTICIO`. La API exige además que esa confirmación tenga menos de cinco minutos y sea posterior al consentimiento.
8. Transferir hasta cinco adjuntos. Los binarios se validan y almacenan sin visión, OCR ni transcripción.
9. Enviar el código de seguimiento y pasar la conversación a estado resuelto o humano según corresponda.

## 4. Contrato de ingreso n8n

`POST /api/integrations/n8n/intake-reports`

Cabeceras obligatorias:

```text
X-Alerta-Timestamp: milisegundos Unix
X-Alerta-Nonce: valor aleatorio de 16 a 128 caracteres
X-Alerta-Idempotency-Key: identificador estable de la entrega
X-Alerta-Signature: sha256=<HMAC hexadecimal>
```

La entrada firmada es:

```text
{timestamp}.{nonce}.{idempotencyKey}.{rawBody}
```

La firma usa `N8N_INTAKE_HMAC_SECRET`, con un mínimo de 32 caracteres. Se rechazan firmas con más de cinco minutos, claves repetidas con contenido distinto y solicitudes superiores a 32 KiB.

Payload resumido:

```json
{
  "source": "whatsapp_sandbox",
  "isSandbox": true,
  "externalEventId": "delivery-id",
  "chatwoot": {
    "accountId": "1",
    "inboxId": "2",
    "conversationId": "3",
    "contactId": "4",
    "phone": "099000000",
    "messageIds": ["100", "101"]
  },
  "consent": {
    "mode": "Confidencial",
    "noticeVersion": "whatsapp-sandbox-v2",
    "acceptedAt": "2026-08-04T15:00:00.000Z"
  },
  "confirmation": {
    "method": "explicit_phrase",
    "phraseVersion": "whatsapp-sandbox-v2",
    "confirmedAt": "2026-08-04T15:05:00.000Z"
  },
  "report": {
    "setting": "En un residencial / ELEPEM",
    "reporter": "Familiar o referente",
    "reporterName": "Nombre ficticio solo en modo identificado",
    "privacy": "Confidencial",
    "location": { "department": "Montevideo", "reference": "Dirección ficticia" },
    "concerns": ["Riesgo o irregularidad en un residencial"],
    "narrative": "Relato ficticio"
  }
}
```

Respuesta nueva: `201 { caseCode, uploadToken, duplicate: false }`. Un reintento idéntico devuelve `200` y el mismo código. El token de adjuntos no debe escribirse en Chatwoot ni en logs.

## 5. Evidencia

La ruta existente `/api/intake-reports/{caseCode}/attachments` conserva el límite de cinco archivos de 10 MB y ahora:

- compara el token contra el expediente también en el fallback;
- valida que el MIME esté permitido y que los bytes tengan una firma compatible;
- calcula SHA-256;
- registra canal y message ID de origen;
- devuelve y almacena con caché privada/no-store;
- nunca entrega binarios al agente ni a OpenAI.

Audio, fotos y documentos se consideran evidencia sin analizar. Si llega un audio, el agente pide además un resumen escrito para poder continuar.

## 6. Retención y toma humana

`POST /api/integrations/n8n/intake-retention` usa la misma firma HMAC y admite:

- `list_due`: devuelve únicamente IDs técnicos vencidos a siete días;
- `mark_deleted` / `mark_error`: registra el resultado de eliminación en Chatwoot;
- `purge_sandbox`: elimina expedientes ficticios vencidos a treinta días y sus objetos privados.

El workflow de limpieza elimina cada mensaje mediante la API de Chatwoot, que también elimina sus adjuntos. Redis vence a las 24 horas. La tabla `alerta_mayor_whatsapp_sandbox_memory` conserva el historial conversacional y los snapshots estructurados solo por 24 horas; la misma ejecución diaria elimina las filas vencidas. Esta memoria no reemplaza el expediente final. n8n no debe guardar ejecuciones exitosas ni binarias; los errores deben registrar códigos, nunca relatos.

El nombre elegido para una comunicación identificada queda en `intake_channel_links.reporter_display_name`, separado del relato. En modo confidencial permanece nulo. El teléfono no se copia al relato: solo se conserva un hash con pepper y los identificadores técnicos de Chatwoot durante el sandbox.

La toma humana se activa por pedido explícito, emergencia, amenazas, angustia, ambigüedad crítica o fallas repetidas. Al activarse, el bot marca la conversación y deja de responder hasta una reactivación manual.

## 7. Variables y credenciales

```dotenv
N8N_INTAKE_HMAC_SECRET=
INTAKE_PHONE_HASH_PEPPER=
SUPABASE_SERVICE_ROLE_KEY=
ARANDU_BASE_URL=http://host.docker.internal:3000
CHATWOOT_BASE_URL=http://host.docker.internal:3201
CHATWOOT_WEBHOOK_SECRET=
CHATWOOT_API_ACCESS_TOKEN=
```

En n8n se configuran por separado credenciales de Redis, PostgreSQL de Supabase y OpenAI. La credencial PostgreSQL usa el host, puerto, base, usuario y contraseña del proyecto sandbox y TLS; no se incrusta en el JSON. El export usa variables de entorno para firmar HMAC y operar Chatwoot; si la instancia bloquea `$env` dentro de nodos, esos valores deben trasladarse a credenciales n8n antes de probar. No deben copiarse IDs ni tokens del workflow Automotora. Los tokens previamente incrustados allí deben rotarse antes de conectar cualquier servicio.

## 8. Operación y salida a producción

El sandbox se prueba con números y archivos ficticios. No se publica el webhook de producción ni se activa el workflow. La promoción requiere una aprobación registrada que confirme: política de datos, responsables, horario/SLA, antimalware, backups, ejercicio de derechos, respuesta a incidentes, retención real y contratos con proveedores.

Fuentes operativas fechadas:

- Inmayores: https://www.gub.uy/tramites/servicio-atencion-personas-mayores-situacion-abuso-yo-maltrato
- MSP/ELEPEM: https://www.gub.uy/ministerio-salud-publica/servicios-salud/elepem
- Chatwoot webhooks: https://developers.chatwoot.com/api-reference/webhooks/add-a-webhook
- OpenAI GPT-5.6: https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6-terra

## 9. Criterios de aceptación

- El original de Automotora permanece intacto.
- No hay secretos en el export, documentación, pruebas o Git.
- Anonimato deriva a web y no crea expediente por WhatsApp.
- Solo se aceptan ELEPEM, sandbox y privacidad confidencial/identificada.
- Emergencia y consentimiento no dependen solo del prompt.
- Reintentos no duplican expedientes.
- Adjuntos inválidos o suplantados se rechazan.
- Ningún dato se publica ni deriva automáticamente.
- Pasan `npm run test:intake`, lint y build.

## 10. Matriz de prueba antes de activar

Las pruebas automáticas cubren normalización web/WhatsApp, rechazo de anonimato y ámbitos ajenos a ELEPEM, HMAC vencido o inválido, formatos de código/token, MIME suplantado, ausencia de secretos, grafo inactivo y presencia de guardas externas. La prueba de integración real queda bloqueada deliberadamente hasta disponer de una base Supabase confirmada como sandbox y credenciales rotadas.

Antes de activar deben ejecutarse con datos ficticios: apertura transparente; ramas confidencial e identificada; emergencia al inicio, durante y al final; adjunto previo al consentimiento; foto, audio y múltiples archivos; archivo mayor a 10 MB; MIME falso; alegación de falta de habilitación; pedido humano y pausa; prompt injection; entregas Chatwoot repetidas o fuera de orden; reintento idempotente; fallo parcial y recuperación de evidencia; código de seguimiento; borrado a siete y treinta días. Cada ejecución debe comprobar también que no existan relatos, binarios ni tokens en el modelo o los logs.

## 11. Resultado de auditorías locales

- `npm ci`, `npm run test:intake` y `npm run build` completan correctamente.
- ESLint finaliza sin errores y conserva 23 advertencias preexistentes fuera de esta entrega.
- `npm audit --omit=dev` informa tres vulnerabilidades altas transitivas en PostCSS/Sharp a través de Next 15. La corrección propuesta fuerza Next 16; no se aplicó una actualización mayor automática.
- `n8n audit` detecta credenciales sin uso, nodos Code/HTTP considerados riesgosos y consultas SQL sin parámetros en workflows preexistentes de la instancia. También informa API pública, paquetes comunitarios y telemetría habilitados. No se modificaron esos workflows ni credenciales.
- n8n advierte que `binaryData` cambiará a `storage` en v3; la migración del volumen debe planificarse antes de esa actualización.
