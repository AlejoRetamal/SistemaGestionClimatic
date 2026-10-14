const v = require("./validation");
const select = `SELECT r.id, r.nombre, r.maquina_id, m.nombre AS maquina_nombre, r.descripcion, r.observaciones, r.foto, r.prioritario,
 COALESCE(i.cantidad_actual,0) AS cantidad_actual, COALESCE(i.cantidad_minima,0) AS cantidad_minima
 FROM repuestos r JOIN maquinas m ON m.id=r.maquina_id LEFT JOIN inventario i ON i.repuesto_id=r.id`;
function partData(input) {
  const b = v.body(input, [
    "nombre",
    "maquina_id",
    "descripcion",
    "observaciones",
    "foto",
    "prioritario",
    "proveedores",
  ]);
  if (!Array.isArray(b.proveedores) || b.proveedores.length > 200)
    throw v.fail(400, "Seleccioná una lista válida de proveedores.");
  const providers = b.proveedores.map((value) => v.id(value, "Proveedor"));
  if (new Set(providers).size !== providers.length)
    throw v.fail(400, "No repitas proveedores.");
  return {
    values: [
      v.text(b.nombre, "Nombre", 150, true),
      v.id(b.maquina_id, "Máquina"),
      v.text(b.descripcion, "Descripción", 10000),
      v.text(b.observaciones, "Observaciones", 10000),
      v.text(b.foto, "Foto", 500),
      v.option(b.prioritario, ["Rojo", "Amarillo", "Verde"], "Prioridad", true),
    ],
    providers,
  };
}
function createRepuestosService(db) {
  const get = async (rawId, connection = db) => {
    const id = v.id(rawId);
    const row = await v.one(
      connection,
      select + " WHERE r.id=?",
      [id],
      "No se encontró el repuesto.",
    );
    row.proveedores = (
      await connection.query(
        "SELECT proveedor_id FROM repuestos_proveedores WHERE repuesto_id=? ORDER BY proveedor_id",
        [id],
      )
    ).map((p) => p.proveedor_id);
    return row;
  };
  async function associations(tx, id, providers) {
    await tx.query("DELETE FROM repuestos_proveedores WHERE repuesto_id=?", [
      id,
    ]);
    for (const provider of providers)
      await tx.query(
        "INSERT INTO repuestos_proveedores (repuesto_id,proveedor_id) VALUES (?,?)",
        [id, provider],
      );
  }
  async function lock(tx, id) {
    return v.one(
      tx,
      "SELECT id,maquina_id FROM repuestos WHERE id=? FOR UPDATE",
      [id],
      "No se encontró el repuesto.",
    );
  }
  return {
    list: (machineId) =>
      db.query(
        select +
          (machineId === undefined ? "" : " WHERE r.maquina_id=?") +
          " ORDER BY r.nombre,r.id",
        machineId === undefined ? [] : [v.id(machineId, "Máquina")],
      ),
    get,
    providers: () =>
      db.query("SELECT id,nombre FROM proveedores ORDER BY nombre,id"),
    async create(input) {
      const data = partData(input);
      return db.transaction(async (tx) => {
        const result = await tx.insert(
          "INSERT INTO repuestos (nombre,maquina_id,descripcion,observaciones,foto,prioritario) VALUES (?,?,?,?,?,?)",
          data.values,
        );
        await tx.query("INSERT INTO inventario (repuesto_id) VALUES (?)", [
          result.insertId,
        ]);
        await associations(tx, result.insertId, data.providers);
        return get(result.insertId, tx);
      });
    },
    async update(rawId, input) {
      const id = v.id(rawId);
      const data = partData(input);
      return db.transaction(async (tx) => {
        const part = await lock(tx, id);
        if (part.maquina_id !== data.values[1]) {
          const history = await tx.query(
            "SELECT id FROM registro_tareas_repuestos WHERE repuesto_id=? LIMIT 1",
            [id],
          );
          if (history.length)
            throw v.fail(
              409,
              "No se puede cambiar la máquina de un repuesto que ya tiene consumos registrados.",
            );
        }
        await tx.query(
          "UPDATE repuestos SET nombre=?,maquina_id=?,descripcion=?,observaciones=?,foto=?,prioritario=? WHERE id=?",
          [...data.values, id],
        );
        await associations(tx, id, data.providers);
        return get(id, tx);
      });
    },
    async remove(rawId) {
      const id = v.id(rawId);
      try {
        const result = await db.query("DELETE FROM repuestos WHERE id=?", [id]);
        if (!result.affectedRows)
          throw v.fail(404, "No se encontró el repuesto.");
      } catch (error) {
        if (["ER_ROW_IS_REFERENCED_2", "23503", "23001"].includes(error.code))
          throw v.fail(
            409,
            "No se puede eliminar el repuesto porque tiene inventario o consumos asociados.",
          );
        throw error;
      }
    },
    async stock(rawId, input, minimum = false) {
      const id = v.id(rawId, "Repuesto");
      const b = v.body(input, minimum ? ["cantidad_minima"] : ["cantidad"]);
      const quantity = v.number(
        minimum ? b.cantidad_minima : b.cantidad,
        minimum ? "Cantidad mínima" : "Cantidad ingresada",
        { positive: !minimum },
      );
      return db.transaction(async (tx) => {
        await lock(tx, id);
        await tx.ensureInventory(id);
        const inventory = await v.one(
          tx,
          "SELECT cantidad_actual FROM inventario WHERE repuesto_id=? FOR UPDATE",
          [id],
          "No se encontró el inventario.",
        );
        if (!minimum && inventory.cantidad_actual + quantity > 9999999999.99)
          throw v.fail(400, "La entrada supera el máximo de stock permitido.");
        await tx.query(
          minimum
            ? "UPDATE inventario SET cantidad_minima=? WHERE repuesto_id=?"
            : "UPDATE inventario SET cantidad_actual=cantidad_actual+? WHERE repuesto_id=?",
          [quantity, id],
        );
        return get(id, tx);
      });
    },
  };
}
module.exports = { createRepuestosService };
