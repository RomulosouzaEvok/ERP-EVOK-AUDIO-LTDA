const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const purchaseController = require('../controllers/purchaseController');

/**
 * Rotas do módulo `purchases` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 6 endpoints anteriors de `server/src/routes/purchases.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/purchases` em `server/index.ts`.
 */

router.get('/', authenticate, purchaseController.list);
router.get('/:id', authenticate, purchaseController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), purchaseController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), purchaseController.update);
router.put('/:id/status', authenticate, authorize('admin', 'operator'), purchaseController.updateStatus);
router.post('/:id/receive', authenticate, authorize('admin', 'operator'), purchaseController.receiveItems);

module.exports = router;


