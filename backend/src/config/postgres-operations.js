// The maintenance services use positional ? parameters. Only application-owned SQL
// reaches this adapter; values always travel separately through pg parameters.
function parameters(sql, values) {
  let index = 0;
  const text = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, (token) =>
    token === "?" ? `$${++index}` : token,
  );
  if (index !== values.length) throw new Error("Incorrect SQL parameter count");
  return text;
}

function postgresConnection(client) {
  return {
    async query(sql, values = []) {
      const result = await client.query(parameters(sql, values), values);
      return result.command === "SELECT"
        ? result.rows
        : { affectedRows: result.rowCount };
    },
    async insert(sql, values = []) {
      const result = await client.query(
        parameters(sql, values) + " RETURNING id",
        values,
      );
      return { insertId: result.rows[0].id, affectedRows: result.rowCount };
    },
    async ensureInventory(id) {
      await client.query(
        "INSERT INTO inventario (repuesto_id) VALUES ($1) ON CONFLICT (repuesto_id) DO NOTHING",
        [id],
      );
    },
  };
}

function createPostgresOperations(db) {
  return {
    ...postgresConnection(db),
    async transaction(work) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await work(postgresConnection(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    // The authentication and maintenance adapters share the same pool.
    close: async () => {},
  };
}
module.exports = { createPostgresOperations, postgresConnection, parameters };
