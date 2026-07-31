const { Router } = require('express');
const router = Router();
const { authenticate } = require('../../../../middlewares/auth');
const reportController = require('../controllers/reportController');

/**
 * Rotas do módulo `reports` (Clean Architecture). Mantém o mesmo contrato
 * dos 4 endpoints anteriores de `server/src/routes/reports.ts` (mesmos
 * paths, métodos, RBAC e formato de resposta padrão `json`), e adiciona o
 * parâmetro aditivo `?format=csv|pdf` em cada um.
 */

router.get('/sales', authenticate, reportController.sales);
router.get('/inventory', authenticate, reportController.inventory);
router.get('/customers', authenticate, reportController.customers);
router.get('/cash-flow', authenticate, reportController.cashFlow);

module.exports = router;
