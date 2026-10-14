const { readConfig } = require("../src/config/env");
const { createDatabase } = require("../src/config/db");

function localDatabase(args = process.argv.slice(2)) {
  const config = readConfig();
  if (config.databaseDriver !== "postgres")
    throw new Error(
      "Los scripts de instalación solo admiten PostgreSQL. MySQL provisional es de solo lectura.",
    );
  if (!args.includes("--confirm-new-local-db"))
    throw new Error(
      "Requiere --confirm-new-local-db. Usar exclusivamente una base local NUEVA climatic_dev o climatic_test.",
    );
  if (!config.databaseEnabled)
    throw new Error(
      "APP_DATABASE_ENABLED debe habilitarse explícitamente en .env.local",
    );
  const url = new URL(config.databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["/climatic_dev", "/climatic_test"].includes(url.pathname) ||
    url.search
  ) {
    throw new Error(
      "Este script solo admite localhost y las bases climatic_dev o climatic_test, sin parámetros URL. No admite la base anterior.",
    );
  }
  return { config, db: createDatabase(config) };
}
module.exports = { localDatabase };
