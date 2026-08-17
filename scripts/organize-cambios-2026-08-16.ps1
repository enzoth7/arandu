[CmdletBinding()]
param(
    [int]$SupabaseElepemCount = 1038,
    [int]$SupabaseUnlocatedCount = 99,
    [int]$SupabasePricedCount = 21,
    [int]$SupabasePublishedPhotoLinks = 147,
    [string]$SupabaseSchemaFingerprint = '0380558b65e60bcd4812dbf4caf12175',
    [string]$SupabaseCapturedAt = '2026-08-16T21:54:33.861178Z'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$changesRoot = Join-Path $repoRoot 'Cambios'
$masterRoot = Join-Path $repoRoot 'Base de Datos'
$auditRoot = Join-Path $repoRoot 'data\discovery\organizacion_cambios_2026-08-16'
$archiveRoot = Join-Path $repoRoot 'data\discovery\archivo_importado\2026-08-16'
$mergeRoot = Join-Path $changesRoot '01_para_combinar\descripciones_y_fuentes'
$imagesReviewRoot = Join-Path $changesRoot '02_pendiente_revision\imagenes_derechos'
$residentialReviewRoot = Join-Path $changesRoot '02_pendiente_revision\residenciales'
$correctionsReviewRoot = Join-Path $changesRoot '02_pendiente_revision\correcciones'
$priceReviewRoot = Join-Path $changesRoot '02_pendiente_revision\precios_no_conciliados'

function Assert-UnderRoot {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Root)
    $fullPath = [IO.Path]::GetFullPath($Path)
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
    if (-not $fullPath.StartsWith($fullRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta fuera del alcance permitido: $fullPath (raíz: $fullRoot)"
    }
}

function Write-Utf8NoBom {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][AllowEmptyString()][string]$Content)
    $parent = Split-Path -Parent $Path
    if ($parent) { [IO.Directory]::CreateDirectory($parent) | Out-Null }
    [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

function Write-JsonFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Value)
    Write-Utf8NoBom -Path $Path -Content ($Value | ConvertTo-Json -Depth 64)
}

function Write-CsvFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][object[]]$Rows)
    $csv = $Rows | ConvertTo-Csv -NoTypeInformation
    Write-Utf8NoBom -Path $Path -Content (($csv -join "`r`n") + "`r`n")
}

function Get-FileSha256 {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-StreamSha256 {
    param([Parameter(Mandatory)][IO.Stream]$Stream)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash($Stream))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function Get-RelativePath {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Base)
    $baseFull = [IO.Path]::GetFullPath($Base).TrimEnd('\') + '\'
    $pathFull = [IO.Path]::GetFullPath($Path)
    if (-not $pathFull.StartsWith($baseFull, [StringComparison]::OrdinalIgnoreCase)) {
        throw "No se puede relativizar $pathFull contra $baseFull"
    }
    return $pathFull.Substring($baseFull.Length).Replace('\', '/')
}

function Get-TreeFingerprint {
    param([Parameter(Mandatory)][string]$Path)
    $files = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force | Sort-Object FullName)
    $lines = foreach ($file in $files) {
        $relative = Get-RelativePath -Path $file.FullName -Base $Path
        "$relative|$($file.Length)|$($file.LastWriteTimeUtc.ToString('O'))"
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
    $stream = [IO.MemoryStream]::new($bytes)
    try { $hash = Get-StreamSha256 -Stream $stream } finally { $stream.Dispose() }
    [pscustomobject]@{
        file_count = $files.Count
        total_bytes = [int64](($files | Measure-Object Length -Sum).Sum)
        metadata_sha256 = $hash
    }
}

function Get-MojibakeScore {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { return 0 }
    $score = 0
    $tokens = @(
        [char]0x00C3, [char]0x00C2, [char]0x00E2, [char]0x00F0, [char]0xFFFD,
        [char]0x0192, [char]0x00C5, [char]0x201A, [char]0x20AC, [char]0x2122
    )
    foreach ($token in $tokens) {
        $score += ([regex]::Matches($Value, [regex]::Escape($token))).Count
    }
    return $score
}

function Repair-MojibakeString {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { return $null }
    $current = $Value
    $windows1252 = [Text.Encoding]::GetEncoding(1252)
    $utf8Strict = [Text.UTF8Encoding]::new($false, $true)
    for ($attempt = 0; $attempt -lt 3; $attempt++) {
        $currentScore = Get-MojibakeScore -Value $current
        if ($currentScore -eq 0) { break }
        try {
            $candidate = $utf8Strict.GetString($windows1252.GetBytes($current))
        }
        catch {
            break
        }
        if ((Get-MojibakeScore -Value $candidate) -ge $currentScore) { break }
        $current = $candidate
    }
    return $current
}

function Repair-ObjectStrings {
    param($Value)
    if ($null -eq $Value) { return $null }
    if ($Value -is [string]) { return Repair-MojibakeString -Value $Value }
    if ($Value -is [System.Collections.IList]) {
        $items = foreach ($item in $Value) { Repair-ObjectStrings -Value $item }
        return @($items)
    }
    if ($Value -is [pscustomobject]) {
        $copy = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $copy[$property.Name] = Repair-ObjectStrings -Value $property.Value
        }
        return [pscustomobject]$copy
    }
    return $Value
}

function ConvertTo-FlatRow {
    param([Parameter(Mandatory)][pscustomobject]$Value)
    $flat = [ordered]@{}
    foreach ($property in $Value.PSObject.Properties) {
        $item = $property.Value
        if ($null -eq $item) {
            $flat[$property.Name] = ''
        }
        elseif ($item -is [System.Collections.IList] -and $item -isnot [string]) {
            $flat[$property.Name] = (($item | ForEach-Object {
                if ($_ -is [pscustomobject]) { $_ | ConvertTo-Json -Compress -Depth 16 } else { "$_" }
            }) -join ' | ')
        }
        elseif ($item -is [pscustomobject]) {
            $flat[$property.Name] = $item | ConvertTo-Json -Compress -Depth 16
        }
        else {
            $flat[$property.Name] = $item
        }
    }
    return [pscustomobject]$flat
}

function Move-SafeFile {
    param([Parameter(Mandatory)][string]$Source, [Parameter(Mandatory)][string]$Destination)
    Assert-UnderRoot -Path $Source -Root $repoRoot
    Assert-UnderRoot -Path $Destination -Root $repoRoot
    if ([IO.Path]::GetFullPath($Source).StartsWith(([IO.Path]::GetFullPath($masterRoot).TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)) {
        throw "Se intentó mover un archivo dentro del árbol inmutable Base de Datos: $Source"
    }
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Falta archivo de origen: $Source" }
    if (Test-Path -LiteralPath $Destination) { throw "El destino ya existe: $Destination" }
    [IO.Directory]::CreateDirectory((Split-Path -Parent $Destination)) | Out-Null
    Move-Item -LiteralPath $Source -Destination $Destination
}

function Remove-SafeFile {
    param([Parameter(Mandatory)][string]$Path)
    Assert-UnderRoot -Path $Path -Root $changesRoot
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "No existe el descarte esperado: $Path" }
    Remove-Item -LiteralPath $Path -Force
}

function Add-ZipTextEntry {
    param([Parameter(Mandatory)]$Archive, [Parameter(Mandatory)][string]$EntryName, [Parameter(Mandatory)][string]$Text)
    $entry = $Archive.CreateEntry($EntryName, [IO.Compression.CompressionLevel]::Optimal)
    $stream = $entry.Open()
    try {
        $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
        try { $writer.Write($Text) } finally { $writer.Dispose() }
    }
    finally {
        $stream.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $changesRoot -PathType Container)) { throw "No existe Cambios/: $changesRoot" }
if (-not (Test-Path -LiteralPath $masterRoot -PathType Container)) { throw "No existe Base de Datos/: $masterRoot" }
if (Test-Path -LiteralPath (Join-Path $auditRoot 'result.json')) {
    throw "La organización ya fue completada y no se sobrescribirá: $auditRoot"
}

$sourcePaths = [ordered]@{
    enrichedJson = Join-Path $changesRoot 'Fotos, precios y dscripciones\residenciales-enriquecidos.json'
    enrichedZip = Join-Path $changesRoot 'Fotos, precios y dscripciones\paquete-integracion-residenciales-59.zip'
    imagesReadyJson = Join-Path $changesRoot 'Imagenes\imagenes_para_importar_staging_143.json'
    imagesWorkbook = Join-Path $changesRoot 'Imagenes\manifest_imagenes_159.xlsx'
    imagesMixedZip = Join-Path $changesRoot 'Imagenes\mascerca_imagenes_completas_159.zip'
    imagesRejectedJson = Join-Path $changesRoot 'Imagenes\NO_SUBIR_imagenes_historicas_16.json'
    pricesEvidenceCsv = Join-Path $changesRoot 'Precios residenciales\arandu_precios_evidencia_final.csv'
    pricesCsv = Join-Path $changesRoot 'Precios residenciales\arandu_precios_final_para_app.csv'
    pricesJson = Join-Path $changesRoot 'Precios residenciales\arandu_precios_final_para_app.json'
    pricesWorkbook = Join-Path $changesRoot 'Precios residenciales\arandu_precios_final_para_app.xlsx'
    pricesSql = Join-Path $changesRoot 'Precios residenciales\arandu_precios_final_staging.sql'
    pricesReadme = Join-Path $changesRoot 'Precios residenciales\README_ARANDU_PRECIOS_FINALES.md'
    candidatesCsv = Join-Path $changesRoot 'Residenciales\arandu_candidatos_nuevos_staging_85.csv'
    candidatesJson = Join-Path $changesRoot 'Residenciales\arandu_candidatos_nuevos_staging_85.json'
    correctionsCsv = Join-Path $changesRoot 'Residenciales\arandu_correcciones_staging_143.csv'
    correctionsJson = Join-Path $changesRoot 'Residenciales\arandu_correcciones_staging_143.json'
    residentialWorkbook = Join-Path $changesRoot 'Residenciales\arandu_resumen_integracion_todos_departamentos.xlsx'
    residentialReadme = Join-Path $changesRoot 'Residenciales\README.md'
    integratedPlan = Join-Path $changesRoot 'Plan integrado de cambios priorizados.md'
}

foreach ($item in $sourcePaths.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $item.Value -PathType Leaf)) { throw "Falta insumo requerido ($($item.Key)): $($item.Value)" }
    Assert-UnderRoot -Path $item.Value -Root $changesRoot
}

$originalFiles = @($sourcePaths.Values | ForEach-Object { Get-Item -LiteralPath $_ } | Sort-Object FullName)
$originalCount = $originalFiles.Count
if ($originalCount -ne $sourcePaths.Count) {
    throw "El preflight esperaba exactamente $($sourcePaths.Count) archivos conocidos y encontró $originalCount. Revisar antes de continuar."
}

$masterBefore = Get-TreeFingerprint -Path $masterRoot
$capturedLocalAt = (Get-Date).ToUniversalTime().ToString('O')

$enriched = Get-Content -LiteralPath $sourcePaths.enrichedJson -Raw -Encoding UTF8 | ConvertFrom-Json
$imagesReady = Get-Content -LiteralPath $sourcePaths.imagesReadyJson -Raw -Encoding UTF8 | ConvertFrom-Json
$imagesRejected = Get-Content -LiteralPath $sourcePaths.imagesRejectedJson -Raw -Encoding UTF8 | ConvertFrom-Json
$prices = Get-Content -LiteralPath $sourcePaths.pricesJson -Raw -Encoding UTF8 | ConvertFrom-Json
$candidatesPackage = Get-Content -LiteralPath $sourcePaths.candidatesJson -Raw -Encoding UTF8 | ConvertFrom-Json
$correctionsPackage = Get-Content -LiteralPath $sourcePaths.correctionsJson -Raw -Encoding UTF8 | ConvertFrom-Json

if (@($enriched.facilities).Count -ne 59) { throw 'El paquete enriquecido no contiene 59 establecimientos.' }
if (@($imagesReady.images).Count -ne 143) { throw 'El manifiesto importable no contiene 143 imágenes.' }
if (@($imagesRejected.images).Count -ne 16) { throw 'El manifiesto NO_SUBIR no contiene 16 imágenes.' }
if (@($prices.facilities_ready_for_review).Count -ne 21) { throw 'El paquete de precios no contiene 21 ELEPEM.' }
if (@($prices.unmatched_price_leads).Count -ne 5) { throw 'El paquete de precios no contiene 5 indicios sin conciliar.' }
if (@($candidatesPackage.candidates).Count -ne 85) { throw 'El paquete de candidatos no contiene 85 filas.' }
if (@($correctionsPackage.actions).Count -ne 143) { throw 'El paquete de correcciones no contiene 143 acciones.' }

$closedCandidates = @($candidatesPackage.candidates | Where-Object { $_.operational_status -eq 'closed_definitive' })
if ($closedCandidates.Count -ne 1) { throw "Se esperaba exactamente un candidato cerrado y se encontraron $($closedCandidates.Count)." }
$pendingCandidates = @($candidatesPackage.candidates | Where-Object { $_.operational_status -ne 'closed_definitive' })
if ($pendingCandidates.Count -ne 84) { throw "Se esperaban 84 candidatos pendientes y se encontraron $($pendingCandidates.Count)." }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$mixedArchive = [IO.Compression.ZipFile]::OpenRead($sourcePaths.imagesMixedZip)
try {
    $imageEntries = @($mixedArchive.Entries | Where-Object { $_.Length -gt 0 -and $_.FullName -like 'imagenes/*.webp' })
    if ($imageEntries.Count -ne 159) { throw "El ZIP mixto contiene $($imageEntries.Count) imágenes WebP, no 159." }
    $entryByPath = @{}
    foreach ($entry in $imageEntries) { $entryByPath[$entry.FullName.Replace('\', '/')] = $entry }
    $idToArchivePath = @{}
    foreach ($manifestName in @(
        'manifiestos_descarga/parte_1.json',
        'manifiestos_descarga/parte_2.json',
        'manifiestos_descarga/parte_3.json'
    )) {
        $manifestEntry = $mixedArchive.GetEntry($manifestName)
        if ($null -eq $manifestEntry) { throw "Falta manifiesto interno: $manifestName" }
        $manifestStream = $manifestEntry.Open()
        try {
            $manifestReader = [IO.StreamReader]::new($manifestStream, [Text.Encoding]::UTF8)
            try { $manifestJson = $manifestReader.ReadToEnd() | ConvertFrom-Json } finally { $manifestReader.Dispose() }
        }
        finally { $manifestStream.Dispose() }
        foreach ($download in @($manifestJson.downloaded)) {
            $idToArchivePath[$download.image_id] = $download.relative_path.Replace('\', '/')
        }
    }
    $deliveryEntry = $mixedArchive.GetEntry('INDICE_ENTREGA_159.json')
    if ($null -eq $deliveryEntry) { throw 'Falta INDICE_ENTREGA_159.json.' }
    $deliveryStream = $deliveryEntry.Open()
    try {
        $deliveryReader = [IO.StreamReader]::new($deliveryStream, [Text.Encoding]::UTF8)
        try { $deliveryJson = $deliveryReader.ReadToEnd() | ConvertFrom-Json } finally { $deliveryReader.Dispose() }
    }
    finally { $deliveryStream.Dispose() }
    foreach ($added in @($deliveryJson.added_images)) {
        $idToArchivePath[$added.id] = $added.path.Replace('\', '/')
    }
    if ($idToArchivePath.Count -eq 158) {
        $expectedIds = @(
            @($imagesReady.images | ForEach-Object { $_.imageId }) +
            @($imagesRejected.images | ForEach-Object { $_.image_id })
        ) | Sort-Object -Unique
        $missingIds = @($expectedIds | Where-Object { -not $idToArchivePath.ContainsKey($_) })
        $mappedPaths = @($idToArchivePath.Values)
        $unmappedEntries = @($imageEntries | Where-Object { $mappedPaths -notcontains $_.FullName.Replace('\', '/') })
        if ($missingIds.Count -eq 1 -and $unmappedEntries.Count -eq 1) {
            $idToArchivePath[$missingIds[0]] = $unmappedEntries[0].FullName.Replace('\', '/')
        }
    }
    if ($idToArchivePath.Count -ne 159) { throw "Los manifiestos internos y la reconciliación física mapean $($idToArchivePath.Count) imágenes, no 159." }

    $readyPaths = @($imagesReady.images | ForEach-Object {
        if (-not $idToArchivePath.ContainsKey($_.imageId)) { throw "No existe ruta interna para $($_.imageId)." }
        $idToArchivePath[$_.imageId]
    })
    $rejectedPaths = @($imagesRejected.images | ForEach-Object {
        if (-not $idToArchivePath.ContainsKey($_.image_id)) { throw "No existe ruta interna para $($_.image_id)." }
        $idToArchivePath[$_.image_id]
    })
    if (@($readyPaths | Sort-Object -Unique).Count -ne 143) { throw 'Los paths de imágenes conservables no son 143 únicos.' }
    if (@($rejectedPaths | Sort-Object -Unique).Count -ne 16) { throw 'Los paths de imágenes descartadas no son 16 únicos.' }
    if (@($readyPaths | Where-Object { $rejectedPaths -contains $_ }).Count -ne 0) { throw 'Hay imágenes presentes a la vez en conservar y NO_SUBIR.' }
    foreach ($path in @($readyPaths + $rejectedPaths)) {
        if (-not $entryByPath.ContainsKey($path)) { throw "El ZIP no contiene la imagen manifestada: $path" }
    }

    $rejectedImageEntries = foreach ($image in $imagesRejected.images) {
        $path = $idToArchivePath[$image.image_id]
        $entry = $entryByPath[$path]
        $stream = $entry.Open()
        try { $entryHash = Get-StreamSha256 -Stream $stream } finally { $stream.Dispose() }
        [pscustomobject]@{
            kind = 'zip_image_entry'
            source_path = "Cambios/Imagenes/mascerca_imagenes_completas_159.zip::$path"
            sha256 = $entryHash
            size_bytes = [int64]$entry.Length
            record_key = $image.image_id
            reason = Repair-MojibakeString -Value $image.do_not_upload_reason
            disposition = 'deleted_from_operational_package'
            deleted_at = $null
        }
    }

    [IO.Directory]::CreateDirectory($auditRoot) | Out-Null
    [IO.Directory]::CreateDirectory($archiveRoot) | Out-Null
    [IO.Directory]::CreateDirectory($mergeRoot) | Out-Null
    [IO.Directory]::CreateDirectory($imagesReviewRoot) | Out-Null
    [IO.Directory]::CreateDirectory($residentialReviewRoot) | Out-Null
    [IO.Directory]::CreateDirectory($correctionsReviewRoot) | Out-Null
    [IO.Directory]::CreateDirectory($priceReviewRoot) | Out-Null

    $deletionEntries = @($rejectedImageEntries)
    $deletionEntries += [pscustomobject]@{
        kind = 'sql_file'
        source_path = Get-RelativePath -Path $sourcePaths.pricesSql -Base $repoRoot
        sha256 = Get-FileSha256 -Path $sourcePaths.pricesSql
        size_bytes = [int64](Get-Item -LiteralPath $sourcePaths.pricesSql).Length
        record_key = 'arandu_precios_final_staging.sql'
        reason = 'Crea el esquema staging_arandu; incompatible con la prohibición de crear tablas o esquemas sin autorización.'
        disposition = 'deleted'
        deleted_at = $null
    }
    $deletionEntries += [pscustomobject]@{
        kind = 'candidate_record'
        source_path = Get-RelativePath -Path $sourcePaths.candidatesJson -Base $repoRoot
        sha256 = Get-FileSha256 -Path $sourcePaths.candidatesJson
        size_bytes = 0
        record_key = $closedCandidates[0].candidate_key
        reason = 'operational_status=closed_definitive; excluido de todos los derivados operativos.'
        disposition = 'excluded_from_operational_derivatives'
        deleted_at = $null
    }
    $deletionEntries += [pscustomobject]@{
        kind = 'manifest_file'
        source_path = Get-RelativePath -Path $sourcePaths.imagesRejectedJson -Base $repoRoot
        sha256 = Get-FileSha256 -Path $sourcePaths.imagesRejectedJson
        size_bytes = [int64](Get-Item -LiteralPath $sourcePaths.imagesRejectedJson).Length
        record_key = 'NO_SUBIR_imagenes_historicas_16.json'
        reason = 'Manifiesto consumido en deleted_manifest.json; se elimina junto con el contenedor mixto reemplazado.'
        disposition = 'deleted_after_manifest'
        deleted_at = $null
    }
    $deletionEntries += [pscustomobject]@{
        kind = 'mixed_container_file'
        source_path = Get-RelativePath -Path $sourcePaths.imagesMixedZip -Base $repoRoot
        sha256 = Get-FileSha256 -Path $sourcePaths.imagesMixedZip
        size_bytes = [int64](Get-Item -LiteralPath $sourcePaths.imagesMixedZip).Length
        record_key = 'mascerca_imagenes_completas_159.zip'
        reason = 'Contenedor mixto reemplazado por un ZIP limpio con las 143 imágenes conservables.'
        disposition = 'deleted_after_verified_repack'
        deleted_at = $null
    }

    $deletionManifestPath = Join-Path $auditRoot 'deleted_manifest.json'
    $deletionManifest = [ordered]@{
        version = 1
        generated_at = $capturedLocalAt
        deletion_policy = 'Solo descarte explícito autorizado por el usuario.'
        irreversible = $true
        entries = $deletionEntries
    }
    Write-JsonFile -Path $deletionManifestPath -Value $deletionManifest

    $cleanImagesZip = Join-Path $imagesReviewRoot 'imagenes_pendientes_derechos_143.zip'
    if (Test-Path -LiteralPath $cleanImagesZip -PathType Leaf) {
        [IO.File]::Delete($cleanImagesZip)
    }
    $cleanArchive = [IO.Compression.ZipFile]::Open($cleanImagesZip, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($path in $readyPaths) {
            $sourceEntry = $entryByPath[$path]
            $targetEntry = $cleanArchive.CreateEntry($path, [IO.Compression.CompressionLevel]::Optimal)
            $sourceStream = $sourceEntry.Open()
            $targetStream = $targetEntry.Open()
            try { $sourceStream.CopyTo($targetStream) } finally { $targetStream.Dispose(); $sourceStream.Dispose() }
        }
        $cleanMetadata = [ordered]@{}
        foreach ($property in $imagesReady.metadata.PSObject.Properties) { $cleanMetadata[$property.Name] = Repair-ObjectStrings -Value $property.Value }
        $cleanMetadata.unique_physical_images = 143
        $cleanMetadata.ready_for_staging = 0
        $cleanMetadata.do_not_upload = 0
        $cleanMetadata.records = 143
        $cleanMetadata.target = 'pending_rights_privacy_and_visual_deduplication'
        $cleanManifest = [ordered]@{
            metadata = $cleanMetadata
            images = Repair-ObjectStrings -Value @($imagesReady.images)
        }
        Add-ZipTextEntry -Archive $cleanArchive -EntryName 'manifest_imagenes_pendientes_143.json' -Text ($cleanManifest | ConvertTo-Json -Depth 64)
        Add-ZipTextEntry -Archive $cleanArchive -EntryName 'README.md' -Text @'
# Imágenes pendientes de derechos

Este paquete contiene 143 imágenes conservadas únicamente para revisión.

- No están autorizadas para publicación pública.
- Todas conservan `prototypeOnly=true` en el manifiesto de origen.
- Requieren verificación de derechos, privacidad y duplicación visual.
- Las 16 imágenes `NO_SUBIR` fueron excluidas y registradas por hash en `deleted_manifest.json`.
'@
    }
    finally {
        $cleanArchive.Dispose()
    }
}
finally {
    $mixedArchive.Dispose()
}

$cleanDuplicateHashCount = 0
$cleanCheck = [IO.Compression.ZipFile]::OpenRead($cleanImagesZip)
try {
    $cleanWebpEntries = @($cleanCheck.Entries | Where-Object { $_.Length -gt 0 -and $_.FullName -like 'imagenes/*.webp' })
    if ($cleanWebpEntries.Count -ne 143) { throw "El ZIP limpio contiene $($cleanWebpEntries.Count) WebP, no 143." }
    $cleanHashes = foreach ($entry in $cleanWebpEntries) {
        $stream = $entry.Open()
        try { Get-StreamSha256 -Stream $stream } finally { $stream.Dispose() }
    }
    $cleanDuplicateHashCount = $cleanHashes.Count - @($cleanHashes | Sort-Object -Unique).Count
}
finally {
    $cleanCheck.Dispose()
}

$mergeCandidates = foreach ($facility in $enriched.facilities) {
    $sources = @($facility.fuentes)
    $references = foreach ($source in $sources) {
        $urlBytes = [Text.Encoding]::UTF8.GetBytes("$($source.provider)|$($source.url)")
        $urlStream = [IO.MemoryStream]::new($urlBytes)
        try { $sourceHash = Get-StreamSha256 -Stream $urlStream } finally { $urlStream.Dispose() }
        "CAMBIOS-ENRIQ-$($sourceHash.Substring(0, 16).ToUpperInvariant())"
    }
    [pscustomobject][ordered]@{
        codigo = $facility.codigo
        target_table = 'public.elepem'
        operation = 'set_description_and_append_missing_sources'
        description_current_state = 'missing_in_live_snapshot'
        descripcion = Repair-MojibakeString -Value $facility.descripcion
        fuentes_referencias = @($references)
        fuentes_urls = @($sources | ForEach-Object { $_.url })
        fuentes_tipos = @($sources | ForEach-Object { $_.type })
        fuentes_proveedores = @($sources | ForEach-Object { Repair-MojibakeString -Value $_.provider })
        fuentes_fechas = @($sources | ForEach-Object { $null })
        fuentes_consultadas_at = @($sources | ForEach-Object { $null })
        fuentes_campos_respaldados = @($sources | ForEach-Object { 'descripcion' })
        status = 'technically_compatible_requires_final_source_date_check'
        write_authorized = $false
    }
}

$mergePayload = [ordered]@{
    version = 1
    generated_at = $capturedLocalAt
    source = 'Cambios/Fotos, precios y dscripciones/residenciales-enriquecidos.json'
    source_sha256 = Get-FileSha256 -Path $sourcePaths.enrichedJson
    target = 'public.elepem'
    schema_changes = $false
    supabase_writes_performed = $false
    snapshot = [ordered]@{
        project_id = 'itolluaivfoxnaohbsdk'
        captured_at = $SupabaseCapturedAt
        elepem = $SupabaseElepemCount
        elepem_sin_ubicacion = $SupabaseUnlocatedCount
        priced_elepem = $SupabasePricedCount
        published_photo_links = $SupabasePublishedPhotoLinks
        schema_fingerprint = $SupabaseSchemaFingerprint
        enriched_codes_matched = 59
        enriched_descriptions_currently_missing = 59
    }
    warnings = @(
        'No escribir hasta volver a deduplicar contra ambas tablas operativas.',
        'Las fechas originales y de consulta no están presentes en el paquete; se conservan como null y deben completarse solo desde evidencia real.',
        'No anexar fuentes si la URL o referencia ya existe en la fila viva.'
    )
    records = @($mergeCandidates)
}
Write-JsonFile -Path (Join-Path $auditRoot 'supabase_merge_candidates.json') -Value $mergePayload
Write-JsonFile -Path (Join-Path $mergeRoot 'supabase_merge_candidates_59.json') -Value $mergePayload

$pendingPricePayload = [ordered]@{
    version = 1
    generated_at = $capturedLocalAt
    source = 'Cambios/Precios residenciales/arandu_precios_final_para_app.json'
    source_sha256 = Get-FileSha256 -Path $sourcePaths.pricesJson
    status = 'pending_reconciliation'
    supabase_writes_performed = $false
    count = @($prices.unmatched_price_leads).Count
    records = Repair-ObjectStrings -Value @($prices.unmatched_price_leads)
}
Write-JsonFile -Path (Join-Path $priceReviewRoot 'precios_no_conciliados_5.json') -Value $pendingPricePayload
Write-CsvFile -Path (Join-Path $priceReviewRoot 'precios_no_conciliados_5.csv') -Rows @($pendingPricePayload.records | ForEach-Object { ConvertTo-FlatRow -Value $_ })

$cleanCandidateMetadata = [ordered]@{}
foreach ($property in $candidatesPackage.metadata.PSObject.Properties) { $cleanCandidateMetadata[$property.Name] = Repair-ObjectStrings -Value $property.Value }
$cleanCandidateMetadata.purpose = 'pending_review_only'
$cleanCandidateMetadata.direct_production_upload = $false
$cleanCandidateSummary = [ordered]@{
    total = 84
    by_department = [ordered]@{
        Colonia = @($pendingCandidates | Where-Object { $_.department -eq 'Colonia' }).Count
        Canelones = @($pendingCandidates | Where-Object { $_.department -eq 'Canelones' }).Count
        Montevideo = @($pendingCandidates | Where-Object { $_.department -eq 'Montevideo' }).Count
    }
    public_eligible = @($pendingCandidates | Where-Object { $_.public_eligible -eq $true }).Count
    ready_for_direct_integration = @($pendingCandidates | Where-Object { $_.ready_for_direct_integration -eq $true }).Count
    apply_now = @($pendingCandidates | Where-Object { $_.apply_now -eq $true }).Count
    excluded_closed = 1
}
$cleanCandidates = Repair-ObjectStrings -Value $pendingCandidates
$cleanCandidatePayload = [ordered]@{
    metadata = $cleanCandidateMetadata
    summary = $cleanCandidateSummary
    exclusions = @([ordered]@{
        candidate_key = $closedCandidates[0].candidate_key
        operational_status = $closedCandidates[0].operational_status
        reason = 'Cierre definitivo: excluido de los derivados operativos.'
    })
    candidates = @($cleanCandidates)
}
Write-JsonFile -Path (Join-Path $residentialReviewRoot 'candidatos_pendientes_84.json') -Value $cleanCandidatePayload
Write-CsvFile -Path (Join-Path $residentialReviewRoot 'candidatos_pendientes_84.csv') -Rows @($cleanCandidates | ForEach-Object { ConvertTo-FlatRow -Value $_ })

$normalizedCorrections = @()
foreach ($action in @($correctionsPackage.actions)) {
    $fixed = Repair-ObjectStrings -Value $action
    if ([string]::IsNullOrWhiteSpace("$($fixed.category_group_code)")) { $fixed.category_group_code = 'SIN_CLASIFICAR' }
    if ([string]::IsNullOrWhiteSpace("$($fixed.category_group)")) { $fixed.category_group = 'Pendiente de clasificación humana' }
    $normalizedCorrections += $fixed
}
$normalizedCorrectionsPayload = [ordered]@{
    metadata = [ordered]@{
        created_at = '2026-08-16'
        generated_at = $capturedLocalAt
        purpose = 'human_review_only'
        apply_now = $false
        source = 'Cambios/Residenciales/arandu_correcciones_staging_143.json'
        source_sha256 = Get-FileSha256 -Path $sourcePaths.correctionsJson
        normalization = 'Reparación de mojibake y etiqueta SIN_CLASIFICAR; no se infirieron categorías ni se cambió la recomendación.'
    }
    summary = [ordered]@{
        total = $normalizedCorrections.Count
        requires_human_review = @($normalizedCorrections | Where-Object { $_.requires_human_review -eq $true }).Count
        apply_now = @($normalizedCorrections | Where-Object { $_.apply_now -eq $true }).Count
        sin_clasificar = @($normalizedCorrections | Where-Object { $_.category_group_code -eq 'SIN_CLASIFICAR' }).Count
    }
    actions = @($normalizedCorrections)
}
Write-JsonFile -Path (Join-Path $correctionsReviewRoot 'correcciones_normalizadas_143.json') -Value $normalizedCorrectionsPayload
Write-CsvFile -Path (Join-Path $correctionsReviewRoot 'correcciones_normalizadas_143.csv') -Rows @($normalizedCorrections | ForEach-Object { ConvertTo-FlatRow -Value $_ })

$archivePriceRoot = Join-Path $archiveRoot 'precios_aplicados_21'
$enrichedOriginalRoot = Join-Path $residentialReviewRoot 'paquete_enriquecido_59_original'
$candidateOriginalRoot = Join-Path $residentialReviewRoot 'originales_candidatos_85'
$correctionOriginalRoot = Join-Path $correctionsReviewRoot 'originales_143'
$residentialReferenceRoot = Join-Path $residentialReviewRoot 'referencias'

$destinationMap = @{
    ([IO.Path]::GetFullPath($sourcePaths.enrichedJson)) = Join-Path $enrichedOriginalRoot 'residenciales-enriquecidos.json'
    ([IO.Path]::GetFullPath($sourcePaths.enrichedZip)) = Join-Path $enrichedOriginalRoot 'paquete-integracion-residenciales-59.zip'
    ([IO.Path]::GetFullPath($sourcePaths.imagesReadyJson)) = Join-Path $imagesReviewRoot 'imagenes_para_importar_staging_143.json'
    ([IO.Path]::GetFullPath($sourcePaths.imagesWorkbook)) = Join-Path $imagesReviewRoot 'manifest_imagenes_159_referencia.xlsx'
    ([IO.Path]::GetFullPath($sourcePaths.imagesMixedZip)) = $null
    ([IO.Path]::GetFullPath($sourcePaths.imagesRejectedJson)) = $null
    ([IO.Path]::GetFullPath($sourcePaths.pricesEvidenceCsv)) = Join-Path $archivePriceRoot 'arandu_precios_evidencia_final.csv'
    ([IO.Path]::GetFullPath($sourcePaths.pricesCsv)) = Join-Path $archivePriceRoot 'arandu_precios_final_para_app.csv'
    ([IO.Path]::GetFullPath($sourcePaths.pricesJson)) = Join-Path $archivePriceRoot 'arandu_precios_final_para_app.json'
    ([IO.Path]::GetFullPath($sourcePaths.pricesWorkbook)) = Join-Path $archivePriceRoot 'arandu_precios_final_para_app.xlsx'
    ([IO.Path]::GetFullPath($sourcePaths.pricesSql)) = $null
    ([IO.Path]::GetFullPath($sourcePaths.pricesReadme)) = Join-Path $archivePriceRoot 'README_ARANDU_PRECIOS_FINALES.md'
    ([IO.Path]::GetFullPath($sourcePaths.candidatesCsv)) = Join-Path $candidateOriginalRoot 'arandu_candidatos_nuevos_staging_85.csv'
    ([IO.Path]::GetFullPath($sourcePaths.candidatesJson)) = Join-Path $candidateOriginalRoot 'arandu_candidatos_nuevos_staging_85.json'
    ([IO.Path]::GetFullPath($sourcePaths.correctionsCsv)) = Join-Path $correctionOriginalRoot 'arandu_correcciones_staging_143.csv'
    ([IO.Path]::GetFullPath($sourcePaths.correctionsJson)) = Join-Path $correctionOriginalRoot 'arandu_correcciones_staging_143.json'
    ([IO.Path]::GetFullPath($sourcePaths.residentialWorkbook)) = Join-Path $residentialReferenceRoot 'arandu_resumen_integracion_todos_departamentos.xlsx'
    ([IO.Path]::GetFullPath($sourcePaths.residentialReadme)) = Join-Path $residentialReferenceRoot 'README.md'
    ([IO.Path]::GetFullPath($sourcePaths.integratedPlan)) = $sourcePaths.integratedPlan
}

$inventoryRows = foreach ($file in $originalFiles) {
    $full = [IO.Path]::GetFullPath($file.FullName)
    $sourceRelative = Get-RelativePath -Path $full -Base $repoRoot
    $status = 'referencia'
    $reason = 'Documento de referencia conservado sin cambios.'
    $target = ''
    $evidence = ''
    $destination = $destinationMap[$full]
    if ($full -in @([IO.Path]::GetFullPath($sourcePaths.enrichedJson), [IO.Path]::GetFullPath($sourcePaths.enrichedZip))) {
        $status = 'fuente_mixta_pendiente'
        $reason = 'Contiene descripciones combinables y campos de precios/imágenes que requieren tratamiento separado.'
        $target = 'public.elepem (solo descripción y fuentes)'
        $evidence = '59/59 códigos existentes; 59 descripciones faltantes en el snapshot vivo.'
    }
    elseif ($full -in @([IO.Path]::GetFullPath($sourcePaths.imagesReadyJson), [IO.Path]::GetFullPath($sourcePaths.imagesWorkbook))) {
        $status = 'pendiente_derechos'
        $reason = 'Imágenes de prototipo; falta autorización pública, privacidad y deduplicación visual.'
        $target = 'Supabase Storage, solo tras autorización futura'
        $evidence = '143 imágenes; 0 hashes coincidentes con el lote de 144 publicado previamente.'
    }
    elseif ($full -eq [IO.Path]::GetFullPath($sourcePaths.imagesMixedZip)) {
        $status = 'reempacado_y_eliminado'
        $reason = 'Contenedor mixto 159 reemplazado por paquete limpio de 143.'
        $target = 'Ninguno'
        $evidence = '159 = 143 conservadas + 16 descartadas.'
    }
    elseif ($full -eq [IO.Path]::GetFullPath($sourcePaths.imagesRejectedJson)) {
        $status = 'descartado'
        $reason = 'Manifiesto NO_SUBIR consumido en deleted_manifest.json.'
        $target = 'Ninguno'
        $evidence = '16 descartes explícitos.'
    }
    elseif ($full -eq [IO.Path]::GetFullPath($sourcePaths.pricesSql)) {
        $status = 'descartado'
        $reason = 'SQL incompatible: crea staging_arandu.'
        $target = 'Ninguno'
        $evidence = 'No autorizado crear esquemas/tablas.'
    }
    elseif ($full.StartsWith([IO.Path]::GetFullPath((Split-Path -Parent $sourcePaths.pricesJson)), [StringComparison]::OrdinalIgnoreCase)) {
        $status = if ($full -eq [IO.Path]::GetFullPath($sourcePaths.pricesEvidenceCsv)) { 'archivado_parcialmente_aplicado' } else { 'archivado_ya_aplicado' }
        $reason = 'Paquete de precios aplicado; cinco indicios sin conciliar fueron separados.'
        $target = 'public.elepem (sin nueva escritura)'
        $evidence = '21/21 códigos presentes en el resultado de publicación; priced_elepem=21.'
    }
    elseif ($full -in @([IO.Path]::GetFullPath($sourcePaths.candidatesCsv), [IO.Path]::GetFullPath($sourcePaths.candidatesJson))) {
        $status = 'pendiente_revision'
        $reason = '84 candidatos pendientes; uno cerrado excluido de derivados.'
        $target = 'public.elepem o public.elepem_sin_ubicacion, solo tras deduplicación y validación'
        $evidence = 'public_eligible=0; ready_for_direct_integration=0; apply_now=0.'
    }
    elseif ($full -in @([IO.Path]::GetFullPath($sourcePaths.correctionsCsv), [IO.Path]::GetFullPath($sourcePaths.correctionsJson))) {
        $status = 'pendiente_revision_humana'
        $reason = 'Todas las correcciones requieren revisión humana y apply_now=false.'
        $target = 'Ambas tablas operativas según cada caso futuro'
        $evidence = '143/143 requires_human_review=true; 143/143 apply_now=false.'
    }
    elseif ($full -in @([IO.Path]::GetFullPath($sourcePaths.residentialWorkbook), [IO.Path]::GetFullPath($sourcePaths.residentialReadme))) {
        $status = 'referencia_pendiente'
        $reason = 'Resumen humano; no es insumo directo de importación.'
        $target = 'Ninguno'
        $evidence = 'Conservado como formato redundante de referencia.'
    }
    [pscustomobject][ordered]@{
        source_path = $sourceRelative
        sha256 = Get-FileSha256 -Path $full
        size_bytes = [int64]$file.Length
        record_type = $file.Extension.TrimStart('.').ToLowerInvariant()
        record_key = "file:$sourceRelative"
        status = $status
        reason = $reason
        supabase_target = $target
        already_applied_evidence = $evidence
        destination_path = if ($null -eq $destination) { '' } else { Get-RelativePath -Path $destination -Base $repoRoot }
    }
}

$inventoryPayload = [ordered]@{
    version = 1
    generated_at = $capturedLocalAt
    expected_by_plan = 20
    actual_files_found = $originalCount
    count_difference_note = 'El plan decía 20, pero el árbol contenía 19 archivos. Los 19 estaban identificados explícitamente y fueron reconciliados.'
    supabase_writes_performed = $false
    base_de_datos_write_performed = $false
    source_root = 'Cambios/'
    files = @($inventoryRows)
}
Write-JsonFile -Path (Join-Path $auditRoot 'inventario.json') -Value $inventoryPayload
Write-CsvFile -Path (Join-Path $auditRoot 'inventario.csv') -Rows @($inventoryRows)

$dryRun = @"
# Organización de Cambios — dry run ejecutado

- Fecha local de captura: $capturedLocalAt
- Archivos esperados por el plan: 20
- Archivos reales encontrados y reconciliados: $originalCount
- Escrituras en Supabase: 0
- Escrituras en Base de Datos/: 0

## Snapshot vivo de Supabase

- public.elepem: $SupabaseElepemCount
- public.elepem_sin_ubicacion: $SupabaseUnlocatedCount
- ELEPEM con precio: $SupabasePricedCount
- Vínculos de fotos publicadas: $SupabasePublishedPhotoLinks
- Fingerprint de columnas operativas: $SupabaseSchemaFingerprint

## Operaciones

- Preparar 59 candidatos de descripción y fuentes, sin autorización de escritura.
- Archivar el paquete aplicado de 21 precios y separar cinco indicios sin conciliar.
- Reconstruir un ZIP limpio con 143 imágenes pendientes de derechos.
- Excluir 16 imágenes NO_SUBIR y registrar sus hashes antes de eliminar el contenedor mixto.
- Preparar 84 candidatos pendientes y excluir uno con cierre definitivo.
- Normalizar 143 correcciones sin inferir categorías ni aplicarlas.
- Eliminar el SQL que crea staging_arandu.

## Gate de futuras escrituras

Antes de cualquier escritura futura se debe repetir el snapshot, deduplicar contra ambas tablas operativas y validar fechas de fuente. Este proceso no crea tablas, columnas, esquemas, colas ni buckets.
"@
Write-Utf8NoBom -Path (Join-Path $auditRoot 'dry_run.md') -Content $dryRun

$archiveStatus = @'
# Estado del archivo de precios

- 21 ELEPEM del paquete principal ya aparecen en el resultado de publicación del 2026-08-16.
- No se realizará una nueva escritura en Supabase.
- El CSV de evidencia es mixto: conserva 26 evidencias conciliadas y cinco indicios separados en `Cambios/02_pendiente_revision/precios_no_conciliados/`.
- `arandu_precios_final_staging.sql` fue descartado porque crea un esquema no autorizado.
'@
Write-Utf8NoBom -Path (Join-Path $archivePriceRoot 'ARCHIVE_STATUS.md') -Content $archiveStatus

Move-SafeFile -Source $sourcePaths.enrichedJson -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.enrichedJson)]
Move-SafeFile -Source $sourcePaths.enrichedZip -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.enrichedZip)]
Move-SafeFile -Source $sourcePaths.imagesReadyJson -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.imagesReadyJson)]
Move-SafeFile -Source $sourcePaths.imagesWorkbook -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.imagesWorkbook)]
Move-SafeFile -Source $sourcePaths.pricesEvidenceCsv -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.pricesEvidenceCsv)]
Move-SafeFile -Source $sourcePaths.pricesCsv -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.pricesCsv)]
Move-SafeFile -Source $sourcePaths.pricesJson -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.pricesJson)]
Move-SafeFile -Source $sourcePaths.pricesWorkbook -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.pricesWorkbook)]
Move-SafeFile -Source $sourcePaths.pricesReadme -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.pricesReadme)]
Move-SafeFile -Source $sourcePaths.candidatesCsv -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.candidatesCsv)]
Move-SafeFile -Source $sourcePaths.candidatesJson -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.candidatesJson)]
Move-SafeFile -Source $sourcePaths.correctionsCsv -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.correctionsCsv)]
Move-SafeFile -Source $sourcePaths.correctionsJson -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.correctionsJson)]
Move-SafeFile -Source $sourcePaths.residentialWorkbook -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.residentialWorkbook)]
Move-SafeFile -Source $sourcePaths.residentialReadme -Destination $destinationMap[[IO.Path]::GetFullPath($sourcePaths.residentialReadme)]

Remove-SafeFile -Path $sourcePaths.pricesSql
Remove-SafeFile -Path $sourcePaths.imagesRejectedJson
Remove-SafeFile -Path $sourcePaths.imagesMixedZip

$deletedAt = (Get-Date).ToUniversalTime().ToString('O')
foreach ($entry in $deletionEntries) { $entry.deleted_at = $deletedAt }
$deletionManifest.generated_at = $deletedAt
Write-JsonFile -Path $deletionManifestPath -Value $deletionManifest

foreach ($oldFolder in @(
    (Join-Path $changesRoot 'Fotos, precios y dscripciones'),
    (Join-Path $changesRoot 'Imagenes'),
    (Join-Path $changesRoot 'Precios residenciales'),
    (Join-Path $changesRoot 'Residenciales')
)) {
    if (Test-Path -LiteralPath $oldFolder -PathType Container) {
        $remaining = @(Get-ChildItem -LiteralPath $oldFolder -Force)
        if ($remaining.Count -eq 0) { Remove-Item -LiteralPath $oldFolder }
    }
}

$changesReadme = @'
# Organización de Cambios

La organización del 2026-08-16 separa los insumos por estado:

- `01_para_combinar/descripciones_y_fuentes/`: 59 propuestas sin ejecutar en Supabase.
- `02_pendiente_revision/imagenes_derechos/`: 143 imágenes no autorizadas todavía para publicación.
- `02_pendiente_revision/residenciales/`: 84 candidatos pendientes y fuentes originales.
- `02_pendiente_revision/correcciones/`: 143 correcciones para revisión humana.
- `02_pendiente_revision/precios_no_conciliados/`: cinco indicios de precios pendientes.

El inventario, los hashes y el detalle de descartes están en `data/discovery/organizacion_cambios_2026-08-16/`. Los precios ya aplicados se archivaron en `data/discovery/archivo_importado/2026-08-16/`.

No se escribió en Supabase ni en `Base de Datos/`.
'@
Write-Utf8NoBom -Path (Join-Path $changesRoot 'README.md') -Content $changesReadme

$masterAfter = Get-TreeFingerprint -Path $masterRoot
if ($masterBefore.file_count -ne $masterAfter.file_count -or
    $masterBefore.total_bytes -ne $masterAfter.total_bytes -or
    $masterBefore.metadata_sha256 -ne $masterAfter.metadata_sha256) {
    throw 'El fingerprint de Base de Datos cambió durante la organización.'
}

$result = [ordered]@{
    version = 1
    completed_at = (Get-Date).ToUniversalTime().ToString('O')
    original_files_reconciled = $originalCount
    supabase_writes = 0
    base_de_datos_unchanged = $true
    base_de_datos_fingerprint = $masterAfter
    enriched_merge_candidates = @($mergeCandidates).Count
    prices_archived = @($prices.facilities_ready_for_review).Count
    unmatched_price_leads_preserved = @($prices.unmatched_price_leads).Count
    clean_images = 143
    rejected_images_deleted = 16
    retained_images_with_duplicate_hash = $cleanDuplicateHashCount
    pending_candidates = $pendingCandidates.Count
    closed_candidates_excluded = $closedCandidates.Count
    normalized_corrections = $normalizedCorrections.Count
    explicit_sql_files_deleted = 1
    clean_images_zip_sha256 = Get-FileSha256 -Path $cleanImagesZip
}
Write-JsonFile -Path (Join-Path $auditRoot 'result.json') -Value $result

$result | ConvertTo-Json -Depth 16
