const fail = (status, message) => Object.assign(new Error(message), { status });
function body(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw fail(400, "La solicitud contiene campos inválidos.");
  return value;
}
function id(value, label = "Identificador") {
  if (
    !["string", "number"].includes(typeof value) ||
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 4294967295
  )
    throw fail(400, `${label} inválido.`);
  return Number(value);
}
function text(value, label, max = 150, required = false) {
  if (value == null || value === "") {
    if (required) throw fail(400, `${label} es obligatorio.`);
    return null;
  }
  if (typeof value !== "string" || value.trim().length > max)
    throw fail(400, `${label} debe tener hasta ${max} caracteres.`);
  const result = value.trim();
  if (!result && required) throw fail(400, `${label} es obligatorio.`);
  return result || null;
}
function number(
  value,
  label,
  { optional = false, positive = false, max = 9999999999.99 } = {},
) {
  if (optional && (value == null || value === "")) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    (positive && value <= 0) ||
    !/^\d+(\.\d{1,2})?$/.test(String(value))
  ) {
    throw fail(
      400,
      `${label} debe ser un número ${positive ? "mayor que cero" : "no negativo"}, con hasta dos decimales y máximo ${max}.`,
    );
  }
  return value;
}
function option(value, choices, label, optional = false) {
  if (optional && (value == null || value === "")) return null;
  if (!choices.includes(value)) throw fail(400, `${label} inválido.`);
  return value;
}
async function one(db, sql, params, message) {
  const rows = await db.query(sql, params);
  if (!rows.length) throw fail(404, message);
  return rows[0];
}
module.exports = { fail, body, id, text, number, option, one };
