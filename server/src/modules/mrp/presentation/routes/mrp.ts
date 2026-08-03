const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const mrpController = require('../controllers/mrpController');

/**
 * Rotas do modulo MRP.
 */
router.post('/plan', authenticate, authorize('admin', 'operator'), mrpController.generatePlan);
router.get('/planned-orders', authenticate, mrpController.listPlannedOrders);
router.post('/planned-orders/convert', authenticate, authorize('admin', 'operator'), mrpController.convertPlannedOrders);

module.exports = router;
