const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const inventoryController = require('../controllers/inventoryController');

/**
 * Rotas do módulo `inventory` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 4 endpoints anteriors de `server/src/routes/inventory.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/inventory` em `server/index.ts`, e acrescenta o novo
 * endpoint aditivo `GET /low-stock`.
 */

router.get('/movements', authenticate, inventoryController.list);
router.get('/movements/:id', authenticate, inventoryController.getById);
router.post('/movements', authenticate, authorize('admin', 'operator'), inventoryController.create);
router.get('/stock-report', authenticate, inventoryController.getStockReport);
router.get('/low-stock', authenticate, inventoryController.listLowStock);
router.get('/lots', authenticate, inventoryController.listLots);
router.post('/lots/:id/release', authenticate, authorize('admin', 'operator'), inventoryController.releaseLot);
router.post('/lots/:id/block', authenticate, authorize('admin', 'operator'), inventoryController.blockLot);

module.exports = router;


