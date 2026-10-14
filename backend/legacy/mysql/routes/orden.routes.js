const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/orden.controller');

router.get('/', ordenController.getAll);
router.get('/activas', ordenController.getActivas);
router.get('/:id', ordenController.getById);
router.post('/', ordenController.create);
router.put('/:id', ordenController.update);
router.put('/:id/cerrar', ordenController.cerrar);
router.delete('/:id', ordenController.delete);

module.exports = router;