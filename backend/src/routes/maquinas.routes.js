const { Router } = require("express");
const {
  createMaquinasController,
} = require("../controllers/maquinas.controller");
function maquinasRoutes(service) {
  const router = Router();
  const controller = createMaquinasController(service);
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.patch("/:id/baja", controller.deactivate);
  router.patch("/:id/horometro", controller.meter);
  return router;
}
module.exports = { maquinasRoutes };
