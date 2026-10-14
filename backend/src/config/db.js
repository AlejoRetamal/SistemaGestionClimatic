const { Pool, types } = require("pg");
// Keep the API's numeric IDs/quantities and local wall-clock dates consistent
// with MySQL. These schemas constrain IDs to uint32 and quantities to 12 digits.
const databaseTypes = {
  getTypeParser(oid, format) {
    if (format !== "binary") {
      if (oid === 20)
        return (value) => {
          const number = Number(value);
          if (!Number.isSafeInteger(number))
            throw new Error("Integer exceeds API range");
          return number;
        };
      if (oid === 1700) return Number;
      if (oid === 1082 || oid === 1114) return (value) => value;
    }
    return types.getTypeParser(oid, format);
  },
};
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
        max: config.databasePoolMax || 3,
        types: databaseTypes,
        ...connectionSecurity(config),
        idleTimeoutMillis: 10000,
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
function connectionSecurity(config) {
  const url = new URL(config.databaseUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (local) return {};
  // URL SSL parameters override pg's ssl object: remove them and enforce
  // certificate verification explicitly for remote databases.
  for (const key of [
    "ssl",
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "uselibpqcompat",
  ])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(config.databaseSslCa
        ? { ca: config.databaseSslCa.replace(/\\n/g, "\n") }
        : {}),
    },
  };
}
module.exports = { createDatabase, databaseTypes, connectionSecurity };
