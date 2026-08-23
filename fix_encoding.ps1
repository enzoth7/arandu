
$content = Get-Content -Path "app/components/institutional/FacilityChangeForm.tsx" -Encoding UTF8

$replacements = @{
    "pblica" = "pública"
    "Direccin textual" = "Dirección textual"
    "Telfono" = "Teléfono"
    "Descripcin" = "Descripción"
    "Fotografas" = "Fotografías"
    "autorizacin" = "autorización"
    "Por qu ests haciendo los cambios?" = "¿Por qué estás haciendo los cambios?"
    "Qu documentos respaldan estos cambios?" = "¿Qué documentos respaldan estos cambios?"
    "Enviando" = "Enviando…"
    "revisin" = "revisión"
    "imgenes" = "imágenes"
    "pgblica" = "pública"
    "Direccin" = "Dirección"
    "Tel?fonos (uno por lnea)" = "Teléfonos (uno por línea)"
    "Correos (uno por lnea)" = "Correos (uno por línea)"
    "Por qu? estos" = "¿Por qué estás"
    "Qu? documentos" = "¿Qué documentos"
    "Enviando?" = "Enviando…"
}

foreach ($key in $replacements.Keys) {
    $content = $content -replace [regex]::Escape($key), $replacements[$key]
}

Set-Content -Path "app/components/institutional/FacilityChangeForm.tsx" -Value $content -Encoding UTF8

