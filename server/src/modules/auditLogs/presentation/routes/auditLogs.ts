const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const auditLogController = require('../controllers/auditLogController');

/**
 * Rotas do módulo `auditLogs` (Clean Architecture), montadas sob
 * `/api/audit-logs` em `server/app.ts`. Mantém exatamente o mesmo RBAC do
 * roteador legado (`server/src/routes/auditLogs.ts`).
 */

router.get('/', authenticate, authorize('admin'), auditLogController.list);
router.get('/:id', authenticate, authorize('admin'), auditLogController.getById);

module.exports = router;
