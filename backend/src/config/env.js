const path = require("node:path");
// Never load legacy .env: it may point at an existing company database.
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.local"),
  quiet: true,
});
function readConfig(source = process.env) {
  const positive = (key, fallback) => {
    const value = Number(source[key] || fallback);
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new Error(`${key} debe ser un entero positivo`);
    return value;
  };
  const production = source.APP_ENV === "production";
  const config = {
    host: source.APP_HOST || "127.0.0.1",
    port: positive("APP_PORT", 3000),
    origin: source.APP_ORIGIN || "http://localhost:4200",
    databaseEnabled: source.APP_DATABASE_ENABLED === "true",
    databaseDriver: source.APP_DATABASE_DRIVER || "postgres",
    serviceMarginPercent: Number(source.APP_SERVICE_MARGIN_PERCENT ?? 10),
    databaseUrl: source.APP_DATABASE_URL || "",
    databasePoolMax: positive("APP_DATABASE_POOL_MAX", 3),
    databaseSslCa: source.APP_DATABASE_SSL_CA || "",
    mysql: {
      host: source.APP_MYSQL_HOST || "127.0.0.1",
      port: positive("APP_MYSQL_PORT", 3306),
      database: source.APP_MYSQL_DATABASE || "",
      user: source.APP_MYSQL_USER || "",
      password: source.APP_MYSQL_PASSWORD || "",
    },
    pinSecret: source.APP_PIN_SECRET || "",
    sessionHours: positive("APP_SESSION_HOURS", 8),
    production,
    vercel: source.VERCEL === "1",
    secureCookie: production || source.APP_COOKIE_SECURE === "true",
  };
  const origin = new URL(config.origin);
  if (
    !Number.isFinite(config.serviceMarginPercent) ||
    config.serviceMarginPercent < 0 ||
    config.serviceMarginPercent > 100
  )
    throw new Error("APP_SERVICE_MARGIN_PERCENT debe estar entre 0 y 100");
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.origin !== config.origin
  )
    throw new Error("APP_ORIGIN debe ser un origen HTTP(S) sin ruta");
  if (
    config.databaseEnabled &&
    (config.pinSecret.length < 32 ||
      (config.databaseDriver === "postgres" && !config.databaseUrl))
  )
    throw new Error(
      "Configurar APP_DATABASE_URL y APP_PIN_SECRET (mínimo 32 caracteres)",
    );
  if (!["postgres", "mysql-local"].includes(config.databaseDriver))
    throw new Error("APP_DATABASE_DRIVER debe ser postgres o mysql-local");
  if (
    config.databaseDriver === "mysql-local" &&
    (production ||
      !["localhost", "127.0.0.1", "::1"].includes(config.mysql.host) ||
      config.mysql.database !== "datos_climatic" ||
      !config.mysql.user)
  )
    throw new Error(
      "MySQL provisional requiere desarrollo, servidor local y esquema datos_climatic",
    );
  if (production && origin.protocol !== "https:")
    throw new Error("Producción requiere HTTPS");
  return config;
}
module.exports = { readConfig };
