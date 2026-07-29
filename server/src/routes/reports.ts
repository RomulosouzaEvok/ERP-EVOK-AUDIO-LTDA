const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const reportController = require('../controllers/reportController');

router.get('/sales', authenticate, reportController.sales);
router.get('/inventory', authenticate, reportController.inventory);
router.get('/customers', authenticate, reportController.customers);
router.get('/cash-flow', authenticate, reportController.cashFlow);

module.exports = router;

