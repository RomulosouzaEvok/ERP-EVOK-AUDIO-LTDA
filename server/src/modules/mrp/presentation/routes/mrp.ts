const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const mrpController = require('../controllers/mrpController');

/**
 * Rotas do modulo MRP.
 */
router.post('/plan', authenticate, mrpController.generatePlan);
router.get('/planned-orders', authenticate, mrpController.listPlannedOrders);

module.exports = router;
