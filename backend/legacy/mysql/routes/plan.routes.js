const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');

router.get('/', planController.getAll);
router.get('/:id', planController.getById);
router.get('/tipo/:tipo', planController.getByTipo);
router.post('/', planController.create);
router.put('/:id', planController.update);
router.delete('/:id', planController.delete);

module.exports = router;