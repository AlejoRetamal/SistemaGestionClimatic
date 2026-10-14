const { readConfig } = require("./config/env");
const { createDatabase } = require("./config/db");
const { createAuthService } = require("./services/auth.service");
const { createApp } = require("./app");
const {
  createMysqlEmployeeRepository,
} = require("./services/mysql-employee.repository");
const { createMysqlAuthService } = require("./services/mysql-auth.service");
const { createMysqlDatabase } = require("./config/mysql-db");
const { createPostgresOperations } = require("./config/postgres-operations");
const { createMaintenanceService } = require("./services/maintenance.service");
const { postgresLoginLimit } = require("./middlewares/postgres-login-limit");

function createRuntime(config = readConfig()) {
  const mysqlLocal = config.databaseDriver === "mysql-local";
  const db = mysqlLocal
    ? createMysqlEmployeeRepository(config)
    : createDatabase(config);
  const auth = mysqlLocal
    ? createMysqlAuthService(db, config)
    : createAuthService(db, config);
  const operationsDb = mysqlLocal
    ? createMysqlDatabase(config)
    : createPostgresOperations(db);
  const maintenance = createMaintenanceService(operationsDb, config);
  const loginLimiter =
    config.production && !mysqlLocal
      ? postgresLoginLimit(db, config)
      : undefined;
  const app = createApp({ config, auth, maintenance, loginLimiter });
  return {
    app,
    config,
    async close() {
      await operationsDb.close();
      await db.close();
    },
  };
}
module.exports = { createRuntime };
