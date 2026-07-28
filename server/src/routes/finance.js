const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const financeController = require('../controllers/financeController');

// Contas a Receber
router.get('/receivable', authenticate, financeController.listReceivable);
router.put('/receivable/:id/pay', authenticate, financeController.receivePayment);

// Contas a Pagar
router.get('/payable', authenticate, financeController.listPayable);
router.post('/payable', authenticate, authorize('admin', 'financial'), financeController.createPayable);
router.put('/payable/:id/pay', authenticate, financeController.payPayable);

// Fluxo de Caixa
router.get('/cash-flow', authenticate, financeController.cashFlow);

module.exports = router;

