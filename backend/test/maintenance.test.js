const { test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/services/validation");
const {
  executionData,
  localDate,
} = require("../src/services/registros.service");
const { createApp } = require("../src/app");
test("numeric and identifier validation rejects coercions and precision loss", () => {
  for (const invalid of [true, [], [1], 0, -1, "1 OR 1=1", "1.2", 4294967296])
    assert.throws(() => v.id(invalid), { status: 400 });
  for (const invalid of [
    true,
    "2",
    null,
    Infinity,
    NaN,
    -1,
    0.000001,
    1.001,
    10000000000,
  ])
    assert.throws(() => v.number(invalid, "Cantidad"), { status: 400 });
  assert.equal(v.number(0, "Cantidad"), 0);
  assert.equal(v.number(1.25, "Cantidad"), 1.25);
  assert.equal(v.id("12"), 12);
});
test("local execution dates validate calendar values without timezone conversion", () => {
  assert.equal(localDate("2026-10-14T08:30", "Inicio"), "2026-10-14 08:30:00");
  assert.throws(() => localDate("2026-02-30T08:30", "Inicio"), { status: 400 });
  assert.throws(() => localDate("2026-10-14T25:30", "Inicio"), { status: 400 });
  assert.throws(() => localDate("2026-10-14T08:30:00Z", "Inicio"), {
    status: 400,
  });
});
test("execution rejects identity/machine overrides, duplicate parts and invalid duration", () => {
  const data = {
    tarea_id: 1,
    medicion_horometro: 10,
    duracion_inicio: "2026-10-14T08:00",
    duracion_fin: "2026-10-14T09:00",
    repuestos: [],
  };
  for (const field of [
    "operario_id",
    "maquina_id",
    "origen",
    "tarea_extraordinaria_id",
  ])
    assert.throws(() => executionData({ ...data, [field]: 1 }), {
      status: 400,
    });
  assert.throws(
    () =>
      executionData({
        ...data,
        repuestos: [
          { repuesto_id: 1, cantidad: 1 },
          { repuesto_id: 1, cantidad: 2 },
        ],
      }),
    { status: 400 },
  );
  assert.throws(
    () => executionData({ ...data, duracion_fin: "2026-10-14T07:00" }),
    { status: 400 },
  );
});
test("all operational routes enforce authentication, role and CSRF before services", async () => {
  let calls = 0;
  const service = {
    list: async () => {
      calls++;
      return [];
    },
    get: async () => ({ id: 1 }),
    create: async () => ({ id: 1 }),
    update: async () => ({ id: 1 }),
    remove: async () => {},
    deactivate: async () => ({ id: 1 }),
    meter: async () => ({ id: 1 }),
    providers: async () => [],
    stock: async () => ({ id: 1 }),
    close: async () => ({ id: 1 }),
  };
  const auth = {
    authenticate: async (token, csrf, mutating) => {
      if (!token) throw v.fail(401, "Login required");
      if (mutating && csrf !== "valid") throw v.fail(403, "CSRF");
      return {
        id: 1,
        grupo: token === "admin" ? "Administracion" : "Produccion",
      };
    },
  };
  const config = { origin: "http://localhost:4200", databaseEnabled: false };
  const maintenance = {
    maquinas: service,
    repuestos: service,
    tareas: service,
    extraordinarias: service,
    preventivos: service,
    predictivos: service,
    ordenes: service,
    registros: service,
  };
  const server = createApp({ auth, config, maintenance }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of [
      "/maquinas",
      "/repuestos",
      "/inventario",
      "/proveedores",
      "/tareas",
      "/tareas-extraordinarias",
      "/planes/preventivos",
      "/planes/predictivos",
      "/ordenes-mantenimiento",
      "/registros",
    ]) {
      assert.equal((await fetch(base + path)).status, 401);
      assert.equal(
        (
          await fetch(base + path, {
            headers: { Cookie: "climatic_session=admin" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(base + path, {
            headers: { Cookie: "climatic_session=production" },
          })
        ).status,
        200,
      );
    }
    assert.equal(
      (
        await fetch(base + "/modulos/administracion", {
          headers: { Cookie: "climatic_session=admin" },
        })
      ).status,
      200,
      "maintenance routers must not intercept other modules",
    );
    const before = calls;
    for (const [path, method] of [
      ["/maquinas", "POST"],
      ["/maquinas/1/baja", "PATCH"],
      ["/maquinas/1/horometro", "PATCH"],
      ["/inventario/1/agregar-stock", "PATCH"],
      ["/tareas/1", "DELETE"],
      ["/registros", "POST"],
      ["/ordenes-mantenimiento/1/cerrar", "PATCH"],
    ]) {
      assert.equal(
        (
          await fetch(base + path, {
            method,
            headers: { Cookie: "climatic_session=production" },
          })
        ).status,
        403,
      );
    }
    assert.equal(calls, before);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
