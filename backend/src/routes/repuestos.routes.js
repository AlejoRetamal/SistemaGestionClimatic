const { Router } = require("express");
const {
  createRepuestosController,
} = require("../controllers/repuestos.controller");
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
function repuestosRoutes(service, auth) {
  const router = Router();
  const c = createRepuestosController(service);
  router.use(
    ["/repuestos", "/inventario", "/proveedores"],
    authenticate(auth),
    authorize("mantenimiento"),
  );
  router.get("/repuestos", c.list);
  router.get("/repuestos/:id", c.get);
  router.post("/repuestos", c.create);
  router.put("/repuestos/:id", c.update);
  router.delete("/repuestos/:id", c.remove);
  router.get("/proveedores", c.providers);
  router.get("/inventario", c.list);
  router.patch("/inventario/:id/agregar-stock", c.stock);
  router.patch("/inventario/:id/minimo", c.minimum);
  return router;
}
module.exports = { repuestosRoutes };
