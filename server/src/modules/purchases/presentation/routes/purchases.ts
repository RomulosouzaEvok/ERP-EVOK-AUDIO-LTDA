const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const purchaseController = require('../controllers/purchaseController');

/**
 * Rotas do módulo `purchases` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 6 endpoints anteriors de `server/src/routes/purchases.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/purchases` em `server/index.ts`.
 */

router.get('/', authenticate, purchaseController.list);
router.get('/:id', authenticate, purchaseController.getById);
router.post('/', authenticate, purchaseController.create);
router.put('/:id', authenticate, purchaseController.update);
router.put('/:id/status', authenticate, purchaseController.updateStatus);
router.post('/:id/receive', authenticate, purchaseController.receiveItems);

module.exports = router;


