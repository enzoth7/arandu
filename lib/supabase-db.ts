import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;

function getDatabasePool(): Pool {
  if (pool) return pool;

  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectRef || !password) throw new Error("Supabase database connection is not configured.");

  const host = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`;
  const usesVercelTransactionPooler = process.env.VERCEL === "1"
    && host.toLocaleLowerCase("en-US").endsWith(".pooler.supabase.com");

  pool = new Pool({
    host,
    // Supabase's transaction pooler (6543) is the appropriate mode for
    // ephemeral Vercel functions. Port 5432 keeps a session per instance and
    // exhausts small projects after only a few concurrent cold starts.
    port: usesVercelTransactionPooler ? 6543 : Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password,
    // Supabase managed connections require TLS. Local disposable PostgreSQL
    // may opt out explicitly; production keeps the secure default.
    ssl: process.env.SUPABASE_DB_SSL_MODE === "disable"
      ? false
      : { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    max: usesVercelTransactionPooler ? 1 : 3,
    idleTimeoutMillis: usesVercelTransactionPooler ? 5_000 : 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return pool;
}

export async function querySupabaseDatabase<T extends Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await getDatabasePool().query<T>(text, values);
  return result.rows;
}

export async function withSupabaseTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '15s'");
    await client.query("set local lock_timeout = '5s'");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
