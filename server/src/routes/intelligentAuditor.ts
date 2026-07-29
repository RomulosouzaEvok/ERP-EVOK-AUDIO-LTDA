const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const intelligentAuditorController = require('../controllers/intelligentAuditorController');

router.get('/stock', authenticate, authorize('admin'), intelligentAuditorController.auditStock);
router.get('/sales', authenticate, authorize('admin'), intelligentAuditorController.auditSales);
router.get('/purchases', authenticate, authorize('admin'), intelligentAuditorController.auditPurchases);
router.get('/financial', authenticate, authorize('admin'), intelligentAuditorController.auditFinancial);

module.exports = router;

