const v = require("./validation");
function data(input) {
  const b = v.body(input, ["nombre", "descripcion"]);
  return [
    v.text(b.nombre, "Nombre", 150, true),
    v.text(b.descripcion, "Descripción", 10000),
  ];
}
function createExtraordinariasService(db) {
  const get = (id, tx = db) =>
    v.one(
      tx,
      "SELECT id,nombre,descripcion FROM tareas_extraordinarias WHERE id=?",
      [v.id(id)],
      "No se encontró la tarea extraordinaria.",
    );
  return {
    list: () =>
      db.query(
        "SELECT id,nombre,descripcion FROM tareas_extraordinarias ORDER BY nombre,id",
      ),
    get,
    async create(input) {
      const result = await db.query(
        "INSERT INTO tareas_extraordinarias (nombre,descripcion) VALUES (?,?)",
        data(input),
      );
      return get(result.insertId);
    },
    async update(rawId, input) {
      const id = v.id(rawId),
        values = data(input);
      return db.transaction(async (tx) => {
        await v.one(
          tx,
          "SELECT id FROM tareas_extraordinarias WHERE id=? FOR UPDATE",
          [id],
          "No se encontró la tarea extraordinaria.",
        );
        await tx.query(
          "UPDATE tareas_extraordinarias SET nombre=?,descripcion=? WHERE id=?",
          [...values, id],
        );
        return get(id, tx);
      });
    },
    async remove(rawId) {
      const result = await db.query(
        "DELETE FROM tareas_extraordinarias WHERE id=?",
        [v.id(rawId)],
      );
      if (!result.affectedRows)
        throw v.fail(404, "No se encontró la tarea extraordinaria.");
    },
  };
}
module.exports = { createExtraordinariasService };
