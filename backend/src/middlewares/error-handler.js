function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.too.large")
    return res.status(413).json({
      error:
        "El formulario es demasiado grande. Reducí la longitud de los textos.",
    });
  if (["ER_SIGNAL_EXCEPTION", "P0001"].includes(error.code))
    return res.status(409).json({
      error:
        "No se pudo guardar el consumo. Verificá la compatibilidad de los repuestos y el stock disponible.",
    });
  if (["ER_ROW_IS_REFERENCED_2", "23001"].includes(error.code))
    return res.status(409).json({
      error:
        "No se puede eliminar porque tiene registros o relaciones asociadas.",
    });
  if (["ER_NO_REFERENCED_ROW_2", "23503"].includes(error.code))
    return res.status(409).json({
      error:
        "La máquina, tarea o proveedor seleccionado ya no existe. Recargá la información.",
    });
  if (["ER_DUP_ENTRY", "23505"].includes(error.code))
    return res
      .status(409)
      .json({ error: "Ya existe un registro con esa asociación." });
  if (
    [
      "ER_CHECK_CONSTRAINT_VIOLATED",
      "23514",
      "23502",
      "22001",
      "22003",
      "22P02",
      "22007",
      "22008",
      "ER_DATA_TOO_LONG",
      "WARN_DATA_OUT_OF_RANGE",
      "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD",
    ].includes(error.code)
  )
    return res.status(400).json({
      error:
        "Los datos exceden los límites permitidos o tienen un formato inválido.",
    });
  if (
    [
      "ER_LOCK_DEADLOCK",
      "ER_LOCK_WAIT_TIMEOUT",
      "40P01",
      "55P03",
      "40001",
    ].includes(error.code)
  )
    return res.status(409).json({
      error:
        "Otro usuario modificó estos datos al mismo tiempo. Intentá nuevamente.",
    });
  const status =
    error.type === "entity.parse.failed" ? 400 : error.status || 500;
  const message =
    error.type === "entity.parse.failed"
      ? "El cuerpo JSON no es válido."
      : status >= 500 && status !== 503
        ? "No se pudo completar la operación."
        : error.message;
  res.status(status).json({ error: message });
}
module.exports = { errorHandler };
