const { readConfig } = require("../src/config/env");
const { createDatabase } = require("../src/config/db");
function supabaseDatabase() {
  const config = readConfig();
  if (!config.databaseEnabled || config.databaseDriver !== "postgres")
    throw new Error(
      "Configurá APP_DATABASE_ENABLED=true y APP_DATABASE_DRIVER=postgres.",
    );
  const url = new URL(config.databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !(
      /^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname) ||
      /^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname)
    ) ||
    url.pathname !== "/postgres"
  )
    throw new Error(
      "Copiá la URI PostgreSQL de Connect en tu proyecto Supabase (base postgres).",
    );
  return { config, db: createDatabase(config) };
}
function reportConnectionError(error) {
  // Driver errors can include credentials/query values. Do not print raw errors.
  const code = /^[A-Z0-9_]+$/.test(error.code || "") ? error.code : "CONFIG";
  console.error(
    `No se completó la operación (${code}). Revisá la URI, contraseña, certificado y esquema; ver docs/supabase.md.`,
  );
  process.exitCode = 1;
}
module.exports = { supabaseDatabase, reportConnectionError };
