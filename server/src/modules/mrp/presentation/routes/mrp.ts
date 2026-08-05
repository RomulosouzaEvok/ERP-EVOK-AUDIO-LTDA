const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const mrpController = require('../controllers/mrpController');

/**
 * Rotas do modulo MRP.
 *
 * RETROFIT `authorizeModule('mrp')` (docs/governance/TODO.md, Bloco 1.2
 * retrofit geral — substitui `authorize(role)` legado conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito,
 * escritas exigem `operate`.
 */
router.post('/plan', authenticate, authorizeModule('mrp', 'operate'), mrpController.generatePlan);
router.get('/planned-orders', authenticate, authorizeModule('mrp'), mrpController.listPlannedOrders);
router.post('/planned-orders/convert', authenticate, authorizeModule('mrp', 'operate'), mrpController.convertPlannedOrders);
router.post('/planned-orders/convert-to-production', authenticate, authorizeModule('mrp', 'operate'), mrpController.convertPlannedOrdersToProduction);

module.exports = router;
