/**
 * Rotas do modulo de rastreabilidade industrial.
 *
 * RETROFIT `authorizeModule('rastreabilidade')` (docs/governance/TODO.md,
 * Bloco 1.2 retrofit geral — módulo de leitura, concedido explicitamente
 * aos perfis que precisam rastrear ponta a ponta, ver
 * `docs/business/BUSINESS_RULES.md` §6.3): todas as rotas exigem `view`
 * implicito (qualquer nivel presente).
 *
 * @module modules/traceability/presentation/routes/traceability
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const traceabilityController = require('../controllers/traceabilityController');

/**
 * Rotas publicas de consulta de rastreabilidade (autenticacao + autorizacao
 * de modulo obrigatorias).
 */
router.get('/items/:id', authenticate, authorizeModule('rastreabilidade'), traceabilityController.getItemTraceability);
router.get('/lots/:id', authenticate, authorizeModule('rastreabilidade'), traceabilityController.getLotTraceability);
router.get('/production-orders/:id', authenticate, authorizeModule('rastreabilidade'), traceabilityController.getProductionOrderTraceability);

module.exports = router;

