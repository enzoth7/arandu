import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Credenciales
const supabaseUrl = "https://itolluaivfoxnaohbsdk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0b2xsdWFpdmZveG5hb2hic2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE5NzYwNCwiZXhwIjoyMTAwNzczNjA0fQ.nY2fl87eUNBxnh7g-XvT0quIUWMim1dU7VnzC2MI4tQ";
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const dataPath = "c:/Orchestrator/Agente Fullstack/Projects/arandu/Cambios/carpeta_imagenes_originales_correctas_143_para_codex";
const manifestPath = path.join(dataPath, "manifest_local_sin_urls.json");

async function run() {
  console.log("Reading manifest...");
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const bucketName = 'intake-evidence'; // Bucket existente seguro para reportes
  console.log(`Using bucket: ${bucketName}`);

  // Intentar crear el bucket por si no existe (el usuario mencionó que quizás había que crearlo)
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === bucketName)) {
    console.log(`Creating bucket ${bucketName}...`);
    await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 10485760 });
  }

  // Agrupar por codigo (residencial)
  const groups: Record<string, any[]> = {};
  for (const img of manifest.images) {
    if (!groups[img.codigo]) groups[img.codigo] = [];
    groups[img.codigo].push(img);
  }

  console.log(`Found ${Object.keys(groups).length} unique residenciales.`);

  let uploadedCount = 0;
  for (const codigo of Object.keys(groups)) {
    console.log(`\nProcessing residencial: ${codigo}...`);
    
    // 1. Obtener ID de elepem
    const { data: elepemData, error: elErr } = await supabase
      .from('elepem')
      .select('id')
      .eq('codigo', codigo)
      .single();

    if (elErr || !elepemData) {
      console.error(`Elepem not found for ${codigo}:`, elErr?.message);
      continue;
    }
    const facilityId = elepemData.id;
    console.log(`Found elepem.id = ${facilityId}`);

    // 2. Crear intake_report
    const { data: reportData, error: repErr } = await supabase
      .from('intake_reports')
      .insert({
        entry_type: 'facility_change',
        facility_id: facilityId,
        is_demo: false,
        priority: 'Baja',
        case_code: `AM-20260817-${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
        report_payload: { note: "Migracion masiva de imagenes originales" }
      })
      .select('id')
      .single();

    if (repErr) {
      console.error(`Error creating report for ${codigo}:`, repErr.message);
      continue;
    }
    const reportId = reportData.id;

    // 3. Crear facility_change_publication
    const { data: pubData, error: pubErr } = await supabase
      .from('facility_change_publications')
      .insert({
        report_id: reportId,
        facility_id: facilityId,
        reviewer: 'system_migration'
      })
      .select('id')
      .single();

    if (pubErr) {
      console.error(`Error creating publication for ${codigo}:`, pubErr.message);
      continue;
    }
    const publicationId = pubData.id;

    // Procesar las imagenes
    const images = groups[codigo];
    images.sort((a, b) => a.position - b.position); // Ordenar por posicion original

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const localFilePath = path.join(dataPath, img.localPath);
      
      if (!fs.existsSync(localFilePath)) {
        console.error(`File missing: ${localFilePath}`);
        continue;
      }
      
      const fileBuffer = fs.readFileSync(localFilePath);
      const storagePath = `elepem/${codigo}/${img.imageId}.jpg`;

      // Subir archivo al storage
      const { error: upErr } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (upErr) {
        console.error(`Error uploading ${img.imageId}:`, upErr.message);
        continue;
      }

      // Crear intake_report_attachment
      const { data: attData, error: attErr } = await supabase
        .from('intake_report_attachments')
        .upsert({
          id: crypto.randomUUID(),
          report_id: reportId,
          purpose: 'facility_photo',
          object_path: storagePath,
          file_name: path.basename(img.localPath),
          mime_type: 'image/jpeg',
          size_bytes: img.bytes,
          sha256_hex: img.sha256.toLowerCase(),
          rights_metadata: { rightsConfirmed: "true" }
        }, { onConflict: 'object_path' })
        .select('id')
        .single();

      if (attErr) {
        console.error(`Error creating attachment record for ${img.imageId}:`, attErr.message);
        continue;
      }

      // Crear facility_change_publication_photos
      const { error: photoErr } = await supabase
        .from('facility_change_publication_photos')
        .insert({
          publication_id: publicationId,
          attachment_id: attData.id,
          public_object_path: storagePath,
          public_sha256_hex: img.sha256.toLowerCase(),
          position: i
        });

      if (photoErr) {
        console.error(`Error mapping photo ${img.imageId} to publication:`, photoErr.message);
        continue;
      }
      
      console.log(` - Success: ${img.imageId} (position: ${i})`);
      uploadedCount++;
    }
  }
  
  console.log(`\nDONE! Total images uploaded and registered: ${uploadedCount}`);
}

run().catch(console.error);
