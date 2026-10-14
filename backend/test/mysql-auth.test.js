const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createMysqlAuthService,
} = require("../src/services/mysql-auth.service");
const { readConfig } = require("../src/config/env");

const config = { databaseEnabled: true, production: false, sessionHours: 8 };
function fixture() {
  const state = {
    active: true,
    duplicate: false,
    time: 1000,
    role: "Direccion",
  };
  const row = () => ({
    id: 1,
    nombre: "Prueba",
    apellido: null,
    email: null,
    grupo: state.role,
  });
  const repository = {
    async findByPin(pin) {
      return pin === "0012" && state.active
        ? state.duplicate
          ? [row(), { ...row(), id: 2 }]
          : [row()]
        : [];
    },
    async findById(id) {
      return id === 1 && state.active ? row() : undefined;
    },
  };
  return {
    state,
    repository,
    auth: createMysqlAuthService(repository, config, () => state.time),
  };
}
test("legacy MySQL login preserves zeroes and returns only public identity", async () => {
  const f = fixture();
  await assert.rejects(f.auth.login("12"), { status: 401 });
  const result = await f.auth.login("0012");
  assert.equal(result.user.id, 1);
  assert.equal(result.user.pin, undefined);
  assert.deepEqual(result.user.modulos, [
    "administracion",
    "produccion",
    "mantenimiento",
    "comercial",
  ]);
});
test("duplicate PINs and invalid input are rejected", async () => {
  const f = fixture();
  f.state.duplicate = true;
  await assert.rejects(f.auth.login("0012"), { status: 409 });
  await assert.rejects(f.auth.login(12), { status: 400 });
});
test("MySQL sessions require CSRF, recheck current roles and inactive employees", async () => {
  const f = fixture();
  const login = await f.auth.login("0012");
  await assert.rejects(f.auth.authenticate(login.token, "incorrect", true), {
    status: 403,
  });
  f.state.role = "Produccion";
  assert.deepEqual(
    (await f.auth.authenticate(login.token, login.csrf, true)).modulos,
    ["mantenimiento"],
  );
  f.state.active = false;
  await assert.rejects(f.auth.authenticate(login.token), { status: 401 });
});
test("expiry, logout and process restart invalidate temporary sessions", async () => {
  const f = fixture();
  const first = await f.auth.login("0012");
  f.state.time += 9 * 3600000;
  await assert.rejects(f.auth.authenticate(first.token), { status: 401 });
  const second = await f.auth.login("0012");
  await f.auth.logout(second.token);
  await assert.rejects(f.auth.authenticate(second.token), { status: 401 });
  const third = await f.auth.login("0012");
  await assert.rejects(
    createMysqlAuthService(f.repository, config).authenticate(third.token),
    { status: 401 },
  );
});
test("MySQL provisional refuses production and non-local or different schemas", () => {
  assert.throws(() =>
    createMysqlAuthService({}, { ...config, production: true }),
  );
  const source = {
    APP_DATABASE_DRIVER: "mysql-local",
    APP_MYSQL_USER: "test",
    APP_MYSQL_DATABASE: "datos_climatic",
  };
  assert.equal(readConfig(source).mysql.host, "127.0.0.1");
  assert.throws(() =>
    readConfig({ ...source, APP_MYSQL_HOST: "remote.example" }),
  );
  assert.throws(() =>
    readConfig({ ...source, APP_MYSQL_DATABASE: "other_database" }),
  );
  assert.throws(() => readConfig({ ...source, APP_ENV: "production" }));
});
