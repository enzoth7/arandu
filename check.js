const { Client } = require('pg');
async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.itolluaivfoxnaohbsdk:%2Bytc%2F%2A-btH%266Lq2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
  });
  await client.connect();
  const res = await client.query(`
    SELECT event_object_schema, event_object_table, trigger_name, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'
  `);
  console.log(res.rows);
  await client.end();
}
run();
