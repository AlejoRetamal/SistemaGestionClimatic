const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createAuthService } = require("../src/services/auth.service");
const {
  hashPin,
  pinLookup,
  verifyPin,
} = require("../src/services/pin.service");
const { createApp } = require("../src/app");
const {
  MODULES_BY_ROLE,
  allowedModules,
} = require("../src/config/permissions");
const { loginLimit } = require("../src/middlewares/login-limit");
const { readConfig } = require("../src/config/env");

const config = {
  origin: "http://localhost:4200",
  databaseEnabled: true,
  pinSecret: "test-only-secret-that-is-never-a-live-secret",
  sessionHours: 8,
  secureCookie: false,
};
const digest = (value) => createHash("sha256").update(value).digest("hex");

// Explicit in-memory SQL boundary: no pg import, URL, credentials, or external DB.
async function fixture() {
  const employee = {
    id: 7,
    nombre: "Ana",
    apellido: "Prueba",
    email: "ana@example.test",
    grupo: "Direccion",
    activo: true,
    pin_hash: await hashPin("0012"),
  };
  const sessions = new Map();
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT id,"))
        return {
          rows:
            employee.activo && params[0] === pinLookup("0012", config.pinSecret)
              ? [employee]
              : [],
        };
      if (sql.startsWith("INSERT INTO sesiones")) {
        sessions.set(params[1], { csrf_hash: params[2], expires: params[3] });
        return { rows: [] };
      }
      if (sql.startsWith("SELECT e.id")) {
        const session = sessions.get(params[0]);
        return {
          rows:
            session && employee.activo && session.expires > new Date()
              ? [{ ...employee, csrf_hash: session.csrf_hash }]
              : [],
        };
      }
      if (sql.startsWith("DELETE FROM sesiones")) {
        sessions.delete(params[0]);
        return { rows: [] };
      }
      throw new Error("Unexpected SQL in isolated test");
    },
  };
  return { employee, sessions, calls, auth: createAuthService(db, config) };
}

describe("PIN and session service (no database)", () => {
  test("salted hashes, leading zeroes, and unique deterministic lookup", async () => {
    const a = await hashPin("0012");
    const b = await hashPin("0012");
    assert.notEqual(a, b);
    assert.equal(await verifyPin("0012", a), true);
    assert.equal(await verifyPin("12", a), false);
    assert.equal(await verifyPin("0012", "malformed"), false);
    assert.equal(
      pinLookup("0012", config.pinSecret),
      pinLookup("0012", config.pinSecret),
    );
    assert.notEqual(
      pinLookup("0012", config.pinSecret),
      pinLookup("12", config.pinSecret),
    );
  });
  test("login stores only token/CSRF digests and returns public user", async () => {
    const f = await fixture();
    const result = await f.auth.login("0012");
    assert.equal(result.user.id, 7);
    assert.equal(result.user.pin_hash, undefined);
    assert.equal(result.user.pin_lookup, undefined);
    assert.deepEqual(result.user.modulos, MODULES_BY_ROLE.Direccion);
    assert.equal(f.sessions.has(result.token), false);
    assert.equal(f.sessions.has(digest(result.token)), true);
    assert.equal(
      f.sessions.get(digest(result.token)).csrf_hash,
      digest(result.csrf),
    );
    assert.equal(f.calls[0].sql.includes("0012"), false);
    assert.notEqual(f.calls[0].params[0], "0012");
  });
  test("bad PIN and inactive employee rejected without creating sessions", async () => {
    const f = await fixture();
    await assert.rejects(f.auth.login("9999"), { status: 401 });
    f.employee.activo = false;
    await assert.rejects(f.auth.login("0012"), { status: 401 });
    await assert.rejects(f.auth.login(12), { status: 400 });
    assert.equal(f.sessions.size, 0);
  });
  test("CSRF, expiry, deactivation and logout enforced", async () => {
    const f = await fixture();
    const result = await f.auth.login("0012");
    await assert.rejects(f.auth.authenticate(undefined), { status: 401 });
    await assert.rejects(f.auth.authenticate(result.token, "wrong", true), {
      status: 403,
    });
    assert.equal(
      (await f.auth.authenticate(result.token, result.csrf, true)).id,
      7,
    );
    f.employee.grupo = "Produccion";
    assert.deepEqual((await f.auth.authenticate(result.token)).modulos, [
      "mantenimiento",
    ]);
    f.employee.activo = false;
    await assert.rejects(f.auth.authenticate(result.token), { status: 401 });
    f.employee.activo = true;
    f.sessions.get(digest(result.token)).expires = new Date(0);
    await assert.rejects(f.auth.authenticate(result.token), { status: 401 });
    await f.auth.logout(result.token);
    assert.equal(f.sessions.size, 0);
  });
  test("disabled database refuses login before SQL", async () => {
    const auth = createAuthService(
      { query: () => assert.fail("SQL must not run") },
      { ...config, databaseEnabled: false },
    );
    await assert.rejects(auth.login("0012"), { status: 503 });
  });
});

describe("HTTP authentication and module permissions (loopback, fake database)", () => {
  let f, server, base, cookie, csrf;
  before(async () => {
    f = await fixture();
    server = createApp({ auth: f.auth, config }).listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: config.origin },
      body: JSON.stringify({ pin: "0012" }),
    });
    assert.equal(response.status, 200);
    const cookies = response.headers.getSetCookie();
    assert.match(cookies[0], /HttpOnly/i);
    assert.match(cookies[0], /SameSite=Strict/i);
    cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    csrf = cookies
      .find((value) => value.startsWith("XSRF-TOKEN="))
      .split(";")[0]
      .slice("XSRF-TOKEN=".length);
  });
  after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  test("health never queries SQL", async () => {
    const count = f.calls.length;
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal(f.calls.length, count);
  });
  test("anonymous access is rejected and legacy endpoints are unavailable", async () => {
    assert.equal(
      (await fetch(`${base}/api/modulos/mantenimiento`)).status,
      401,
    );
    assert.equal((await fetch(`${base}/api/empleados`)).status, 404);
  });
  for (const [role, allowed] of Object.entries(MODULES_BY_ROLE)) {
    for (const module of [
      "administracion",
      "produccion",
      "mantenimiento",
      "comercial",
    ]) {
      test(`${role} -> ${module}`, async () => {
        f.employee.grupo = role;
        const response = await fetch(`${base}/api/modulos/${module}`, {
          headers: { Cookie: cookie },
        });
        assert.equal(response.status, allowed.includes(module) ? 200 : 403);
      });
    }
  }
  test("cross-origin mutation, invalid JSON and missing CSRF are rejected", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    assert.equal(
      (
        await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          headers: { ...headers, Origin: "https://other.example" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/auth/login`, {
          method: "POST",
          headers,
          body: "{broken",
        })
      ).status,
      400,
    );
  });
  test("logout invalidates session and clears cookie", async () => {
    const response = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie, "X-CSRF-Token": csrf },
    });
    assert.equal(response.status, 204);
    assert.match(
      response.headers.getSetCookie()[0],
      /Expires=Thu, 01 Jan 1970/i,
    );
    assert.equal(
      (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
        .status,
      401,
    );
  });
});

test("rate limiting resets after its window", () => {
  let time = 0,
    count = 0,
    status;
  const middleware = loginLimit({ max: 2, windowMs: 1000, now: () => time });
  const res = {
    set() {},
    status(code) {
      status = code;
      return this;
    },
    json() {},
  };
  const run = () => middleware({ ip: "test" }, res, () => count++);
  run();
  run();
  run();
  assert.equal(count, 2);
  assert.equal(status, 429);
  time = 1001;
  run();
  assert.equal(count, 3);
});

test("configuration defaults never enable a database or consume legacy variables", () => {
  const config = readConfig({
    DB_HOST: "legacy",
    DATABASE_URL: "postgres://legacy",
    PORT: "99",
  });
  assert.equal(config.databaseEnabled, false);
  assert.equal(config.databaseUrl, "");
  assert.equal(config.port, 3000);
  assert.throws(() => readConfig({ APP_DATABASE_ENABLED: "true" }));
  assert.throws(() => readConfig({ APP_ORIGIN: "http://localhost/path" }));
});

test("disabled adapter refuses SQL and connection requests without creating a pool", async () => {
  const { createDatabase } = require("../src/config/db");
  const db = createDatabase({
    databaseEnabled: false,
    databaseUrl: "not-a-connection",
  });
  assert.throws(() => db.query("SELECT 1"), { status: 503 });
  assert.throws(() => db.connect(), { status: 503 });
  await db.close();
});

test("unknown roles grant no module access, including inherited object names", () => {
  assert.deepEqual(allowedModules("Unknown"), []);
  assert.deepEqual(allowedModules("toString"), []);
  assert.deepEqual(allowedModules("__proto__"), []);
});
