const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const itemController = require('../controllers/itemController');

/**
 * Rotas do modulo canonico de itens industriais.
 */
router.get('/', authenticate, itemController.list);
router.post('/', authenticate, itemController.create);
router.post('/:id/estrutura', authenticate, itemController.createStructure);
router.get('/:id/estrutura/explode', authenticate, itemController.explode);
router.patch('/:id/inactivate', authenticate, itemController.inactivate);
router.delete('/:id', authenticate, itemController.inactivate);

module.exports = router;
