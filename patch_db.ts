import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'api/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB.");

    await client.query(`
      ALTER TABLE integrations 
      ADD COLUMN IF NOT EXISTS repos_permissions JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("Added repos_permissions column to integrations table.");

    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Reloaded schema for PostgREST.");

  } catch (error) {
    console.error("Error patching DB:", error);
  } finally {
    await client.end();
  }
}

run();
