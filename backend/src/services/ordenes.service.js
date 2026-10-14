const v = require("./validation");
const select = `SELECT o.id,o.fecha_creacion,o.empleado_id,CONCAT_WS(' ',e.nombre,e.apellido) AS empleado_nombre,o.descripcion,o.maquina_id,m.nombre AS maquina_nombre,o.activo,o.fecha_cierre FROM ordenes_mantenimiento o JOIN empleados e ON e.id=o.empleado_id JOIN maquinas m ON m.id=o.maquina_id`;
function orderData(input) {
  const b = v.body(input, ["descripcion", "maquina_id"]);
  return [
    v.text(b.descripcion, "Descripción", 10000, true),
    v.id(b.maquina_id, "Máquina"),
  ];
}
function createOrdenesService(db) {
  const get = (rawId, tx = db) =>
    v.one(
      tx,
      select + " WHERE o.id=?",
      [v.id(rawId)],
      "No se encontró la orden.",
    );
  const lock = (id, tx) =>
    v.one(
      tx,
      "SELECT id,activo,maquina_id FROM ordenes_mantenimiento WHERE id=? FOR UPDATE",
      [id],
      "No se encontró la orden.",
    );
  return {
    list: () => db.query(select + " ORDER BY o.fecha_creacion DESC,o.id DESC"),
    get,
    async create(input, user) {
      const values = orderData(input);
      const result = await db.query(
        "INSERT INTO ordenes_mantenimiento (descripcion,maquina_id,empleado_id) VALUES (?,?,?)",
        [...values, v.id(user.id, "Empleado")],
      );
      return get(result.insertId);
    },
    async update(rawId, input) {
      const id = v.id(rawId),
        values = orderData(input);
      return db.transaction(async (tx) => {
        const row = await lock(id, tx);
        if (!row.activo)
          throw v.fail(409, "La orden está cerrada y no puede editarse.");
        if (
          row.maquina_id !== values[1] &&
          (
            await tx.query(
              "SELECT id FROM registro_tareas WHERE orden_mantenimiento_id=? LIMIT 1",
              [id],
            )
          ).length
        )
          throw v.fail(
            409,
            "La orden tiene trabajos registrados; no se puede cambiar su máquina.",
          );
        await tx.query(
          "UPDATE ordenes_mantenimiento SET descripcion=?,maquina_id=? WHERE id=?",
          [...values, id],
        );
        return get(id, tx);
      });
    },
    async close(rawId) {
      const id = v.id(rawId);
      return db.transaction(async (tx) => {
        const row = await lock(id, tx);
        if (!row.activo) throw v.fail(409, "La orden ya está cerrada.");
        await tx.query(
          "UPDATE ordenes_mantenimiento SET activo=FALSE WHERE id=?",
          [id],
        );
        return get(id, tx);
      });
    },
  };
}
module.exports = { createOrdenesService };
