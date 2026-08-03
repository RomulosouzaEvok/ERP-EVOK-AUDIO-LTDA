const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const financialController = require('../controllers/financialController');

/**
 * Rotas do módulo `financial` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 6 endpoints anteriors de `server/src/routes/finance.ts`
 * (mesmos paths, métodos, middlewares e formato de resposta), agora montado
 * sob o mesmo prefixo `/api/finance` em `server/index.ts`.
 */

// Contas a Receber
router.get('/receivable', authenticate, financialController.listReceivable);
router.put('/receivable/:id/pay', authenticate, authorize('admin', 'financial'), financialController.receivePayment);

// Contas a Pagar
router.get('/payable', authenticate, financialController.listPayable);
router.post('/payable', authenticate, authorize('admin', 'financial'), financialController.createPayable);
router.put('/payable/:id/pay', authenticate, authorize('admin', 'financial'), financialController.payPayable);

// Fluxo de Caixa
router.get('/cash-flow', authenticate, financialController.cashFlow);
router.get('/cash-flow-projection', authenticate, authorize('admin', 'financial'), financialController.cashFlowProjection);

module.exports = router;


