const { Router } = require("express");
const { catalogController } = require("../controllers/catalog.controller");
function catalogRoutes(service) {
  const router = Router();
  const c = catalogController(service);
  router.get("/", c.list);
  router.get("/:id", c.get);
  router.post("/", c.create);
  router.put("/:id", c.update);
  router.delete("/:id", c.remove);
  return router;
}
module.exports = { catalogRoutes };
