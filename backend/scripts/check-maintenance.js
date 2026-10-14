// Opt-in integration check against local datos_climatic. All test data is rolled back.
// AUTO_INCREMENT sequences may contain gaps after rollback; no business rows remain.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { readConfig } = require("../src/config/env");
const { createApp } = require("../src/app");
const {
  createMaintenanceService,
} = require("../src/services/maintenance.service");

async function main() {
  const config = readConfig();
  if (
    !process.argv.includes("--rollback-local") ||
    config.databaseDriver !== "mysql-local" ||
    !["127.0.0.1", "localhost"].includes(config.mysql.host) ||
    config.mysql.database !== "datos_climatic"
  )
    throw Error("Requires --rollback-local and the authorized local database.");
  const connection = await mysql.createConnection({
    ...config.mysql,
    decimalNumbers: true,
    dateStrings: true,
  });
  let server;
  let savepoint = 0;
  let failSecondConsumption = false,
    consumptionInserts = 0;
  const db = {
    async query(sql, params = []) {
      if (
        failSecondConsumption &&
        sql.startsWith("INSERT INTO registro_tareas_repuestos") &&
        ++consumptionInserts === 2
      )
        throw new Error("Injected second-consumption failure");
      const [result] = await connection.execute(sql, params);
      return result;
    },
    async transaction(work) {
      const name = `check_${++savepoint}`;
      await connection.query(`SAVEPOINT ${name}`);
      try {
        const result = await work(db);
        await connection.query(`RELEASE SAVEPOINT ${name}`);
        return result;
      } catch (error) {
        await connection.query(`ROLLBACK TO SAVEPOINT ${name}`);
        throw error;
      }
    },
  };
  try {
    await connection.beginTransaction();
    const [employee] = await db.query(
      "SELECT id FROM empleados WHERE activo=TRUE LIMIT 1",
    );
    assert.ok(
      employee,
      "An active employee is needed for the isolated test session",
    );
    const auth = {
      authenticate: async () => ({ id: employee.id, grupo: "Direccion" }),
    };
    const maintenance = createMaintenanceService(db, config);
    server = createApp({ auth, config, maintenance }).listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, method = "GET", body, expected = 200) {
      const response = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${path}: ${JSON.stringify(result)}`,
      );
      return result;
    }
    const data = {
      nombre: "__PRUEBA_TRANSACCIONAL__",
      nombre_corto: "Prueba",
      potencia_instalada: 12.5,
      potencia_demandada: null,
      observaciones: null,
    };
    await request("/maquinas");
    const machine = await request("/maquinas", "POST", data, 201);
    assert.equal(machine.horas, 0);
    assert.equal(machine.status, "Activo");
    assert.ok(machine.fecha_alta);
    await request(
      `/maquinas/${machine.id}`,
      "PUT",
      { ...data, horas: 999 },
      400,
    );
    await request(`/maquinas/${machine.id}`, "PUT", {
      ...data,
      nombre: "__PRUEBA_EDITADA__",
    });
    await request("/maquinas/4294967295", "GET", undefined, 404);
    await request(`/maquinas/${machine.id}/horometro`, "PATCH", { horas: 50 });
    await request(
      `/maquinas/${machine.id}/horometro`,
      "PATCH",
      { horas: 20 },
      409,
    );
    await request(`/maquinas/${machine.id}/horometro`, "PATCH", {
      horas: 20,
      confirmar_reduccion: true,
      horas_esperadas: 50,
    });
    const inactive = await request(`/maquinas/${machine.id}/baja`, "PATCH", {});
    assert.equal(inactive.status, "No Activo");
    assert.ok(inactive.fecha_baja);
    await request(`/maquinas/${machine.id}`, "DELETE", undefined, 404);
    console.log(
      "Machines: list/create/update/deactivate/meter/validation endpoints passed.",
    );
    const providers = await request("/proveedores");
    const partData = {
      nombre: "__REPUESTO_PRUEBA__",
      maquina_id: machine.id,
      descripcion: null,
      observaciones: null,
      foto: null,
      prioritario: "Rojo",
      proveedores: providers.slice(0, 2).map((p) => p.id),
    };
    const part = await request("/repuestos", "POST", partData, 201);
    assert.equal(part.cantidad_actual, 0);
    assert.deepEqual(
      part.proveedores,
      partData.proveedores.slice().sort((a, b) => a - b),
    );
    await request(`/inventario/${part.id}/agregar-stock`, "PATCH", {
      cantidad: 10,
    });
    const stocked = await request(
      `/inventario/${part.id}/agregar-stock`,
      "PATCH",
      { cantidad: 3 },
    );
    assert.equal(stocked.cantidad_actual, 13);
    await request(
      `/inventario/${part.id}/agregar-stock`,
      "PATCH",
      { cantidad: -1 },
      400,
    );
    const minimum = await request(`/inventario/${part.id}/minimo`, "PATCH", {
      cantidad_minima: 5,
    });
    assert.equal(minimum.cantidad_actual, 13);
    assert.equal(minimum.cantidad_minima, 5);
    await request(
      `/repuestos/${part.id}`,
      "PUT",
      { ...partData, nombre: "Should rollback", proveedores: [4294967295] },
      409,
    );
    const unchanged = await request(`/repuestos/${part.id}`);
    assert.equal(unchanged.nombre, partData.nombre);
    assert.deepEqual(unchanged.proveedores, part.proveedores);
    await request(`/repuestos/${part.id}`, "DELETE", undefined, 409);
    console.log(
      "Parts/inventory: associations, rollback, additive stock, minimum and FK protection passed.",
    );
    const taskData = {
      nombre: "__TAREA_PRUEBA__",
      descripcion: "Definición de prueba",
      maquina_id: machine.id,
      horas_parada: 1.5,
      corte_tension: "Parcial",
    };
    const task = await request("/tareas", "POST", taskData, 201);
    assert.equal(task.maquina_nombre, "__PRUEBA_EDITADA__");
    await request(`/tareas/${task.id}`, "PUT", {
      ...taskData,
      corte_tension: "Si",
    });
    await request(
      `/tareas/${task.id}`,
      "PUT",
      { ...taskData, corte_tension: "invalido" },
      400,
    );
    for (const type of ["preventivos", "predictivos"]) {
      const plan = await request(
        `/planes/${type}`,
        "POST",
        { tarea_id: task.id, frecuencia: 100 },
        201,
      );
      assert.equal(plan.proximo_servicio, 120);
      await request(`/planes/${type}/${plan.id}`, "PUT", {
        tarea_id: task.id,
        frecuencia: 150,
      });
      await request(
        `/planes/${type}`,
        "POST",
        { tarea_id: task.id, frecuencia: 100 },
        409,
      );
      await request(`/tareas/${task.id}`, "DELETE", undefined, 409);
      await request(`/planes/${type}/${plan.id}`, "DELETE", undefined, 204);
    }
    await request(`/tareas/${task.id}`, "DELETE", undefined, 204);
    const extra = await request(
      "/tareas-extraordinarias",
      "POST",
      { nombre: "__EXTRA_PRUEBA__", descripcion: null },
      201,
    );
    await request(`/tareas-extraordinarias/${extra.id}`, "PUT", {
      nombre: "__EXTRA_EDITADA__",
      descripcion: "Prueba",
    });
    await request(
      `/tareas-extraordinarias/${extra.id}`,
      "DELETE",
      undefined,
      204,
    );
    console.log(
      "Extraordinary task definitions and both separate plan catalogs passed.",
    );
    console.log("Tasks: create/list/edit/delete and enum validation passed.");
    const workTask = await request("/tareas", "POST", taskData, 201);
    const otherMachine = await request(
      "/maquinas",
      "POST",
      { ...data, nombre: "__OTRA_MAQUINA__" },
      201,
    );
    const secondPart = await request(
      "/repuestos",
      "POST",
      { ...partData, nombre: "__SEGUNDO_REPUESTO__" },
      201,
    );
    await request(`/inventario/${secondPart.id}/agregar-stock`, "PATCH", {
      cantidad: 4,
    });
    const order = await request(
      "/ordenes-mantenimiento",
      "POST",
      { descripcion: "__ORDEN_PRUEBA__", maquina_id: machine.id },
      201,
    );
    assert.equal(order.empleado_id, employee.id);
    assert.equal(order.activo, 1);
    assert.equal(order.fecha_cierre, null);
    await request(
      "/ordenes-mantenimiento",
      "POST",
      { descripcion: "Spoof", maquina_id: machine.id, empleado_id: 4294967295 },
      400,
    );
    await request(`/ordenes-mantenimiento/${order.id}`, "PUT", {
      descripcion: "__ORDEN_EDITADA__",
      maquina_id: machine.id,
    });
    const badOrder = await request(
      "/ordenes-mantenimiento",
      "POST",
      { descripcion: "__OTRA_ORDEN__", maquina_id: otherMachine.id },
      201,
    );
    const work = {
      tarea_id: workTask.id,
      medicion_horometro: 30,
      duracion_inicio: "2026-10-14T08:00",
      duracion_fin: "2026-10-14T09:00",
      orden_mantenimiento_id: order.id,
      horas_esperadas: 20,
      confirmar_reduccion: false,
      repuestos: [
        { repuesto_id: part.id, cantidad: 2 },
        { repuesto_id: secondPart.id, cantidad: 1 },
      ],
    };
    const [{ total: countBefore }] = await db.query(
      "SELECT COUNT(*) AS total FROM registro_tareas",
    );
    failSecondConsumption = true;
    await request("/registros", "POST", work, 500);
    failSecondConsumption = false;
    assert.equal((await request(`/repuestos/${part.id}`)).cantidad_actual, 13);
    assert.equal((await request(`/maquinas/${machine.id}`)).horas, 20);
    assert.equal(
      (await db.query("SELECT COUNT(*) AS total FROM registro_tareas"))[0]
        .total,
      countBefore,
    );
    await request(
      "/registros",
      "POST",
      { ...work, repuestos: [{ repuesto_id: part.id, cantidad: 999 }] },
      409,
    );
    await request(
      "/registros",
      "POST",
      { ...work, operario_id: 4294967295 },
      400,
    );
    await request(
      "/registros",
      "POST",
      { ...work, orden_mantenimiento_id: badOrder.id },
      409,
    );
    await request(
      "/registros",
      "POST",
      { ...work, duracion_fin: "2026-10-14T07:00" },
      400,
    );
    await request(
      "/registros",
      "POST",
      { ...work, repuestos: [work.repuestos[0], work.repuestos[0]] },
      400,
    );
    const execution = await request("/registros", "POST", work, 201);
    assert.equal(execution.operario_id, employee.id);
    assert.equal(execution.maquina_id, machine.id);
    assert.equal(execution.origen, "Mantenimiento");
    assert.equal(execution.repuestos.length, 2);
    assert.equal((await request(`/repuestos/${part.id}`)).cantidad_actual, 11);
    assert.equal(
      (await request(`/repuestos/${secondPart.id}`)).cantidad_actual,
      3,
    );
    assert.equal((await request(`/maquinas/${machine.id}`)).horas, 30);
    assert.equal(
      (await request(`/registros/${execution.id}`)).repuestos[0].cantidad > 0,
      true,
    );
    await request("/registros");
    await request(`/registros/${execution.id}`, "DELETE", undefined, 404);
    await request(
      `/registros/${execution.id}`,
      "PUT",
      { medicion_horometro: 99 },
      404,
    );
    await request(
      `/tareas/${workTask.id}`,
      "PUT",
      { ...taskData, maquina_id: otherMachine.id },
      409,
    );
    await request(`/tareas/${workTask.id}`, "DELETE", undefined, 409);
    await request(
      `/repuestos/${part.id}`,
      "PUT",
      { ...partData, maquina_id: otherMachine.id },
      409,
    );
    await request(
      `/ordenes-mantenimiento/${order.id}`,
      "PUT",
      { descripcion: "__ORDEN_EDITADA__", maquina_id: otherMachine.id },
      409,
    );
    const closed = await request(
      `/ordenes-mantenimiento/${order.id}/cerrar`,
      "PATCH",
      {},
    );
    assert.equal(closed.activo, 0);
    assert.ok(closed.fecha_cierre);
    await request(
      `/ordenes-mantenimiento/${order.id}/cerrar`,
      "PATCH",
      {},
      409,
    );
    await request(
      `/ordenes-mantenimiento/${order.id}`,
      "DELETE",
      undefined,
      404,
    );
    console.log(
      "Orders/history/execution: identity, compatibility, stock, triggers, late-failure rollback and historical protection passed.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await connection.rollback();
    await connection.end();
    console.log("ROLLBACK completed; no test records saved.");
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
