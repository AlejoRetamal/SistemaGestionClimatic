const v = require("./validation");
const columns =
  "id, nombre, nombre_corto, potencia_instalada, potencia_demandada, horas, fecha_alta, status, fecha_baja, observaciones";
function machineData(input) {
  const data = v.body(input, [
    "nombre",
    "nombre_corto",
    "potencia_instalada",
    "potencia_demandada",
    "observaciones",
  ]);
  return [
    v.text(data.nombre, "Nombre", 150, true),
    v.text(data.nombre_corto, "Nombre corto", 50),
    v.number(data.potencia_instalada, "Potencia instalada", {
      optional: true,
      max: 99999999.99,
    }),
    v.number(data.potencia_demandada, "Potencia demandada", {
      optional: true,
      max: 99999999.99,
    }),
    v.text(data.observaciones, "Observaciones", 10000),
  ];
}
function createMaquinasService(db) {
  const get = (rawId, connection = db, lock = false) =>
    v.one(
      connection,
      `SELECT ${columns} FROM maquinas WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
      [v.id(rawId)],
      "No se encontró la máquina.",
    );
  return {
    list: () => db.query(`SELECT ${columns} FROM maquinas ORDER BY nombre, id`),
    get,
    async create(input) {
      const data = machineData(input);
      const result = await db.insert(
        "INSERT INTO maquinas (nombre, nombre_corto, potencia_instalada, potencia_demandada, observaciones) VALUES (?, ?, ?, ?, ?)",
        data,
      );
      return get(result.insertId);
    },
    async update(rawId, input) {
      const data = machineData(input);
      const id = v.id(rawId);
      return db.transaction(async (tx) => {
        await get(id, tx, true);
        await tx.query(
          "UPDATE maquinas SET nombre=?, nombre_corto=?, potencia_instalada=?, potencia_demandada=?, observaciones=? WHERE id=?",
          [...data, id],
        );
        return get(id, tx);
      });
    },
    async deactivate(rawId) {
      const id = v.id(rawId);
      return db.transaction(async (tx) => {
        const machine = await get(id, tx, true);
        if (machine.status !== "Activo")
          throw v.fail(409, "La máquina ya está dada de baja.");
        // Existing trigger sets fecha_baja.
        await tx.query("UPDATE maquinas SET status='No Activo' WHERE id=?", [
          id,
        ]);
        return get(id, tx);
      });
    },
    async meter(rawId, input) {
      const data = v.body(input, [
        "horas",
        "confirmar_reduccion",
        "horas_esperadas",
      ]);
      const hours = v.number(data.horas, "Horómetro");
      const id = v.id(rawId);
      return db.transaction(async (tx) => {
        const machine = await get(id, tx, true);
        if (
          hours < machine.horas &&
          !(
            data.confirmar_reduccion === true &&
            data.horas_esperadas === machine.horas
          )
        ) {
          throw v.fail(
            409,
            "La lectura es menor que la actual. Recargá la máquina y confirmá la corrección.",
          );
        }
        if (
          data.horas_esperadas !== undefined &&
          data.horas_esperadas !== machine.horas
        )
          throw v.fail(
            409,
            "El horómetro cambió desde que abriste la pantalla. Recargá e intentá nuevamente.",
          );
        await tx.query("UPDATE maquinas SET horas=? WHERE id=?", [hours, id]);
        return get(id, tx);
      });
    },
  };
}
module.exports = { createMaquinasService, machineData };
