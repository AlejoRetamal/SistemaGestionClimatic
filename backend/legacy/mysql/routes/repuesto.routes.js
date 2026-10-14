const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuesto.controller');

router.get('/', repuestoController.getAll);
router.get('/:id', repuestoController.getById);
router.post('/', repuestoController.create);
router.put('/:id', repuestoController.update);
router.delete('/:id', repuestoController.delete);

module.exports = router;