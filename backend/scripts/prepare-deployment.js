const fs = require("node:fs/promises");
const path = require("node:path");
const {
  supabaseDatabase,
  reportConnectionError,
} = require("./supabase-database");
async function main() {
  const { db } = supabaseDatabase();
  let client;
  try {
    client = await db.connect();
    await client.query(
      await fs.readFile(
        path.join(__dirname, "../src/db/prepare-deployment.sql"),
        "utf8",
      ),
    );
    console.log("Límite de intentos compartido preparado para Vercel.");
  } finally {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    await db.close();
  }
}
main().catch(reportConnectionError);
