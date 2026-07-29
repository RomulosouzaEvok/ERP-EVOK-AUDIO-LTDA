const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const financeController = require('../controllers/financeController');

router.get('/receivable', authenticate, financeController.listReceivable);
router.put('/receivable/:id/pay', authenticate, financeController.payReceivable);
router.get('/payable', authenticate, financeController.listPayable);
router.post('/payable', authenticate, authorize('admin', 'financial'), financeController.createPayable);
router.put('/payable/:id/pay', authenticate, financeController.payPayable);
router.get('/cash-flow', authenticate, financeController.cashFlow);

module.exports = router;

