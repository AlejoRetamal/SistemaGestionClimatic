const { randomBytes, createHash, timingSafeEqual } = require("node:crypto");
const { validPin, pinLookup, hashPin, verifyPin } = require("./pin.service");
const { allowedModules } = require("../config/permissions");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const publicUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  apellido: row.apellido,
  email: row.email,
  grupo: row.grupo,
  modulos: allowedModules(row.grupo),
});
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
function createAuthService(db, config) {
  let dummyHash;
  return {
    async login(pin) {
      if (!validPin(pin))
        throw httpError(400, "Ingresá un PIN numérico válido.");
      if (!config.databaseEnabled)
        throw httpError(
          503,
          "Base de datos deshabilitada. Configurá una base independiente para iniciar sesión.",
        );
      const { rows } = await db.query(
        "SELECT id, nombre, apellido, email, grupo, pin_hash FROM empleados WHERE pin_lookup = $1 AND activo = TRUE",
        [pinLookup(pin, config.pinSecret)],
      );
      const employee = rows[0];
      dummyHash ||= hashPin(randomBytes(32).toString("hex"));
      const valid = await verifyPin(
        pin,
        employee?.pin_hash || (await dummyHash),
      );
      if (!employee || !valid)
        throw httpError(401, "PIN incorrecto o empleado inactivo.");
      const token = randomBytes(32).toString("hex");
      const csrf = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + config.sessionHours * 3600000);
      await db.query(
        "INSERT INTO sesiones (empleado_id, token_hash, csrf_hash, fecha_expiracion) VALUES ($1, $2, $3, $4)",
        [employee.id, digest(token), digest(csrf), expires],
      );
      return { user: publicUser(employee), token, csrf, expires };
    },
    async authenticate(token, csrf, mutating) {
      if (!token || !/^[a-f0-9]{64}$/.test(token))
        throw httpError(401, "Iniciá sesión para continuar.");
      const { rows } = await db.query(
        `SELECT e.id, e.nombre, e.apellido, e.email, e.grupo, s.csrf_hash
        FROM sesiones s JOIN empleados e ON e.id = s.empleado_id
        WHERE s.token_hash = $1 AND s.fecha_expiracion > now() AND e.activo = TRUE`,
        [digest(token)],
      );
      const row = rows[0];
      if (!row) throw httpError(401, "La sesión venció. Volvé a ingresar.");
      if (mutating) {
        const expected = Buffer.from(row.csrf_hash, "hex");
        const received = Buffer.from(
          digest(typeof csrf === "string" ? csrf : ""),
          "hex",
        );
        if (
          expected.length !== received.length ||
          !timingSafeEqual(expected, received)
        )
          throw httpError(403, "La solicitud no es válida. Recargá la página.");
      }
      return publicUser(row);
    },
    async logout(token) {
      await db.query("DELETE FROM sesiones WHERE token_hash = $1", [
        digest(token),
      ]);
    },
  };
}
module.exports = { createAuthService };
