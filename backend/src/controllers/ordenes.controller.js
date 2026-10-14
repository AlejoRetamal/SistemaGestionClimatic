function ordenesController(service) {
  return {
    list: async (req, res) => res.json(await service.list()),
    get: async (req, res) => res.json(await service.get(req.params.id)),
    create: async (req, res) =>
      res.status(201).json(await service.create(req.body, req.user)),
    update: async (req, res) =>
      res.json(await service.update(req.params.id, req.body)),
    close: async (req, res) => res.json(await service.close(req.params.id)),
  };
}
module.exports = { ordenesController };
