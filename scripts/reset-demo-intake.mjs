import pg from "pg";

if (!process.argv.includes("--confirm-demo-only")) {
  throw new Error("Falta --confirm-demo-only. El reset no se ejecutó.");
}
if (process.env.DEMO_MODE !== "true" || process.env.ALLOW_DEMO_RESET !== "true") {
  throw new Error("DEMO_MODE y ALLOW_DEMO_RESET deben estar habilitados explícitamente.");
}
if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  throw new Error("El reset demo está bloqueado en producción.");
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!projectRef || !password) throw new Error("Falta la conexión de Supabase.");

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password,
  ssl: process.env.SUPABASE_DB_SSL_MODE === "disable" ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query("begin");
  await client.query("set local app.demo_reset = 'on'");
  const objects = await client.query(
    `DELETE FROM storage.objects AS object
     USING public.intake_report_attachments AS attachment,
           public.intake_reports AS report
     WHERE attachment.report_id = report.id
       AND report.is_demo = true
       AND object.bucket_id = attachment.bucket_id
       AND object.name = attachment.object_path
     RETURNING object.name`,
  );
  const reports = await client.query(
    `DELETE FROM public.intake_reports
     WHERE is_demo = true
     RETURNING id`,
  );
  await client.query("commit");
  console.log(JSON.stringify({ demoReportsDeleted: reports.rowCount, demoObjectsDeleted: objects.rowCount }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
