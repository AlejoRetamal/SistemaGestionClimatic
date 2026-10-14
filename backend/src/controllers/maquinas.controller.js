function createMaquinasController(service) {
  return {
    list: async (req, res) => res.json(await service.list()),
    get: async (req, res) => res.json(await service.get(req.params.id)),
    create: async (req, res) =>
      res.status(201).json(await service.create(req.body)),
    update: async (req, res) =>
      res.json(await service.update(req.params.id, req.body)),
    deactivate: async (req, res) =>
      res.json(await service.deactivate(req.params.id)),
    meter: async (req, res) =>
      res.json(await service.meter(req.params.id, req.body)),
  };
}
module.exports = { createMaquinasController };
