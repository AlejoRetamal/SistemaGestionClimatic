const { readConfig } = require("./config/env");
const { createDatabase } = require("./config/db");
const { createAuthService } = require("./services/auth.service");
const { createApp } = require("./app");
const {
  createMysqlEmployeeRepository,
} = require("./services/mysql-employee.repository");
const { createMysqlAuthService } = require("./services/mysql-auth.service");
const { createMysqlDatabase } = require("./config/mysql-db");
const { createMaintenanceService } = require("./services/maintenance.service");
const config = readConfig();
const mysqlLocal = config.databaseDriver === "mysql-local";
const db = mysqlLocal
  ? createMysqlEmployeeRepository(config)
  : createDatabase(config);
const auth = mysqlLocal
  ? createMysqlAuthService(db, config)
  : createAuthService(db, config);
const operationsDb = mysqlLocal ? createMysqlDatabase(config) : null;
const maintenance = operationsDb
  ? createMaintenanceService(operationsDb, config)
  : null;
const app = createApp({ config, auth, maintenance });
const server = app.listen(config.port, config.host, () => {
  console.log(
    `Climatic API en http://${config.host}:${config.port}. ${config.databaseDriver} ${config.databaseEnabled ? "habilitado explícitamente" : "deshabilitado"}.`,
  );
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () =>
    server.close(async () => {
      await db.close();
      if (operationsDb) await operationsDb.close();
      process.exit(0);
    }),
  );
}
