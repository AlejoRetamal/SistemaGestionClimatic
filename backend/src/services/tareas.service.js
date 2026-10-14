const v = require("./validation");
const select =
  "SELECT t.id,t.nombre,t.descripcion,t.maquina_id,m.nombre AS maquina_nombre,t.horas_parada,t.corte_tension FROM tareas t JOIN maquinas m ON m.id=t.maquina_id";
function taskData(input) {
  const b = v.body(input, [
    "nombre",
    "descripcion",
    "maquina_id",
    "horas_parada",
    "corte_tension",
  ]);
  return [
    v.text(b.nombre, "Nombre", 150, true),
    v.text(b.descripcion, "Descripción", 10000),
    v.id(b.maquina_id, "Máquina"),
    v.number(b.horas_parada, "Horas de parada", {
      optional: true,
      max: 9999.99,
    }),
    v.option(
      b.corte_tension,
      ["Si", "No", "Total", "Parcial"],
      "Corte de tensión",
      true,
    ),
  ];
}
function createTareasService(db) {
  const get = (id, tx = db) =>
    v.one(tx, select + " WHERE t.id=?", [v.id(id)], "No se encontró la tarea.");
  return {
    list: () => db.query(select + " ORDER BY t.nombre,t.id"),
    get,
    async create(input) {
      const result = await db.insert(
        "INSERT INTO tareas (nombre,descripcion,maquina_id,horas_parada,corte_tension) VALUES (?,?,?,?,?)",
        taskData(input),
      );
      return get(result.insertId);
    },
    async update(rawId, input) {
      const id = v.id(rawId),
        data = taskData(input);
      return db.transaction(async (tx) => {
        const row = await v.one(
          tx,
          "SELECT id,maquina_id FROM tareas WHERE id=? FOR UPDATE",
          [id],
          "No se encontró la tarea.",
        );
        if (
          row.maquina_id !== data[2] &&
          (
            await tx.query(
              "SELECT id FROM registro_tareas WHERE tarea_id=? LIMIT 1",
              [id],
            )
          ).length
        )
          throw v.fail(
            409,
            "No se puede cambiar la máquina de una tarea con trabajos registrados: alteraría su historial.",
          );
        await tx.query(
          "UPDATE tareas SET nombre=?,descripcion=?,maquina_id=?,horas_parada=?,corte_tension=? WHERE id=?",
          [...data, id],
        );
        return get(id, tx);
      });
    },
    async remove(rawId) {
      try {
        const result = await db.query("DELETE FROM tareas WHERE id=?", [
          v.id(rawId),
        ]);
        if (!result.affectedRows) throw v.fail(404, "No se encontró la tarea.");
      } catch (error) {
        if (["ER_ROW_IS_REFERENCED_2", "23503", "23001"].includes(error.code))
          throw v.fail(
            409,
            "No se puede eliminar esta tarea porque ya tiene registros o planes asociados.",
          );
        throw error;
      }
    },
  };
}
module.exports = { createTareasService };
