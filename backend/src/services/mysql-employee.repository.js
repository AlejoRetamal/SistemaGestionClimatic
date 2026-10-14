const mysql = require("mysql2/promise");

function createMysqlEmployeeRepository(config) {
  let pool;
  async function read(sql, params) {
    if (!config.databaseEnabled)
      throw Object.assign(new Error("Base de datos deshabilitada."), {
        status: 503,
      });
    pool ||= mysql.createPool({
      ...config.mysql,
      connectionLimit: 5,
      connectTimeout: 5000,
    });
    const connection = await pool.getConnection();
    try {
      // Every query runs in a read-only transaction: no migrations or table changes.
      await connection.query("START TRANSACTION READ ONLY");
      const [rows] = await connection.execute(sql, params);
      await connection.commit();
      return rows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  const columns = "id, nombre, apellido, email, grupo";
  return {
    findByPin: (pin) =>
      read(
        `SELECT ${columns} FROM empleados WHERE CAST(pin AS CHAR) = ? AND activo = TRUE LIMIT 2`,
        [pin],
      ),
    async findById(id) {
      const rows = await read(
        `SELECT ${columns} FROM empleados WHERE id = ? AND activo = TRUE`,
        [id],
      );
      return rows[0];
    },
    close: () => (pool ? pool.end() : Promise.resolve()),
  };
}
module.exports = { createMysqlEmployeeRepository };
