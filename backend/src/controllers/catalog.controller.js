function catalogController(service) {
  return {
    list: async (req, res) => res.json(await service.list()),
    get: async (req, res) => res.json(await service.get(req.params.id)),
    create: async (req, res) =>
      res.status(201).json(await service.create(req.body)),
    update: async (req, res) =>
      res.json(await service.update(req.params.id, req.body)),
    remove: async (req, res) => {
      await service.remove(req.params.id);
      res.status(204).end();
    },
  };
}
module.exports = { catalogController };
