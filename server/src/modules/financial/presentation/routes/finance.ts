const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const financialController = require('../controllers/financialController');

/**
 * Rotas do módulo `financial` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos endpoints anteriores de `server/src/routes/finance.ts`
 * (mesmos paths, métodos, middlewares e formato de resposta), agora montado
 * sob o mesmo prefixo `/api/finance` em `server/index.ts`.
 *
 * RETROFIT `authorizeModule('financeiro')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas (pagamentos, criação de contas a pagar, projeção de
 * fluxo de caixa) exigem `operate` — na matriz de negócio (§1), o único
 * nível concedido ao perfil Financeiro em `financeiro` é `A` (aprovar),
 * então `authorizeModule('financeiro','operate')` já reflete o
 * comportamento equivalente ao antigo `authorize('admin','financial')`.
 */

// Contas a Receber
router.get('/receivable', authenticate, authorizeModule('financeiro'), financialController.listReceivable);
router.put('/receivable/:id/pay', authenticate, authorizeModule('financeiro', 'operate'), financialController.receivePayment);

// Contas a Pagar
router.get('/payable', authenticate, authorizeModule('financeiro'), financialController.listPayable);
router.post('/payable', authenticate, authorizeModule('financeiro', 'operate'), financialController.createPayable);
router.put('/payable/:id/pay', authenticate, authorizeModule('financeiro', 'operate'), financialController.payPayable);

// Fluxo de Caixa
router.get('/cash-flow', authenticate, authorizeModule('financeiro'), financialController.cashFlow);
router.get('/cash-flow-projection', authenticate, authorizeModule('financeiro', 'operate'), financialController.cashFlowProjection);

module.exports = router;


