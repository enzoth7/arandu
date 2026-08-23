
const fs = require("fs");
let content = fs.readFileSync("app/components/institutional/FacilityChangeForm.tsx", "utf-8");

// Fix lines manually based on their exact current corruptions
content = content.replace("Direccin textual", "Dirección textual");
content = content.replace("Telfono", "Teléfono");
content = content.replace("Descripcin", "Descripción");
content = content.replace("Fotografas", "Fotografías"); // H2
content = content.replace("fotografas anteriores", "fotografías anteriores"); // Checkbox 1
content = content.replace("autorizacin y derechos para publicar estas fotografas", "autorización y derechos para publicar estas fotografías"); // Checkbox 2
content = content.replace("pblica", "pública"); // URL pública
content = content.replace("pblica", "pública"); // URL pública fallback
content = content.replace("Por qu ests haciendo los cambios?", "¿Por qué estás haciendo los cambios?");
content = content.replace("Qu documentos respaldan estos cambios?", "¿Qué documentos respaldan estos cambios?");
content = content.replace("Enviando??", "Enviando…");
content = content.replace("Enviando", "Enviando…");
content = content.replace("revisin", "revisión");
content = content.replace("pblica", "pública"); // ficha pública

// Fix also the message at the top
content = content.replace("imogenes", "imágenes");

fs.writeFileSync("app/components/institutional/FacilityChangeForm.tsx", content);

