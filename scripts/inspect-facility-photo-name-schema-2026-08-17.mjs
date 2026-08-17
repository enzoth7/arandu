import pg from "pg";

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST || `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  application_name: "arandu-facility-photo-name-schema-inspection",
});

try {
  await client.connect();
  await client.query("begin read only");
  const [columns, counts] = await Promise.all([
    client.query(`select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('intake_report_attachments', 'facility_change_publication_photos')
      order by table_name, ordinal_position`),
    client.query(`select 'attachments' as kind, count(*)::int as total,
        count(*) filter (where report.demo_facility_id is not null)::int as demo_linked,
        count(*) filter (where report.facility_id is not null)::int as facility_linked,
        count(*) filter (where facility.id is not null)::int as name_backfillable
      from public.intake_report_attachments attachment
      join public.intake_reports report on report.id = attachment.report_id
      left join public.elepem facility on facility.id = report.facility_id
      union all
      select 'publication_photos', count(*)::int,
        count(*) filter (where publication.demo_facility_id is not null)::int,
        count(*) filter (where publication.facility_id is not null)::int,
        count(*) filter (where facility.id is not null)::int
      from public.facility_change_publication_photos photo
      join public.facility_change_publications publication on publication.id = photo.publication_id
      left join public.elepem facility on facility.id = publication.facility_id`),
  ]);
  console.log(JSON.stringify({ columns: columns.rows, counts: counts.rows }, null, 2));
  await client.query("rollback");
} finally {
  await client.end();
}
