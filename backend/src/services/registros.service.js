const v = require("./validation");
const select = `SELECT rt.id,COALESCE(rt.duracion_fin,rt.duracion_inicio) AS fecha,rt.operario_id,CONCAT_WS(' ',e.nombre,e.apellido) AS operario_nombre,
 rt.tarea_id,t.nombre AS tarea_nombre,t.maquina_id,m.nombre AS maquina_nombre,rt.origen,rt.medicion_horometro,rt.duracion_inicio,rt.duracion_fin,
 rt.orden_mantenimiento_id,o.descripcion AS orden_descripcion
 FROM registro_tareas rt JOIN empleados e ON e.id=rt.operario_id JOIN tareas t ON t.id=rt.tarea_id
 JOIN maquinas m ON m.id=t.maquina_id LEFT JOIN ordenes_mantenimiento o ON o.id=rt.orden_mantenimiento_id`;
function localDate(value, label) {
  if (typeof value !== "string") throw v.fail(400, `${label} es obligatorio.`);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw v.fail(400, `${label} tiene un formato inválido.`);
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part || 0));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    year < 1000 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  )
    throw v.fail(400, `${label} no es una fecha válida.`);
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6] || "00"}`;
}
function executionData(input) {
  const b = v.body(input, [
    "tarea_id",
    "medicion_horometro",
    "duracion_inicio",
    "duracion_fin",
    "orden_mantenimiento_id",
    "repuestos",
    "confirmar_reduccion",
    "horas_esperadas",
  ]);
  const start = localDate(b.duracion_inicio, "Inicio"),
    end = localDate(b.duracion_fin, "Fin");
  if (end < start)
    throw v.fail(400, "La hora de fin no puede ser anterior al inicio.");
  if (!Array.isArray(b.repuestos) || b.repuestos.length > 100)
    throw v.fail(400, "La lista de repuestos no es válida (máximo 100).");
  const parts = b.repuestos
    .map((inputPart) => {
      const part = v.body(inputPart, ["repuesto_id", "cantidad"]);
      return {
        id: v.id(part.repuesto_id, "Repuesto"),
        quantity: v.number(part.cantidad, "Cantidad utilizada", {
          positive: true,
        }),
      };
    })
    .sort((a, b) => a.id - b.id);
  if (new Set(parts.map((p) => p.id)).size !== parts.length)
    throw v.fail(
      400,
      "No repitas un repuesto; sumá su cantidad en una sola fila.",
    );
  return {
    taskId: v.id(b.tarea_id, "Tarea"),
    hours: v.number(b.medicion_horometro, "Horómetro"),
    start,
    end,
    orderId:
      b.orden_mantenimiento_id == null
        ? null
        : v.id(b.orden_mantenimiento_id, "Orden"),
    parts,
    confirmed: b.confirmar_reduccion === true,
    expected: b.horas_esperadas,
  };
}
function createRegistrosService(db) {
  const get = async (rawId, tx = db) => {
    const id = v.id(rawId),
      row = await v.one(
        tx,
        select + " WHERE rt.id=?",
        [id],
        "No se encontró el registro.",
      );
    row.repuestos = await tx.query(
      "SELECT r.repuesto_id,p.nombre AS repuesto_nombre,r.cantidad FROM registro_tareas_repuestos r JOIN repuestos p ON p.id=r.repuesto_id WHERE r.registro_tarea_id=? ORDER BY p.nombre",
      [id],
    );
    return row;
  };
  return {
    list: () =>
      db.query(
        select +
          " ORDER BY COALESCE(rt.duracion_fin,rt.duracion_inicio) DESC,rt.id DESC",
      ),
    get,
    async create(input, user) {
      const data = executionData(input);
      return db.transaction(async (tx) => {
        const task = await v.one(
          tx,
          "SELECT id,maquina_id FROM tareas WHERE id=? FOR UPDATE",
          [data.taskId],
          "No se encontró la tarea.",
        );
        const machine = await v.one(
          tx,
          "SELECT id,horas FROM maquinas WHERE id=? FOR UPDATE",
          [task.maquina_id],
          "No se encontró la máquina de la tarea.",
        );
        if (
          data.hours < machine.horas &&
          !(data.confirmed && data.expected === machine.horas)
        )
          throw v.fail(
            409,
            "La lectura es menor que el horómetro actual. Recargá los datos y confirmá la corrección.",
          );
        if (data.expected !== undefined && data.expected !== machine.horas)
          throw v.fail(
            409,
            "El horómetro cambió. Recargá la tarea antes de guardar.",
          );
        if (data.orderId) {
          const order = await v.one(
            tx,
            "SELECT id,maquina_id FROM ordenes_mantenimiento WHERE id=? FOR UPDATE",
            [data.orderId],
            "No se encontró la orden.",
          );
          if (order.maquina_id !== task.maquina_id)
            throw v.fail(
              409,
              "La orden seleccionada pertenece a otra máquina.",
            );
        }
        // Deterministic locks prevent two executions consuming the same units.
        for (const item of data.parts) {
          const part = await v.one(
            tx,
            "SELECT id,nombre,maquina_id FROM repuestos WHERE id=? FOR UPDATE",
            [item.id],
            "No se encontró uno de los repuestos.",
          );
          if (part.maquina_id !== task.maquina_id)
            throw v.fail(
              409,
              `${part.nombre} no pertenece a la máquina de la tarea.`,
            );
          const stocks = await tx.query(
            "SELECT cantidad_actual FROM inventario WHERE repuesto_id=? FOR UPDATE",
            [item.id],
          );
          if (!stocks.length || stocks[0].cantidad_actual < item.quantity)
            throw v.fail(409, `No hay stock suficiente de ${part.nombre}.`);
        }
        const result = await tx.insert(
          "INSERT INTO registro_tareas (origen,operario_id,tarea_id,medicion_horometro,duracion_inicio,duracion_fin,orden_mantenimiento_id) VALUES ('Mantenimiento',?,?,?,?,?,?)",
          [
            v.id(user.id, "Operario"),
            data.taskId,
            data.hours,
            data.start,
            data.end,
            data.orderId,
          ],
        );
        // The INSERT trigger updates the meter; detail triggers subtract stock exactly once.
        for (const item of data.parts)
          await tx.query(
            "INSERT INTO registro_tareas_repuestos (registro_tarea_id,repuesto_id,cantidad) VALUES (?,?,?)",
            [result.insertId, item.id, item.quantity],
          );
        return get(result.insertId, tx);
      });
    },
  };
}
module.exports = { createRegistrosService, executionData, localDate };
