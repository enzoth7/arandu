import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const migrationSql = fs.readFileSync(
  path.resolve('supabase/migrations/20260822120000_add_user_profiles.sql'),
  'utf8'
);

const pool = new pg.Pool({
  host: process.env.SUPABASE_DB_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  port: Number(process.env.SUPABASE_DB_PORT) || 6543,
  user: process.env.SUPABASE_DB_USER || 'postgres.itolluaivfoxnaohbsdk',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('Applying migration 20260822120000_add_user_profiles.sql...');
  await pool.query(migrationSql);
  console.log('Migration applied successfully!');
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ORDER BY ordinal_position
  `);
  console.log('Table columns:', res.rows);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
