const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const inventoryController = require('../controllers/inventoryController');

/**
 * Rotas do módulo `inventory` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 4 endpoints legados de `server/src/routes/inventory.js`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/inventory` em `server/index.js`, e acrescenta o novo
 * endpoint aditivo `GET /low-stock`.
 */

router.get('/movements', authenticate, inventoryController.list);
router.get('/movements/:id', authenticate, inventoryController.getById);
router.post('/movements', authenticate, inventoryController.create);
router.get('/stock-report', authenticate, inventoryController.getStockReport);
router.get('/low-stock', authenticate, inventoryController.listLowStock);

module.exports = router;
