const MODULES_BY_ROLE = Object.freeze({
  Direccion: Object.freeze([
    "administracion",
    "produccion",
    "mantenimiento",
    "comercial",
  ]),
  Administracion: Object.freeze(["administracion"]),
  Mantenimiento: Object.freeze(["mantenimiento"]),
  Produccion: Object.freeze(["mantenimiento"]),
});
function allowedModules(role) {
  return Object.hasOwn(MODULES_BY_ROLE, role) ? MODULES_BY_ROLE[role] : [];
}
module.exports = { MODULES_BY_ROLE, allowedModules };
