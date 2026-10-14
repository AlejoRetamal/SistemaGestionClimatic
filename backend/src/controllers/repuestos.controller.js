function createRepuestosController(service) {
  return {
    list: async (req, res) =>
      res.json(await service.list(req.query.maquina_id)),
    get: async (req, res) => res.json(await service.get(req.params.id)),
    create: async (req, res) =>
      res.status(201).json(await service.create(req.body)),
    update: async (req, res) =>
      res.json(await service.update(req.params.id, req.body)),
    remove: async (req, res) => {
      await service.remove(req.params.id);
      res.status(204).end();
    },
    providers: async (req, res) => res.json(await service.providers()),
    stock: async (req, res) =>
      res.json(await service.stock(req.params.id, req.body)),
    minimum: async (req, res) =>
      res.json(await service.stock(req.params.id, req.body, true)),
  };
}
module.exports = { createRepuestosController };
