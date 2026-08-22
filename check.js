const { Client } = require('pg');
async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.itolluaivfoxnaohbsdk:%2Bytc%2F%2A-btH%266Lq2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
  });
  await client.connect();
  const result = await client.query(`SELECT COUNT(*) FROM public.elepem`);
  console.log(result.rows);
  await client.end();
}
run();
