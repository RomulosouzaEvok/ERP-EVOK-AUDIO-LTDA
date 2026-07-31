const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const itemController = require('../controllers/itemController');

/**
 * Rotas do modulo canonico de itens industriais.
 */
router.get('/', authenticate, itemController.list);
router.post('/', authenticate, authorize('admin', 'operator'), itemController.create);
router.post('/:id/estrutura', authenticate, authorize('admin', 'operator'), itemController.createStructure);
router.get('/:id/estrutura/explode', authenticate, itemController.explode);
router.patch('/:id/inactivate', authenticate, authorize('admin', 'operator'), itemController.inactivate);
router.delete('/:id', authenticate, authorize('admin', 'operator'), itemController.inactivate);

module.exports = router;
