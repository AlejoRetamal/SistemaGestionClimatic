function registrosController(service) {
  return {
    list: async (req, res) => res.json(await service.list()),
    get: async (req, res) => res.json(await service.get(req.params.id)),
    create: async (req, res) =>
      res.status(201).json(await service.create(req.body, req.user)),
  };
}
module.exports = { registrosController };
