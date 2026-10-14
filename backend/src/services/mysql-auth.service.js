const { randomBytes, createHash, timingSafeEqual } = require("node:crypto");
const { validPin } = require("./pin.service");
const { allowedModules } = require("../config/permissions");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  apellido: row.apellido,
  email: row.email,
  grupo: row.grupo,
  modulos: allowedModules(row.grupo),
});

// Development bridge for the user's local legacy database. No data is written.
// Sessions live in this process and are invalidated when it restarts.
function createMysqlAuthService(repository, config, now = Date.now) {
  if (config.production)
    throw new Error("La autenticación MySQL provisional no admite producción");
  const sessions = new Map();
  function cleanup() {
    for (const [token, session] of sessions)
      if (session.expires <= now()) sessions.delete(token);
  }
  return {
    async login(pin) {
      if (!validPin(pin)) throw fail(400, "Ingresá un PIN numérico válido.");
      if (!config.databaseEnabled)
        throw fail(503, "Base de datos deshabilitada.");
      cleanup();
      const matches = await repository.findByPin(pin);
      if (matches.length === 0)
        throw fail(401, "PIN incorrecto o empleado inactivo.");
      if (matches.length > 1)
        throw fail(
          409,
          "El PIN está asignado a varios empleados. Se necesita un PIN único para ingresar.",
        );
      if (sessions.size >= 10000)
        throw fail(503, "No se pudo iniciar otra sesión. Intentá más tarde.");
      const token = randomBytes(32).toString("hex");
      const csrf = randomBytes(32).toString("hex");
      const expires = new Date(now() + config.sessionHours * 3600000);
      sessions.set(digest(token), {
        employeeId: matches[0].id,
        csrf: digest(csrf),
        expires: expires.getTime(),
      });
      return { user: publicUser(matches[0]), token, csrf, expires };
    },
    async authenticate(token, csrf, mutating) {
      cleanup();
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
        throw fail(401, "Iniciá sesión para continuar.");
      const session = sessions.get(digest(token));
      if (!session) throw fail(401, "La sesión venció. Volvé a ingresar.");
      if (
        mutating &&
        !timingSafeEqual(
          Buffer.from(session.csrf, "hex"),
          Buffer.from(digest(typeof csrf === "string" ? csrf : ""), "hex"),
        )
      ) {
        throw fail(403, "La solicitud no es válida. Recargá la página.");
      }
      const employee = await repository.findById(session.employeeId);
      if (!employee) {
        sessions.delete(digest(token));
        throw fail(401, "El empleado está inactivo o ya no existe.");
      }
      return publicUser(employee);
    },
    async logout(token) {
      sessions.delete(digest(token));
    },
  };
}
module.exports = { createMysqlAuthService };
