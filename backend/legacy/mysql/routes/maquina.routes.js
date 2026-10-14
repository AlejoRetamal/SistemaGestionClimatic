const express = require('express');
const router = express.Router();
const maquinaController = require('../controllers/maquina.controller');

router.get('/', maquinaController.getAll);
router.get('/:id', maquinaController.getById);
router.post('/', maquinaController.create);
router.put('/:id', maquinaController.update);
router.delete('/:id', maquinaController.delete);
router.put('/:id/horas', maquinaController.updateHoras);

module.exports = router;