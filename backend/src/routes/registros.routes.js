const { Router } = require("express");
const { registrosController } = require("../controllers/registros.controller");
function registrosRoutes(service) {
  const r = Router(),
    c = registrosController(service);
  r.get("/", c.list);
  r.get("/:id", c.get);
  r.post("/", c.create);
  return r;
}
module.exports = { registrosRoutes };
