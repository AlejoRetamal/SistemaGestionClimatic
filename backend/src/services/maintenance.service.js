const { createMaquinasService } = require("./maquinas.service");
const { createRepuestosService } = require("./repuestos.service");
const { createTareasService } = require("./tareas.service");
const { createExtraordinariasService } = require("./extraordinarias.service");
const { createPlanesService } = require("./planes.service");
const { createOrdenesService } = require("./ordenes.service");
const { createRegistrosService } = require("./registros.service");
function createMaintenanceService(db, config = {}) {
  return {
    maquinas: createMaquinasService(db),
    repuestos: createRepuestosService(db),
    tareas: createTareasService(db),
    extraordinarias: createExtraordinariasService(db),
    preventivos: createPlanesService(
      db,
      "Preventivo",
      config.serviceMarginPercent ?? 10,
    ),
    predictivos: createPlanesService(
      db,
      "Predictivo",
      config.serviceMarginPercent ?? 10,
    ),
    ordenes: createOrdenesService(db),
    registros: createRegistrosService(db),
  };
}
module.exports = { createMaintenanceService };
