const v = require("./validation");
function createPlanesService(db, tipo, marginPercent = 10) {
  const tables = {
    Preventivo: "plan_preventivo",
    Predictivo: "plan_predictivo",
  };
  if (!Object.hasOwn(tables, tipo)) throw Error("Invalid plan type");
  const table = tables[tipo]; // Internal allowlist, never a request value.
  const select = `SELECT p.plan_id AS id,p.tipo,p.tarea_id,p.tarea_nombre,p.maquina_nombre,p.frecuencia,p.ultimo_horometro,p.ultima_fecha_ejecucion,p.proximo_servicio,m.horas AS horometro_actual,
    p.proximo_servicio-m.horas AS horas_restantes,p.frecuencia*? AS margen_horas,
    CASE WHEN p.proximo_servicio-m.horas<=0 THEN 'VENCIDO' WHEN p.proximo_servicio-m.horas<=p.frecuencia*? THEN 'PRÓXIMO' ELSE 'OK' END AS estado
    FROM proximos_servicios p JOIN maquinas m ON m.id=p.maquina_id WHERE p.tipo=?`;
  const params = [marginPercent / 100, marginPercent / 100, tipo];
  const get = (rawId, tx = db) =>
    v.one(
      tx,
      select + " AND p.plan_id=?",
      [...params, v.id(rawId)],
      "No se encontró el plan.",
    );
  function data(input) {
    const b = v.body(input, ["tarea_id", "frecuencia"]);
    return [
      v.id(b.tarea_id, "Tarea"),
      v.number(b.frecuencia, "Frecuencia en horas", { positive: true }),
    ];
  }
  return {
    list: () =>
      db.query(select + " ORDER BY p.maquina_nombre,p.tarea_nombre", params),
    get,
    async create(input) {
      const result = await db.insert(
        `INSERT INTO ${table} (tarea_id,frecuencia) VALUES (?,?)`,
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
          `SELECT id FROM ${table} WHERE id=? FOR UPDATE`,
          [id],
          "No se encontró el plan.",
        );
        await tx.query(
          `UPDATE ${table} SET tarea_id=?,frecuencia=? WHERE id=?`,
          [...values, id],
        );
        return get(id, tx);
      });
    },
    async remove(rawId) {
      const result = await db.query(`DELETE FROM ${table} WHERE id=?`, [
        v.id(rawId),
      ]);
      if (!result.affectedRows) throw v.fail(404, "No se encontró el plan.");
    },
  };
}
module.exports = { createPlanesService };
