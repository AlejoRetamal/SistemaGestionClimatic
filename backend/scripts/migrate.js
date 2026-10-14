const fs = require("node:fs/promises");
const path = require("node:path");
const { localDatabase } = require("./local-database");

async function main() {
  const { db } = localDatabase();
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(783241901)");
    const { rows: tables } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    if (
      tables.some((row) => row.tablename !== "schema_migrations") &&
      !tables.some((row) => row.tablename === "schema_migrations")
    ) {
      throw new Error(
        "La base no está vacía. No se modificó: este instalador no migra bases antiguas.",
      );
    }
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const { rows: applied } = await client.query(
      "SELECT name FROM schema_migrations",
    );
    if (
      applied.length === 0 &&
      tables.some((row) => row.tablename !== "schema_migrations")
    )
      throw new Error(
        "Hay tablas ajenas al instalador. No se modificó la base.",
      );
    const directory = path.resolve(__dirname, "../src/db/migrations");
    for (const name of (await fs.readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      if (applied.some((row) => row.name === name)) continue;
      await client.query(await fs.readFile(path.join(directory, name), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        name,
      ]);
    }
    await client.query("COMMIT");
    console.log("Migraciones de la nueva base local completadas.");
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
    await db.close();
  }
}
main().catch(() => {
  console.error(
    "No se pudo migrar. Verificá la configuración, que la base sea local y nueva, y el flag --confirm-new-local-db. No uses la base de Jorge.",
  );
  process.exitCode = 1;
});
