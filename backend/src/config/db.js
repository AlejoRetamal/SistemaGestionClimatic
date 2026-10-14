const { Pool } = require("pg");
function createDatabase(config) {
  let pool;
  function getPool() {
    if (!config.databaseEnabled)
      throw Object.assign(
        new Error(
          "Base de datos deshabilitada. Configurá una base independiente para habilitar el acceso.",
        ),
        { status: 503 },
      );
    if (!pool) {
      pool = new Pool({
        connectionString: config.databaseUrl,
        max: 10,
        connectionTimeoutMillis: 5000,
      });
      pool.on("error", () =>
        console.error("Se perdió una conexión inactiva de PostgreSQL."),
      );
    }
    return pool;
  }
  return {
    query: (text, params) => getPool().query(text, params),
    connect: () => getPool().connect(),
    close: () => (pool ? pool.end() : Promise.resolve()),
  };
}
module.exports = { createDatabase };
