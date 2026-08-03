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

router.get('/:id/suppliers', authenticate, itemController.listSuppliers);
router.post('/:id/suppliers', authenticate, authorize('admin', 'operator'), itemController.createSupplier);
router.put('/:id/suppliers/:linkId', authenticate, authorize('admin', 'operator'), itemController.updateSupplier);
router.delete('/:id/suppliers/:linkId', authenticate, authorize('admin', 'operator'), itemController.removeSupplier);
router.get('/:id/purchase-history', authenticate, itemController.getPurchaseHistory);

module.exports = router;
