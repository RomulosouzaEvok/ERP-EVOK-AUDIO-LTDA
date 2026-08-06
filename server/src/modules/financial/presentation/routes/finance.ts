const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const financialController = require('../controllers/financialController');
const costCenterController = require('../controllers/costCenterController');
const reconciliationRouter = require('./reconciliation');

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
router.put('/receivable/:id/cost-center', authenticate, authorizeModule('financeiro', 'operate'), financialController.updateReceivableCostCenter);

// Contas a Pagar
router.get('/payable', authenticate, authorizeModule('financeiro'), financialController.listPayable);
router.post('/payable', authenticate, authorizeModule('financeiro', 'operate'), financialController.createPayable);
router.put('/payable/:id/pay', authenticate, authorizeModule('financeiro', 'operate'), financialController.payPayable);
router.put('/payable/:id/cost-center', authenticate, authorizeModule('financeiro', 'operate'), financialController.updatePayableCostCenter);

// Fluxo de Caixa
router.get('/cash-flow', authenticate, authorizeModule('financeiro'), financialController.cashFlow);
router.get('/cash-flow-projection', authenticate, authorizeModule('financeiro', 'operate'), financialController.cashFlowProjection);
// Projeção diária (série dia a dia, horizonte 30/60/90) — gap "fluxo
// projetado" de docs/LEVANTAMENTO_ERP_2026-08-02.md.
router.get('/cashflow/projection', authenticate, authorizeModule('financeiro'), financialController.dailyCashFlowProjection);

// Centros de Custo — gap "centros de custo" de docs/LEVANTAMENTO_ERP_2026-08-02.md.
// Rotas estáticas (`/report`) montadas ANTES de `/:id` para evitar conflito
// de roteamento do Express (mesmo cuidado de outros módulos com sub-rotas
// estáticas e `:id` no mesmo prefixo).
router.get('/cost-centers', authenticate, authorizeModule('financeiro'), costCenterController.list);
router.get('/cost-centers/report', authenticate, authorizeModule('financeiro'), costCenterController.report);
router.post('/cost-centers', authenticate, authorizeModule('financeiro', 'operate'), costCenterController.create);
router.put('/cost-centers/:id', authenticate, authorizeModule('financeiro', 'operate'), costCenterController.update);

// Conciliação Bancária v1 (importação OFX) — gap "conciliação
// bancária/CNAB" de docs/governance/TODO.md (CNAB fica fora desta v1).
// Sub-router com RBAC próprio em cada rota (ver `./reconciliation.ts`),
// resultando em `/api/finance/reconciliation/...`.
router.use('/reconciliation', reconciliationRouter);

module.exports = router;


