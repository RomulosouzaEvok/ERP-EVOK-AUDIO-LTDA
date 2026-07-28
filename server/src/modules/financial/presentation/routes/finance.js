const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const financialController = require('../controllers/financialController');

/**
 * Rotas do módulo `financial` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 6 endpoints legados de `server/src/routes/finance.js`
 * (mesmos paths, métodos, middlewares e formato de resposta), agora montado
 * sob o mesmo prefixo `/api/finance` em `server/index.js`.
 */

// Contas a Receber
router.get('/receivable', authenticate, financialController.listReceivable);
router.put('/receivable/:id/pay', authenticate, financialController.receivePayment);

// Contas a Pagar
router.get('/payable', authenticate, financialController.listPayable);
router.post('/payable', authenticate, authorize('admin', 'financial'), financialController.createPayable);
router.put('/payable/:id/pay', authenticate, financialController.payPayable);

// Fluxo de Caixa
router.get('/cash-flow', authenticate, financialController.cashFlow);

module.exports = router;
