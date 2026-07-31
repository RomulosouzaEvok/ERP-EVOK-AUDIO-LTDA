const { Router } = require('express');
const router = Router();
const { authenticate } = require('../../../../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * Rotas do módulo `dashboard` (Clean Architecture), montadas sob
 * `/api/dashboard` em `server/app.ts`. Mantém exatamente o mesmo RBAC do
 * roteador legado (`server/src/routes/dashboard.ts`).
 */

router.get('/', authenticate, dashboardController.index);

module.exports = router;
