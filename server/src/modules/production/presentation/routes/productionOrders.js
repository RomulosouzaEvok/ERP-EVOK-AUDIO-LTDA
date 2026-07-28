const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const productionOrderController = require('../controllers/productionOrderController');

/**
 * Rotas do módulo `production` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 7 endpoints legados de
 * `server/src/routes/productionOrders.js` (mesmos paths, métodos,
 * middlewares de `authorize` e formato de resposta), agora montado sob o
 * mesmo prefixo `/api/production-orders` em `server/index.js`.
 *
 * IMPORTANTE: a rota `GET /report` deve permanecer registrada ANTES de
 * `GET /:id`, para que Express não interprete `report` como um `:id`.
 */

router.get('/', authenticate, productionOrderController.list);
router.get('/report', authenticate, productionOrderController.getProductionReport);
router.get('/:id', authenticate, productionOrderController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), productionOrderController.create);
router.put('/:id', authenticate, productionOrderController.update);
router.put('/:id/status', authenticate, productionOrderController.updateStatus);
router.delete('/:id', authenticate, authorize('admin'), productionOrderController.remove);

module.exports = router;
