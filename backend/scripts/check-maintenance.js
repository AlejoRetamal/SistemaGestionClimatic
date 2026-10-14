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
    insert(sql, params) {
      return this.query(sql, params);
    },
    ensureInventory(id) {
      return this.query(
        "INSERT INTO inventario (repuesto_id) VALUES (?) ON DUPLICATE KEY UPDATE repuesto_id=VALUES(repuesto_id)",
        [id],
      );
    },
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
    await require("./lib/maintenance-scenarios").maintenanceScenarios({
      request,
      db,
      employee,
      setFailure(value) {
        failSecondConsumption = value;
        consumptionInserts = 0;
      },
    });
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
