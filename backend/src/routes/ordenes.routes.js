const { Router } = require("express");
const { ordenesController } = require("../controllers/ordenes.controller");
function ordenesRoutes(service) {
  const r = Router(),
    c = ordenesController(service);
  r.get("/", c.list);
  r.get("/:id", c.get);
  r.post("/", c.create);
  r.put("/:id", c.update);
  r.patch("/:id/cerrar", c.close);
  return r;
}
module.exports = { ordenesRoutes };
