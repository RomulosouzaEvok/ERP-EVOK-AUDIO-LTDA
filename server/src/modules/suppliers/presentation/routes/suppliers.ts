const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const supplierController = require('../controllers/supplierController');

/**
 * Rotas do módulo `suppliers` (Clean Architecture), montadas sob `/api/suppliers`
 * em `server/index.ts`. Escrita protegida por `authorize` seguindo o mesmo
 * padrão de RBAC aplicado a inventory/purchases/products.
 */

router.get('/', authenticate, supplierController.list);
router.get('/:id', authenticate, supplierController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), supplierController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), supplierController.update);
router.delete('/:id', authenticate, authorize('admin'), supplierController.remove);

module.exports = router;


