const { Client } = require('pg');

async function testConnection() {
  try {
    console.log("Testing aws-1...");
    const client1 = new Client({
      connectionString: 'postgresql://postgres.csalrrfrzblccfcfwonb:3hCGC5HCwvrsk8bu@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
    });
    await client1.connect();
    console.log("Connected to aws-1 successfully!");
    await client1.end();
  } catch (err) {
    console.error("aws-1 Connection error:", err.message);
  }

  try {
    console.log("Testing aws-0...");
    const client0 = new Client({
      connectionString: 'postgresql://postgres.csalrrfrzblccfcfwonb:3hCGC5HCwvrsk8bu@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'
    });
    await client0.connect();
    console.log("Connected to aws-0 successfully!");
    await client0.end();
  } catch (err) {
    console.error("aws-0 Connection error:", err.message);
  }
}

testConnection();
