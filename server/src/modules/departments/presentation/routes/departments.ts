const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const departmentController = require('../controllers/departmentController');

/**
 * Rotas do módulo `departments` (Clean Architecture), montadas sob
 * `/api/departments` em `server/app.ts`. Mantém exatamente o mesmo RBAC do
 * roteador legado (`server/src/routes/departments.ts`).
 */

router.get('/', authenticate, departmentController.list);
router.get('/:id', authenticate, departmentController.getById);
router.post('/', authenticate, authorize('admin'), departmentController.create);
router.put('/:id', authenticate, authorize('admin'), departmentController.update);
router.delete('/:id', authenticate, authorize('admin'), departmentController.remove);

module.exports = router;
