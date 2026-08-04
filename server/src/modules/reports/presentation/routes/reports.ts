const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const reportController = require('../controllers/reportController');

/**
 * Rotas do módulo `reports` (Clean Architecture). Mantém o mesmo contrato
 * dos endpoints anteriores de `server/src/routes/reports.ts` (mesmos
 * paths, métodos e formato de resposta padrão `json`), e adiciona o
 * parâmetro aditivo `?format=csv|pdf` em cada um.
 *
 * RETROFIT `authorizeModule` (docs/governance/TODO.md, Bloco 1.2 retrofit
 * geral — substitui a ausência de checagem por área conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8/§6.2): cada relatório mapeia para a
 * sub-permissão correspondente na matriz — `sales`/`inventory`/
 * `customers`/`cash-flow` → `relatorios.financeiro`; `production` →
 * `relatorios.producao`; `purchasing` → `relatorios.compras`;
 * `cost-variance` → `relatorios.custos`. Relatórios que cruzam
 * departamentos exigem a sub-permissão específica (§6.2), não são
 * liberados por interseção automática.
 */

router.get('/sales', authenticate, authorizeModule('relatorios.financeiro'), reportController.sales);
router.get('/inventory', authenticate, authorizeModule('relatorios.financeiro'), reportController.inventory);
router.get('/customers', authenticate, authorizeModule('relatorios.financeiro'), reportController.customers);
router.get('/cash-flow', authenticate, authorizeModule('relatorios.financeiro'), reportController.cashFlow);
router.get('/production', authenticate, authorizeModule('relatorios.producao'), reportController.production);
router.get('/purchasing', authenticate, authorizeModule('relatorios.compras'), reportController.purchasing);
router.get('/cost-variance', authenticate, authorizeModule('relatorios.custos'), reportController.costVariance);

module.exports = router;
