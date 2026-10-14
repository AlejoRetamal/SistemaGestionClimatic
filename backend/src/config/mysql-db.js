const mysql = require("mysql2/promise");

// Operational MySQL access. Authentication retains its separate read-only repository.
function createMysqlDatabase(config) {
  let pool;
  function getPool() {
    if (!config.databaseEnabled || config.databaseDriver !== "mysql-local") {
      throw Object.assign(new Error("La base MySQL no está habilitada."), {
        status: 503,
      });
    }
    pool ||= mysql.createPool({
      ...config.mysql,
      connectionLimit: 5,
      connectTimeout: 5000,
      decimalNumbers: true,
      dateStrings: true,
    });
    return pool;
  }
  return {
    insert(sql, params) {
      return this.query(sql, params);
    },
    async query(sql, params = []) {
      const [rows] = await getPool().execute(sql, params);
      return rows;
    },
    async transaction(work) {
      const connection = await getPool().getConnection();
      const tx = {
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
          const [rows] = await connection.execute(sql, params);
          return rows;
        },
      };
      try {
        await connection.beginTransaction();
        const result = await work(tx);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    close: () => (pool ? pool.end() : Promise.resolve()),
  };
}
module.exports = { createMysqlDatabase };
